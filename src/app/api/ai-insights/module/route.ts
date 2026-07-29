import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

// Cuotas mensuales de análisis inline por plan
const PLAN_QUOTAS: Record<string, number> = {
  trial: 0,
  basic: 5,
  standard: 20,
  pro: 999,
}

const MODULE_LABELS: Record<string, string> = {
  sales:       'Ventas',
  purchases:   'Compras',
  receivables: 'Cuentas por Cobrar (CxC)',
  payables:    'Cuentas por Pagar (CxP)',
  inventory:   'Inventario',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      module: string
      moduleData: Record<string, unknown>
    }

    const { module, moduleData } = body

    if (!module || !moduleData) {
      return NextResponse.json({ error: 'Parámetros incompletos' }, { status: 400 })
    }

    const validModules = ['sales', 'purchases', 'receivables', 'payables', 'inventory']
    if (!validModules.includes(module)) {
      return NextResponse.json({ error: 'Módulo inválido' }, { status: 400 })
    }

    const supabase = await createClient()

    // ── 1. Auth ───────────────────────────────────────────────────────────────
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users')
      .select('role, company_id, is_pulse_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'Sin empresa asociada' }, { status: 403 })
    }

    const allowedRoles = ['admin', 'manager']
    if (!userData.is_pulse_admin && !allowedRoles.includes(userData.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    // ── 2. Verificar cuota mensual ────────────────────────────────────────────
    const { data: company } = await supabase
      .from('companies')
      .select('plan, ai_monthly_used, ai_monthly_reset')
      .eq('id', userData.company_id)
      .single()

    if (!company) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })

    // Reset mensual
    const today = new Date().toISOString().slice(0, 10)
    const resetDate = company.ai_monthly_reset ?? today
    const needsReset = today.slice(0, 7) !== resetDate.slice(0, 7)

    let currentUsed = needsReset ? 0 : (company.ai_monthly_used ?? 0)

    if (needsReset) {
      await supabase
        .from('companies')
        .update({ ai_monthly_used: 0, ai_monthly_reset: today })
        .eq('id', userData.company_id)
    }

    const quota = userData.is_pulse_admin ? 999 : (PLAN_QUOTAS[company.plan] ?? 0)

    if (currentUsed >= quota) {
      return NextResponse.json(
        {
          error: `Has alcanzado el límite de ${quota} análisis de IA este mes (plan ${company.plan}). Actualiza tu plan para continuar.`,
          quota,
          used: currentUsed,
        },
        { status: 429 }
      )
    }

    // ── 3. Obtener snapshot global compacto ───────────────────────────────────
    const now = new Date()
    const year = now.getFullYear()
    const weekNumber = getISOWeek(now)

    const [snapResult, bankResult] = await Promise.all([
      supabase
        .from('weekly_snapshots')
        .select('total_sales, gross_margin_pct, net_margin_pct, cash_days, overdue_receivables')
        .eq('company_id', userData.company_id)
        .eq('year', year)
        .eq('week_number', weekNumber)
        .maybeSingle(),
      supabase
        .from('bank_accounts')
        .select('current_balance')
        .eq('company_id', userData.company_id)
        .is('deleted_at', null),
    ])

    const snap = snapResult.data
    const totalCash = (bankResult.data ?? []).reduce((s, b) => s + (b.current_balance ?? 0), 0)

    const globalContext = `
CONTEXTO GLOBAL DEL NEGOCIO (semana ${weekNumber}/${year}):
- Ventas semana: $${(snap?.total_sales ?? 0).toFixed(2)}
- Margen bruto: ${(snap?.gross_margin_pct ?? 0).toFixed(1)}% | Margen neto: ${(snap?.net_margin_pct ?? 0).toFixed(1)}%
- Saldo en caja: $${totalCash.toFixed(2)} (${snap?.cash_days ?? 0} días de cobertura)
- CxC vencida: $${(snap?.overdue_receivables ?? 0).toFixed(2)}
`.trim()

    // ── 4. Construir prompt por módulo ────────────────────────────────────────
    const moduleLabel = MODULE_LABELS[module] ?? module
    const moduleJson = JSON.stringify(moduleData, null, 2)

    const prompt = `Eres el asesor financiero de Lumio, plataforma BI para PyMEs latinoamericanas. \
El dueño del negocio quiere un análisis específico del módulo de ${moduleLabel}.

${globalContext}

DATOS DEL MÓDULO — ${moduleLabel.toUpperCase()}:
${moduleJson}

TAREA: Analiza los datos del módulo de ${moduleLabel} tomando en cuenta el contexto global del negocio. \
Sé directo, específico con los números, y accionable. Tono: consultor senior hablando directamente al dueño.

Responde ÚNICAMENTE con JSON válido, sin markdown:

{
  "summary": "2-3 oraciones. Estado actual del módulo con los números más relevantes y su impacto en el negocio.",
  "details": "Análisis detallado de 3-4 párrafos: qué está bien, qué preocupa, qué oportunidad hay. Menciona cómo este módulo afecta el flujo de caja o la rentabilidad global.",
  "playbook": [
    {
      "action": "Acción concreta y específica",
      "reason": "Por qué basado en los números reales",
      "priority": "urgent|soon|later",
      "timeframe": "hoy|esta semana|este mes|próximos 90 días"
    }
  ]
}

Playbook: 2-3 acciones. Máximo 1 urgent. Basadas en datos reales, no genéricas.`

    // ── 5. Llamar a Claude ────────────────────────────────────────────────────
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-7',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    const tokensUsed = (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0)

    let analysis: { summary: string; details: string; playbook: unknown[] }
    try {
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      analysis = JSON.parse(cleaned)
    } catch {
      return NextResponse.json(
        { error: 'Error procesando la respuesta de IA. Intenta de nuevo.' },
        { status: 500 }
      )
    }

    // ── 6. Guardar análisis ───────────────────────────────────────────────────
    const { data: saved, error: saveError } = await supabase
      .from('ai_module_insights')
      .insert({
        company_id: userData.company_id,
        module,
        summary: analysis.summary,
        details: analysis.details,
        playbook: analysis.playbook,
        tokens_used: tokensUsed,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 500 })
    }

    // ── 7. Incrementar contador de uso ────────────────────────────────────────
    await supabase
      .from('companies')
      .update({ ai_monthly_used: currentUsed + 1 })
      .eq('id', userData.company_id)

    return NextResponse.json({
      success: true,
      insightId: saved?.id,
      summary: analysis.summary,
      details: analysis.details,
      playbook: analysis.playbook,
      usage: { used: currentUsed + 1, quota },
    })
  } catch (error) {
    console.error('Error generando análisis de módulo:', error)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}

// GET — historial de análisis de un módulo
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const module = searchParams.get('module')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) return NextResponse.json({ error: 'Sin empresa' }, { status: 403 })

    let q = supabase
      .from('ai_module_insights')
      .select('id, module, summary, playbook, created_at')
      .eq('company_id', userData.company_id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (module) q = q.eq('module', module)

    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ insights: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}
