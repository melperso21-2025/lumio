import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import type { Database } from '@/lib/supabase/database.types'
import { aiLimiter, checkRateLimit } from '@/lib/ratelimit'
import { CLAUDE_MODEL } from '@/lib/ai'

type WeeklySnapshotRow = Database['public']['Tables']['weekly_snapshots']['Row']

export async function POST(request: NextRequest) {
  try {
    const { companyId } = (await request.json()) as { companyId?: string }

    if (!companyId) {
      return NextResponse.json({ error: 'companyId requerido' }, { status: 400 })
    }

    // ── Rate limiting: 5 requests / 5 min por IP ──────────────────────────────
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const rl = await checkRateLimit(aiLimiter, `ai-generate-initial:${ip}`)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta en unos minutos.' },
        { status: 429 }
      )
    }

    const supabase = await createClient()

    // ── 1. Auth — solo Pulse Admin ──────────────────────────
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('is_pulse_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.is_pulse_admin) {
      return NextResponse.json(
        { error: 'Solo Pulse Admin puede generar el análisis inicial' },
        { status: 403 }
      )
    }

    // ── 2. Verificar que no existe ya un análisis inicial ───
    const { data: existing } = await supabase
      .from('ai_insights')
      .select('id, created_at')
      .eq('company_id', companyId)
      .eq('type', 'initial')
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Esta empresa ya tiene un análisis inicial generado.' },
        { status: 409 }
      )
    }

    // ── 3. Cargar datos históricos completos ─────────────────

    const { data: company } = await supabase
      .from('companies')
      .select('name, plan, created_at')
      .eq('id', companyId)
      .single()

    const { data: snapsData } = await supabase
      .from('weekly_snapshots')
      .select(
        'week_number, year, total_sales, total_transactions, avg_roas, ' +
          'total_ad_spend, total_leads, avg_effectiveness, gross_margin_pct, ' +
          'net_margin_pct, cash_days, inventory_days, avg_ctr, total_discounts'
      )
      .eq('company_id', companyId)
      .gt('total_sales', 0)
      .order('year', { ascending: true })
      .order('week_number', { ascending: true })

    const snaps = (snapsData ?? []) as unknown as WeeklySnapshotRow[]

    const { data: salesSummary } = await supabase
      .from('sales')
      .select(
        'gross_total, discount_amount, production_cost, sale_date, channel_id, sales_channels(name)'
      )
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .neq('status', 'cancelled')
      .order('sale_date', { ascending: true })

    const sales = salesSummary ?? []

    const { data: adsAll } = await supabase
      .from('ad_campaigns')
      .select(
        'spend, attributed_revenue, roas, leads_count, platform, campaign_name, campaign_date'
      )
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('campaign_date', { ascending: true })

    const ads = adsAll ?? []

    const { data: productsData } = await supabase
      .from('products')
      .select('name, current_stock, unit_cost, sale_price, min_stock_alert')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('is_active', true)

    const products = productsData ?? []

    const { data: banksData } = await supabase
      .from('bank_accounts')
      .select('current_balance, bank_name')
      .eq('company_id', companyId)
      .is('deleted_at', null)

    const banks = banksData ?? []

    const { data: customersData } = await supabase
      .from('customers')
      .select('customer_type, label, lifetime_value, last_purchase_at')
      .eq('company_id', companyId)
      .is('deleted_at', null)

    const customers = customersData ?? []

    // ── 4. Calcular métricas globales para el prompt ─────────

    const totalSalesAll = sales.reduce((s, r) => s + (r.gross_total ?? 0), 0)
    const totalSpendAll = ads.reduce((s, a) => s + (a.spend ?? 0), 0)
    const totalRevenueAll = ads.reduce((s, a) => s + (a.attributed_revenue ?? 0), 0)
    const totalLeadsAll = ads.reduce((s, a) => s + (a.leads_count ?? 0), 0)
    const totalBalance = banks.reduce((s, b) => s + (b.current_balance ?? 0), 0)
    const totalStockValue = products.reduce(
      (s, p) => s + (p.current_stock ?? 0) * (p.unit_cost ?? 0),
      0
    )

    const avgRoasGlobal = totalSpendAll > 0 ? totalRevenueAll / totalSpendAll : 0
    const avgMarginGlobal =
      snaps.length > 0
        ? snaps.reduce((s, w) => s + (w.gross_margin_pct ?? 0), 0) / snaps.length
        : 0
    const avgNetMarginGlobal =
      snaps.length > 0
        ? snaps.reduce((s, w) => s + (w.net_margin_pct ?? 0), 0) / snaps.length
        : 0

    const bestWeek = [...snaps].sort(
      (a, b) => (b.total_sales ?? 0) - (a.total_sales ?? 0)
    )[0]
    const worstWeek = [...snaps]
      .filter((s) => (s.total_sales ?? 0) > 0)
      .sort((a, b) => (a.total_sales ?? 0) - (b.total_sales ?? 0))[0]

    const bestCampaign = [...ads].sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0))[0]

    // Canal más rentable en ventas
    const channelMap: Record<string, number> = {}
    sales.forEach((s) => {
      const sc = (s as Record<string, unknown>).sales_channels
      const name =
        sc && typeof sc === 'object' && 'name' in sc
          ? (sc as { name: string }).name
          : 'Sin canal'
      channelMap[name] = (channelMap[name] ?? 0) + (s.gross_total ?? 0)
    })
    const topChannel = Object.entries(channelMap).sort((a, b) => b[1] - a[1])[0]

    const vipCount = customers.filter((c) => c.label === 'vip').length
    const newCount = customers.filter((c) => c.label === 'new').length
    const recCount = customers.filter((c) => c.label === 'recovery').length
    const topLTV = [...customers].sort(
      (a, b) => (b.lifetime_value ?? 0) - (a.lifetime_value ?? 0)
    )[0]

    // Tendencia: últimas 4 semanas vs primeras 4 semanas
    const first4 = snaps.slice(0, 4)
    const last4 = snaps.slice(-4)
    const avgFirst4 =
      first4.length > 0
        ? first4.reduce((s, w) => s + (w.total_sales ?? 0), 0) / first4.length
        : 0
    const avgLast4 =
      last4.length > 0
        ? last4.reduce((s, w) => s + (w.total_sales ?? 0), 0) / last4.length
        : 0
    const growthTrend =
      avgFirst4 > 0
        ? (((avgLast4 - avgFirst4) / avgFirst4) * 100).toFixed(1)
        : 'N/D'

    // ── 5. Prompt para Claude ────────────────────────────────
    const prompt = `Eres el motor de análisis de Lumio. Vas a generar el \
ANÁLISIS INICIAL de la empresa "${company?.name ?? 'cliente'}" — una evaluación \
360° de todo su historial de datos disponible. Este es el primer análisis \
que el dueño del negocio verá en lumio. Debe ser revelador, honesto y \
accionable. Tono: consultor senior hablándole directamente al dueño.

## PERÍODO ANALIZADO
- Semanas con datos: ${snaps.length} semanas
- Primera semana: S${snaps[0]?.week_number ?? '?'}/${snaps[0]?.year ?? '?'}
- Última semana: S${snaps[snaps.length - 1]?.week_number ?? '?'}/${snaps[snaps.length - 1]?.year ?? '?'}

## VENTAS — VISIÓN GLOBAL
- Ventas totales del período: $${totalSalesAll.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Total transacciones: ${sales.length}
- Ticket promedio: $${sales.length > 0 ? (totalSalesAll / sales.length).toFixed(2) : '0'}
- Canal más rentable: ${topChannel ? `${topChannel[0]} ($${topChannel[1].toLocaleString('es-EC', { minimumFractionDigits: 0 })})` : 'sin datos'}
- Margen bruto promedio: ${avgMarginGlobal.toFixed(1)}%
- Margen neto bancario promedio (ventas netas - COGS - egresos - pauta): ${avgNetMarginGlobal.toFixed(1)}%
- Mejor semana: S${bestWeek?.week_number ?? '?'}/${bestWeek?.year ?? '?'} con $${bestWeek?.total_sales?.toFixed(2) ?? '0'}
- Peor semana: S${worstWeek?.week_number ?? '?'}/${worstWeek?.year ?? '?'} con $${worstWeek?.total_sales?.toFixed(2) ?? '0'}
- Tendencia (últimas 4 vs primeras 4 semanas): ${growthTrend}% de variación

## PAUTAS PUBLICITARIAS — VISIÓN GLOBAL
- Inversión total: $${totalSpendAll.toFixed(2)}
- Revenue atribuido total: $${totalRevenueAll.toFixed(2)}
- ROAS global: ${avgRoasGlobal.toFixed(2)}
- Total leads generados: ${totalLeadsAll}
- Campañas ejecutadas: ${ads.length}
- Mejor campaña: ${bestCampaign ? `"${bestCampaign.campaign_name}" ROAS ${bestCampaign.roas?.toFixed(2)}` : 'sin datos'}
- Plataformas usadas: ${[...new Set(ads.map((a) => a.platform))].filter(Boolean).join(', ') || 'ninguna'}

## INVENTARIO — ESTADO ACTUAL
- Productos activos: ${products.length}
- Capital total en stock: $${totalStockValue.toFixed(2)}
- Productos con stock bajo: ${products.filter((p) => (p.current_stock ?? 0) <= (p.min_stock_alert ?? 0) && (p.min_stock_alert ?? 0) > 0).length}

## CLIENTES — SEGMENTACIÓN
- Total clientes registrados: ${customers.length}
- VIP: ${vipCount} | Nuevos: ${newCount} | En recuperación: ${recCount}
- Cliente con mayor LTV: ${topLTV ? `$${(topLTV.lifetime_value ?? 0).toFixed(2)}` : 'sin datos'}

## FINANZAS — ESTADO ACTUAL
- Saldo total en cuentas: $${totalBalance.toFixed(2)}

## TU TAREA
Genera un análisis ejecutivo completo en español. Sé específico con los \
números. Identifica fortalezas reales y riesgos reales. El playbook debe \
tener acciones estratégicas para los próximos 30-90 días, no acciones \
operativas semanales.

Responde ÚNICAMENTE con JSON válido, sin markdown:

{
  "executive_summary": "4-5 oraciones. Diagnóstico honesto del negocio: dónde está hoy, qué está funcionando, qué es preocupante. Con números específicos.",
  "insight_sales": "Análisis profundo de ventas: tendencia, estacionalidad detectada, canal más fuerte, comportamiento del ticket, eficiencia de descuentos. 3-4 párrafos.",
  "insight_campaigns": "Análisis de la inversión publicitaria total: retorno global, qué plataforma funcionó mejor, eficiencia de conversión de leads. 2-3 párrafos.",
  "insight_inventory": "Diagnóstico del inventario: capital paralizado vs rotación, riesgo de desabasto o sobrestock. 2 párrafos.",
  "insight_finance": "Situación financiera del negocio: solidez del flujo, estructura de gastos, capacidad operativa. 2 párrafos.",
  "playbook": [
    {
      "action": "Acción estratégica concreta para los próximos 30-90 días",
      "reason": "Por qué basado en los datos históricos",
      "priority": "urgent|soon|later",
      "timeframe": "esta semana|este mes|próximos 90 días"
    }
  ]
}

Playbook: 4-5 acciones estratégicas de mediano plazo. Máximo 1 urgent. \
Basadas en los patrones del historial completo.`

    // ── 6. Llamar a Claude ───────────────────────────────────
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 5000,
      // El razonamiento adaptativo viene activado por defecto y comparte
      // max_tokens con la respuesta; desactivarlo evita que el JSON se corte.
      thinking: { type: 'disabled' },
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : ''

    type AnalysisData = {
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

    let analysisData: AnalysisData

    try {
      let cleaned = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()

      // Si el JSON está incompleto (respuesta cortada por max_tokens)
      // intentar cerrar arrays y objetos abiertos
      if (!cleaned.endsWith('}')) {
        const lastComma = cleaned.lastIndexOf(',')
        const lastBrace = cleaned.lastIndexOf('}')
        if (lastComma > lastBrace) {
          cleaned = cleaned.slice(0, lastComma)
        }
        const openBrackets  = (cleaned.match(/\[/g) ?? []).length
        const closeBrackets = (cleaned.match(/\]/g) ?? []).length
        const openBraces    = (cleaned.match(/\{/g) ?? []).length
        const closeBraces   = (cleaned.match(/\}/g) ?? []).length
        for (let i = 0; i < openBrackets - closeBrackets; i++) cleaned += ']'
        for (let i = 0; i < openBraces   - closeBraces;   i++) cleaned += '}'
      }

      analysisData = JSON.parse(cleaned)
    } catch (parseError) {
      console.error('Error parseando Claude:', parseError)
      console.error('Respuesta raw:', responseText.slice(0, 500))
      return NextResponse.json(
        { error: 'Error procesando la respuesta de IA. Intenta de nuevo.' },
        { status: 500 }
      )
    }

    // ── 7. Guardar con type='initial', week_number=0 ─────────
    const currentYear = new Date().getFullYear()
    const { error: insertError } = await supabase.from('ai_insights').insert({
      company_id: companyId,
      week_number: 0,
      year: currentYear,
      type: 'initial',
      executive_summary: analysisData.executive_summary,
      insight_sales: analysisData.insight_sales,
      insight_campaigns: analysisData.insight_campaigns,
      insight_inventory: analysisData.insight_inventory,
      insight_finance: analysisData.insight_finance,
      playbook: analysisData.playbook,
    })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error generando análisis inicial:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    )
  }
}
