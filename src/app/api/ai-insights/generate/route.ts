import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import type { Database } from '@/lib/supabase/database.types'
import { aiLimiter, checkRateLimit } from '@/lib/ratelimit'
import { CLAUDE_MODEL } from '@/lib/ai'

type WeeklySnapshotRow = Database['public']['Tables']['weekly_snapshots']['Row']

// ── Helper: fechas ISO correctas de una semana ────────────────────────────────
// El 4 de enero siempre cae en la semana 1 ISO, lo que ancla el cálculo
function getISOWeekDates(
  year: number,
  week: number
): { weekStartStr: string; weekEndStr: string } {
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  const week1Mon = new Date(jan4.getTime() - (jan4Day - 1) * 86400000)
  const weekMon = new Date(week1Mon.getTime() + (week - 1) * 7 * 86400000)
  const weekSun = new Date(weekMon.getTime() + 6 * 86400000)
  const toISO = (d: Date) => d.toISOString().slice(0, 10)
  return { weekStartStr: toISO(weekMon), weekEndStr: toISO(weekSun) }
}

// ── Helper: delta % formateado para el prompt ─────────────────────────────────
function pct(
  curr: number | null | undefined,
  prev: number | null | undefined,
  prevWeek: number
): string {
  if (curr == null || prev == null || prev === 0) return 'sin datos anteriores'
  const d = ((curr - prev) / prev) * 100
  const formatted = d.toFixed(1)
  return `${Number(formatted) >= 0 ? '+' : ''}${formatted}% vs S${prevWeek}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, weekNumber, year, forcedByPulse } = body as {
      companyId: string
      weekNumber: number
      year: number
      forcedByPulse?: boolean
    }

    if (!companyId || !weekNumber || !year) {
      return NextResponse.json(
        { error: 'Parámetros incompletos' },
        { status: 400 }
      )
    }

    // ── Rate limiting: 5 requests / 5 min por IP (endpoint costoso) ──────────
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const rl = await checkRateLimit(aiLimiter, `ai-generate:${ip}`)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta en unos minutos.' },
        { status: 429 }
      )
    }

    const supabase = await createClient()

    // ── 1. Autenticación ──────────────────────────────────────────────────────
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role, is_pulse_admin, company_id')
      .eq('id', user.id)
      .single()

    const isPulseAdmin = userData?.is_pulse_admin === true
    const isCompanyAdmin =
      userData?.company_id === companyId && userData?.role === 'admin'

    if (!isPulseAdmin && !isCompanyAdmin) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    // ── Verificar empresa activa ──────────────────────────────────────────────
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .is('deleted_at', null)
      .single()
    if (!company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
    }

    // ── 2. Control de uso — 1 análisis por empresa/semana ────────────────────
    const { data: existing } = await supabase
      .from('ai_insights')
      .select('id, created_at')
      .eq('company_id', companyId)
      .eq('week_number', weekNumber)
      .eq('year', year)
      .maybeSingle()

    if (existing) {
      if (isPulseAdmin && forcedByPulse) {
        // Regeneración autorizada por Pulse — continuar
      } else if (isPulseAdmin) {
        return NextResponse.json(
          {
            error:
              'Ya existe análisis para esta semana. Usa forcedByPulse=true para regenerar.',
          },
          { status: 429 }
        )
      } else {
        // Cliente: debe solicitar corrección a Pulse en lugar de regenerar directamente
        return NextResponse.json(
          {
            error:
              'Ya generaste el análisis de esta semana. Si necesitas corregirlo, solicita una corrección a Pulse.',
          },
          { status: 429 }
        )
      }
    }

    // ── 3. Fechas ISO de la semana a analizar ─────────────────────────────────
    const { weekStartStr, weekEndStr } = getISOWeekDates(year, weekNumber)

    // ── 4. Recopilar datos para el análisis ───────────────────────────────────
    const { data: snapData } = await supabase
      .from('weekly_snapshots')
      .select(
        'week_number, total_sales, total_transactions, avg_roas, ' +
          'total_ad_spend, total_leads, avg_effectiveness, gross_margin_pct, ' +
          'net_margin_pct, cash_days, inventory_days, overdue_receivables, ' +
          'fixed_vs_total_pct, avg_ctr, avg_lpp, total_discounts'
      )
      .eq('company_id', companyId)
      .eq('year', year)
      .in('week_number', [weekNumber, weekNumber - 1])
      .order('week_number', { ascending: false })

    const snaps = (snapData ?? []) as unknown as WeeklySnapshotRow[]
    const currentSnap = snaps.find((s) => s.week_number === weekNumber)
    const prevSnap = snaps.find((s) => s.week_number === weekNumber - 1)

    const { data: salesData } = await supabase
      .from('sales')
      .select(
        'gross_total, production_cost, discount_amount, lines_per_order, status, channel_id'
      )
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .neq('status', 'cancelled')
      .gte('sale_date', weekStartStr)
      .lte('sale_date', weekEndStr)

    const { data: adsData } = await supabase
      .from('ad_campaigns')
      .select(
        'spend, attributed_revenue, roas, ctr, effectiveness_rate, leads_count, platform, campaign_name'
      )
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('week_number', weekNumber)
      .eq('year', year)

    const { data: inventoryData } = await supabase
      .from('products')
      .select('name, current_stock, min_stock_alert, sale_price, unit_cost')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('is_active', true)

    const { data: bankData } = await supabase
      .from('bank_accounts')
      .select('current_balance')
      .eq('company_id', companyId)
      .is('deleted_at', null)

    const { data: txData } = await supabase
      .from('bank_transactions')
      .select('type, amount, category, is_fixed')
      .eq('company_id', companyId)
      .gte('tx_date', weekStartStr)
      .lte('tx_date', weekEndStr)

    const sales = salesData ?? []
    const ads = adsData ?? []
    const products = inventoryData ?? []
    const banks = bankData ?? []
    const txs = txData ?? []

    // Cálculos derivados usados en el prompt cuando no hay snapshot
    const totalSales = sales.reduce((s, r) => s + (r.gross_total ?? 0), 0)
    const totalAdSpend = ads.reduce((s, a) => s + (a.spend ?? 0), 0)
    const totalBalance = banks.reduce((s, b) => s + (b.current_balance ?? 0), 0)
    const totalExpenses = txs
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + (t.amount ?? 0), 0)
    const lowStockProducts = products.filter(
      (p) =>
        (p.current_stock ?? 0) <= (p.min_stock_alert ?? 0) &&
        (p.min_stock_alert ?? 0) > 0
    )
    const bestCampaign = [...ads].sort(
      (a, b) => (b.roas ?? 0) - (a.roas ?? 0)
    )[0]
    const topFrozenProduct = [...products].sort(
      (a, b) =>
        (b.current_stock ?? 0) * (b.unit_cost ?? 0) -
        (a.current_stock ?? 0) * (a.unit_cost ?? 0)
    )[0]

    // ── 5. Construir prompt ───────────────────────────────────────────────────
    const prevWeek = weekNumber - 1

    const prompt = `Eres el motor de análisis de Lumio, plataforma de inteligencia \
de negocio para PyMEs latinoamericanas. Analiza los datos de la semana \
${weekNumber}/${year} (${weekStartStr} → ${weekEndStr}) y genera un informe \
ejecutivo en español para el dueño del negocio. Sé directo, específico \
con los números y accionable.

## DATOS SEMANA ${weekNumber}/${year}

### Ventas
- Total: $${(currentSnap?.total_sales ?? totalSales).toFixed(2)} (${pct(currentSnap?.total_sales, prevSnap?.total_sales, prevWeek)})
- Transacciones: ${currentSnap?.total_transactions ?? sales.length} (${pct(currentSnap?.total_transactions, prevSnap?.total_transactions, prevWeek)})
- LPP promedio: ${currentSnap?.avg_lpp?.toFixed(1) ?? '0'} líneas por pedido
- Descuentos: $${(currentSnap?.total_discounts ?? 0).toFixed(2)}
- Margen bruto: ${currentSnap?.gross_margin_pct?.toFixed(1) ?? '0'}%
- Margen neto bancario (ventas netas - COGS - egresos bancarios - pauta): ${currentSnap?.net_margin_pct?.toFixed(1) ?? '0'}%

### Pautas Publicitarias
- Inversión: $${(currentSnap?.total_ad_spend ?? totalAdSpend).toFixed(2)} (${pct(currentSnap?.total_ad_spend, prevSnap?.total_ad_spend, prevWeek)})
- ROAS: ${currentSnap?.avg_roas?.toFixed(2) ?? '0'} (${pct(currentSnap?.avg_roas, prevSnap?.avg_roas, prevWeek)})
- Leads: ${currentSnap?.total_leads ?? 0} (${pct(currentSnap?.total_leads, prevSnap?.total_leads, prevWeek)})
- Efectividad: ${currentSnap?.avg_effectiveness?.toFixed(1) ?? '0'}%
- CTR: ${currentSnap?.avg_ctr?.toFixed(2) ?? '0'}%
- Plataformas: ${[...new Set(ads.map((a) => a.platform))].filter(Boolean).join(', ') || 'ninguna'}
${bestCampaign ? `- Mejor campaña: "${bestCampaign.campaign_name}" ROAS ${bestCampaign.roas?.toFixed(2)}` : ''}

### Inventario
- Días de cobertura: ${currentSnap?.inventory_days ?? 0} días (óptimo 20–45)
- Productos activos: ${products.length}
- Stock bajo: ${lowStockProducts.length} producto${lowStockProducts.length !== 1 ? 's' : ''}
${lowStockProducts.length > 0 ? `- Críticos: ${lowStockProducts.slice(0, 3).map((p) => p.name).join(', ')}` : ''}
${topFrozenProduct ? `- Mayor capital paralizado: "${topFrozenProduct.name}" ($${((topFrozenProduct.current_stock ?? 0) * (topFrozenProduct.unit_cost ?? 0)).toFixed(0)})` : ''}

### Finanzas
- Saldo total: $${totalBalance.toFixed(2)}
- Egresos semana: $${totalExpenses.toFixed(2)}
- Días de caja: ${currentSnap?.cash_days ?? 0} (óptimo >30)
- CxC vencidas: $${currentSnap?.overdue_receivables ?? 0}
- Gastos fijos/egresos: ${currentSnap?.fixed_vs_total_pct?.toFixed(1) ?? '0'}% (benchmark <55%)

## SEMANA ANTERIOR S${prevWeek}/${year}
- Ventas: $${prevSnap?.total_sales?.toFixed(2) ?? 'sin datos'}
- ROAS: ${prevSnap?.avg_roas?.toFixed(2) ?? 'sin datos'}
- Margen neto bancario: ${prevSnap?.net_margin_pct?.toFixed(1) ?? 'sin datos'}%
- Días de caja: ${prevSnap?.cash_days ?? 'sin datos'}

## FORMATO — responde SOLO con JSON válido, sin markdown:

{
  "executive_summary": "3-4 oraciones. Hallazgos más importantes con números específicos y tendencia vs semana anterior. Tono ejecutivo y directo.",
  "insight_sales": "Análisis de ventas: desempeño, comparativa, canales efectivos, observaciones sobre descuentos o ticket.",
  "insight_campaigns": "Análisis de pautas: eficiencia de inversión, ROAS, qué escalar o pausar, recomendación concreta.",
  "insight_inventory": "Estado inventario: días de cobertura, capital paralizado, qué reponer o liquidar.",
  "insight_finance": "Situación financiera: flujo de caja, días disponibles, alertas.",
  "playbook": [
    {
      "action": "Acción específica y concreta basada en los datos",
      "reason": "Por qué basado en los números reales",
      "priority": "urgent|soon|later",
      "timeframe": "hoy|esta semana|este mes"
    }
  ]
}

Playbook: 3–5 acciones. Máximo 1 urgent. Si una métrica está bien, reconócelo.`

    // ── 6. Llamar a Claude ────────────────────────────────────────────────────
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : ''

    let analysisData: {
      executive_summary: string
      insight_sales: string
      insight_campaigns: string
      insight_inventory: string
      insight_finance: string
      playbook: Array<{
        action: string
        reason: string
        priority: string
        timeframe: string
      }>
    }

    try {
      const cleaned = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      analysisData = JSON.parse(cleaned)
    } catch {
      return NextResponse.json(
        { error: 'Error procesando la respuesta de IA. Intenta de nuevo.' },
        { status: 500 }
      )
    }

    // ── 7. Guardar en Supabase ────────────────────────────────────────────────
    const { error: upsertError } = await supabase.from('ai_insights').upsert(
      {
        company_id: companyId,
        week_number: weekNumber,
        year: year,
        executive_summary: analysisData.executive_summary,
        insight_sales: analysisData.insight_sales,
        insight_campaigns: analysisData.insight_campaigns,
        insight_inventory: analysisData.insight_inventory,
        insight_finance: analysisData.insight_finance,
        playbook: analysisData.playbook,
        viewed_at: null,
      },
      { onConflict: 'company_id,week_number,year' }
    )

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    // Si era regeneración forzada por Pulse, marcar la solicitud como completada
    if (forcedByPulse && isPulseAdmin) {
      await supabase
        .from('insight_requests')
        .update({
          status: 'done',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('company_id', companyId)
        .eq('week_number', weekNumber)
        .eq('year', year)
        .eq('status', 'approved')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error generando insight:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    )
  }
}
