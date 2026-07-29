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

    // ── 3. Obtener contexto global enriquecido (2 semanas) ───────────────────
    const now = new Date()
    const year = now.getFullYear()
    const weekNumber = getISOWeek(now)

    const [snapsResult, bankResult, companyInfoResult] = await Promise.all([
      supabase
        .from('weekly_snapshots')
        .select('week_number, total_sales, gross_margin_pct, net_margin_pct, cash_days, overdue_receivables, total_transactions, inventory_days')
        .eq('company_id', userData.company_id)
        .eq('year', year)
        .in('week_number', [weekNumber, weekNumber - 1])
        .order('week_number', { ascending: false }),
      supabase
        .from('bank_accounts')
        .select('current_balance')
        .eq('company_id', userData.company_id)
        .is('deleted_at', null),
      supabase
        .from('companies')
        .select('name, sector, business_description, main_customer_type, avg_monthly_revenue_range')
        .eq('id', userData.company_id)
        .single(),
    ])

    const snaps = snapsResult.data ?? []
    const snapActual = snaps.find(s => s.week_number === weekNumber)
    const snapAnterior = snaps.find(s => s.week_number === weekNumber - 1)
    const totalCash = (bankResult.data ?? []).reduce((s, b) => s + (b.current_balance ?? 0), 0)
    const companyInfo = companyInfoResult.data

    const ventasSemana = snapActual?.total_sales ?? 0
    const ventasAnterior = snapAnterior?.total_sales ?? 0
    const tendenciaVentas = ventasAnterior > 0
      ? ((ventasSemana - ventasAnterior) / ventasAnterior * 100).toFixed(1)
      : null

    const diasCaja = snapActual?.cash_days ?? 0
    const alertaCaja = diasCaja < 15 ? '⚠️ CRÍTICO: menos de 15 días de caja'
      : diasCaja < 30 ? '⚠️ ATENCIÓN: menos de 30 días de caja'
      : '✅ Caja saludable'

    const margenBruto = snapActual?.gross_margin_pct ?? 0
    const alertaMargen = margenBruto < 20 ? '⚠️ Margen bruto muy bajo (menor al 20%)'
      : margenBruto < 35 ? '⚠️ Margen bruto ajustado (20-35%)'
      : '✅ Margen bruto saludable'

    const CUSTOMER_TYPE_LABELS: Record<string, string> = {
      b2c:   'consumidor final (B2C — personas que compran para uso propio)',
      b2b:   'otras empresas (B2B — ciclos de pago más largos, facturas mayores)',
      mixed: 'mixto — vende tanto a consumidores como a empresas',
    }
    const REVENUE_LABELS: Record<string, string> = {
      lt5k:     'menos de $5,000/mes',
      '5k_20k': 'entre $5,000 y $20,000/mes',
      '20k_100k': 'entre $20,000 y $100,000/mes',
      gt100k:   'más de $100,000/mes',
    }

    const globalContext = `
CONTEXTO DEL NEGOCIO${companyInfo?.name ? ` — ${companyInfo.name}` : ''}:
${companyInfo?.business_description ? `Descripción: ${companyInfo.business_description}` : ''}
${companyInfo?.sector ? `Sector: ${companyInfo.sector}` : ''}
${companyInfo?.main_customer_type ? `Tipo de cliente principal: ${CUSTOMER_TYPE_LABELS[companyInfo.main_customer_type] ?? companyInfo.main_customer_type}` : ''}
${companyInfo?.avg_monthly_revenue_range ? `Facturación mensual aproximada: ${REVENUE_LABELS[companyInfo.avg_monthly_revenue_range] ?? companyInfo.avg_monthly_revenue_range}` : ''}

SITUACIÓN FINANCIERA ACTUAL (semana ${weekNumber}/${year}):

- Ventas esta semana: $${ventasSemana.toFixed(2)}${tendenciaVentas ? ` (${Number(tendenciaVentas) >= 0 ? '+' : ''}${tendenciaVentas}% vs semana pasada)` : ''}
- Ventas semana pasada: $${ventasAnterior > 0 ? ventasAnterior.toFixed(2) : 'sin datos'}
- Margen bruto: ${margenBruto.toFixed(1)}% — ${alertaMargen}
- Margen neto: ${(snapActual?.net_margin_pct ?? 0).toFixed(1)}%
- Dinero en caja/bancos: $${totalCash.toFixed(2)} — ${alertaCaja} (cubre ${diasCaja} días de operación)
- Facturas por cobrar vencidas: $${(snapActual?.overdue_receivables ?? 0).toFixed(2)}
- Transacciones esta semana: ${snapActual?.total_transactions ?? 0}
- Días de inventario disponible: ${snapActual?.inventory_days ?? 0} días`.trim()

    // ── 4. Benchmarks y señales de alerta por módulo ──────────────────────────
    const MODULE_BENCHMARKS: Record<string, string> = {
      sales: `
BENCHMARKS DE VENTAS (PyMEs saludables):
- Ticket promedio debe subir o mantenerse — si baja con más transacciones, hay presión en precios
- Descuentos > 15% del total de ventas es una señal de alerta (se está regalando margen)
- LPP (productos por pedido) > 2 es buena señal de venta cruzada
- Variación semana a semana > -20% merece atención inmediata`,
      purchases: `
BENCHMARKS DE COMPRAS (PyMEs saludables):
- Las compras no deberían superar el 60-70% de las ventas del período
- Si CxP pendiente > 30 días de ventas, hay presión de liquidez con proveedores
- Concentración en un solo proveedor (>50% del gasto) es riesgo operativo
- Compras a crédito > 70% del total puede ser señal de problema de flujo de caja`,
      receivables: `
BENCHMARKS DE CxC (PyMEs saludables):
- CxC vencida no debería superar el 20% del total pendiente
- Si hay facturas vencidas > 90 días, la probabilidad de cobro cae al 50%
- Días promedio de cobro > 45 días es señal de alerta
- Clientes que concentran > 30% de la CxC total son riesgo de cartera`,
      payables: `
BENCHMARKS DE CxP (PyMEs saludables):
- CxP vencida no debería existir — indica problemas de flujo de caja
- Los plazos de pago a proveedores deben ser mayores que los plazos de cobro a clientes
- Si CxP total > saldo en caja, el negocio no puede pagar lo que debe ahora mismo
- Proveedores con CxP vencida pueden cortar suministro`,
      inventory: `
BENCHMARKS DE INVENTARIO (PyMEs saludables):
- Días de cobertura óptimo: 20-45 días. Menos = riesgo de quiebre. Más = capital paralizado
- Productos sin movimiento en 60+ días son inventario muerto (costo sin retorno)
- El capital en stock no debería superar el 40% del total de activos
- Stock bajo en productos de alta rotación es pérdida de ventas directa`,
    }

    // ── 5. Construir prompt ───────────────────────────────────────────────────
    const moduleLabel = MODULE_LABELS[module] ?? module
    const moduleJson = JSON.stringify(moduleData, null, 2)
    const benchmarks = MODULE_BENCHMARKS[module] ?? ''

    const prompt = `Eres el asesor de negocios de Lumio. Tu trabajo es ayudar a dueños de pequeñas y medianas empresas latinoamericanas a entender la salud real de su negocio y tomar mejores decisiones. La mayoría de estos dueños NO tienen formación financiera — son emprendedores que aprendieron en la práctica. Tu análisis debe ser claro, directo y útil para alguien así.

REGLAS DE LENGUAJE (CRÍTICAS):
1. Nunca uses jerga financiera sin explicarla. Si dices "margen bruto", explica que es "lo que te queda de cada venta antes de pagar gastos fijos"
2. Habla en primera persona plural cuando sea positivo ("estamos bien en..."), segunda persona cuando sea una alerta ("tienes un problema en...")
3. Usa ejemplos con números reales del negocio, no porcentajes abstractos
4. Si algo está bien, dilo. No todo puede ser una alerta
5. Las acciones deben ser tan concretas que el dueño pueda ejecutarlas hoy sin necesitar a nadie más
6. Máximo 3 oraciones por párrafo — este texto se lee en un celular

${globalContext}

${benchmarks}

DATOS DEL MÓDULO — ${moduleLabel.toUpperCase()}:
${moduleJson}

Responde ÚNICAMENTE con JSON válido, sin markdown ni texto extra:

{
  "headline": "Una sola frase impactante que resume el estado del módulo. Usa un número real. Ej: 'Tienes $3,200 en facturas vencidas que podrías cobrar esta semana'",
  "alert": null,
  "summary": "2-3 oraciones en lenguaje simple. Qué está pasando en este módulo y cómo afecta al negocio hoy. Usa los números reales.",
  "highlights": [
    { "tipo": "bueno|malo|neutral", "texto": "Un hallazgo específico con número. Ej: 'Tu margen del 42% está por encima del promedio del sector (35%)'" }
  ],
  "details": "3 párrafos separados por doble salto de línea. Párrafo 1: qué está funcionando bien con números. Párrafo 2: qué preocupa o requiere atención con números y consecuencia concreta si no se actúa. Párrafo 3: oportunidad clara que el dueño puede aprovechar.",
  "playbook": [
    {
      "action": "Verbo + quién + qué + número concreto. Ej: 'Llama hoy a los 3 clientes con facturas vencidas más de 30 días (total $1,800) y ofréceles pagar en cuotas'",
      "reason": "Si no lo haces, [consecuencia concreta con número]. Si lo haces, [beneficio concreto con número].",
      "priority": "urgent|soon|later",
      "timeframe": "hoy|esta semana|este mes|próximos 90 días"
    }
  ]
}

INSTRUCCIONES DEL JSON:
- "alert": null si todo está bien. Si hay algo urgente, una frase corta en mayúsculas. Ej: "TIENES $2,400 EN CxP VENCIDA QUE PUEDE CORTAR TU SUMINISTRO"
- "highlights": 2-4 hallazgos, mezcla de buenos y malos, siempre con número
- "playbook": 2-3 acciones. Solo 1 puede ser "urgent". Si no hay urgencias reales, no pongas ninguna urgent.
- NUNCA inventes números. Si un dato no está en los datos enviados, no lo menciones.`

    // ── 5. Llamar a Claude ────────────────────────────────────────────────────
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-7',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    const tokensUsed = (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0)

    type Analysis = {
      headline: string
      alert: string | null
      summary: string
      highlights: Array<{ tipo: string; texto: string }>
      details: string
      playbook: Array<{ action: string; reason: string; priority: string; timeframe: string }>
    }

    let analysis: Analysis
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
        summary: analysis.headline + '\n\n' + analysis.summary,
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
      headline: analysis.headline,
      alert: analysis.alert,
      summary: analysis.summary,
      highlights: analysis.highlights,
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
