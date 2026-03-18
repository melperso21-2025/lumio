import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  try {
    const { companyId, weekNumber, year } = await request.json()

    if (!companyId || !weekNumber || !year) {
      return NextResponse.json(
        { error: 'Parámetros incompletos' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 1. Verificar autenticación
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // 2. Verificar permisos — solo admin o pulse_admin
    const { data: userData } = await supabase
      .from('users')
      .select('role, is_pulse_admin, company_id')
      .eq('id', user.id)
      .single()

    if (
      userData?.company_id !== companyId &&
      !userData?.is_pulse_admin
    ) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    if (userData?.role !== 'admin' && !userData?.is_pulse_admin) {
      return NextResponse.json(
        { error: 'Solo administradores pueden generar análisis' },
        { status: 403 }
      )
    }

    // 3. CONTROL DE USO: verificar si ya existe insight esta semana
    const { data: existing } = await supabase
      .from('ai_insights')
      .select('id, created_at')
      .eq('company_id', companyId)
      .eq('week_number', weekNumber)
      .eq('year', year)
      .single()

    // Si existe y fue generado hace menos de 1 hora, no regenerar
    if (existing) {
      const generatedAt = new Date(existing.created_at).getTime()
      const oneHourAgo = Date.now() - 60 * 60 * 1000
      if (generatedAt > oneHourAgo) {
        return NextResponse.json(
          {
            error:
              'Ya existe un análisis reciente para esta semana. Espera al menos 1 hora para regenerar.',
          },
          { status: 429 }
        )
      }
    }

    // 4. Recopilar datos de la empresa para el análisis
    const monthStart = new Date(year, 0, 1)
    const weekStart = new Date(
      monthStart.getTime() +
        (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000
    )
    const weekEnd = new Date(
      weekStart.getTime() + 7 * 24 * 60 * 60 * 1000
    )
    const weekStartStr = weekStart.toISOString().slice(0, 10)
    const weekEndStr = weekEnd.toISOString().slice(0, 10)

    // Datos de ventas de la semana
    const { data: salesData } = await supabase
      .from('sales')
      .select(
        'gross_total, production_cost, discount_amount, lines_per_order, status, channel_id'
      )
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .neq('status', 'cancelled')
      .gte('sale_date', weekStartStr)
      .lt('sale_date', weekEndStr)

    // Datos de pautas de la semana
    const { data: adsData } = await supabase
      .from('ad_campaigns')
      .select(
        'spend, attributed_revenue, roas, ctr, effectiveness_rate, leads_count, platform'
      )
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('week_number', weekNumber)

    // Datos de inventario — productos con stock bajo
    const { data: inventoryData } = await supabase
      .from('products')
      .select(
        'name, current_stock, min_stock_alert, sale_price, unit_cost'
      )
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('is_active', true)

    // Datos financieros — saldo y transacciones recientes
    const { data: bankData } = await supabase
      .from('bank_accounts')
      .select('current_balance, bank_name')
      .eq('company_id', companyId)
      .is('deleted_at', null)

    const { data: txData } = await supabase
      .from('bank_transactions')
      .select('type, amount, category, is_fixed')
      .eq('company_id', companyId)
      .gte('tx_date', weekStartStr)
      .lt('tx_date', weekEndStr)

    // 5. Preparar resumen de datos para el prompt
    const sales = salesData ?? []
    const ads = adsData ?? []
    const products = inventoryData ?? []
    const banks = bankData ?? []
    const transactions = txData ?? []

    const totalSales = sales.reduce((s, r) => s + (r.gross_total ?? 0), 0)
    const totalTransactions = sales.length
    const avgLPP =
      totalTransactions > 0
        ? sales.reduce((s, r) => s + (r.lines_per_order ?? 0), 0) /
          totalTransactions
        : 0
    const totalAdSpend = ads.reduce((s, a) => s + (a.spend ?? 0), 0)
    const avgROAS =
      ads.length > 0
        ? ads.reduce((s, a) => s + (a.roas ?? 0), 0) / ads.length
        : 0
    const totalBalance = banks.reduce(
      (s, b) => s + (b.current_balance ?? 0),
      0
    )
    const totalExpenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + (t.amount ?? 0), 0)
    const lowStockProducts = products.filter(
      (p) =>
        (p.current_stock ?? 0) <= (p.min_stock_alert ?? 0) &&
        (p.min_stock_alert ?? 0) > 0
    )

    // 6. Construir prompt para Claude
    const prompt = `Eres el motor de análisis de Lumio, una plataforma de inteligencia de negocio para PyMEs latinoamericanas.

Analiza los siguientes datos de la semana ${weekNumber} del año ${year} y genera un informe ejecutivo en español para el dueño del negocio.

## DATOS DE LA SEMANA

### Ventas
- Total ventas: $${totalSales.toFixed(2)}
- Número de transacciones: ${totalTransactions}
- Promedio líneas por pedido (LPP): ${avgLPP.toFixed(1)}
- Total descuentos: $${sales.reduce((s, r) => s + (r.discount_amount ?? 0), 0).toFixed(2)}

### Pautas Publicitarias
- Inversión total: $${totalAdSpend.toFixed(2)}
- ROAS promedio: ${avgROAS.toFixed(2)}
- Leads generados: ${ads.reduce((s, a) => s + (a.leads_count ?? 0), 0)}
- Plataformas activas: ${[...new Set(ads.map((a) => a.platform))].join(', ') || 'ninguna'}

### Inventario
- Total productos activos: ${products.length}
- Productos con stock bajo: ${lowStockProducts.length}
${lowStockProducts.length > 0 ? `- Productos críticos: ${lowStockProducts.slice(0, 3).map((p) => p.name).join(', ')}` : ''}

### Finanzas
- Saldo total en cuentas: $${totalBalance.toFixed(2)}
- Egresos de la semana: $${totalExpenses.toFixed(2)}
- Días de caja estimados: ${totalExpenses > 0 ? Math.floor(totalBalance / (totalExpenses / 7)) : 'N/A'}

## INSTRUCCIONES

Genera el análisis en formato JSON con exactamente esta estructura. NO incluyas texto fuera del JSON:

{
  "executive_summary": "Párrafo de 3-4 oraciones con los hallazgos más importantes de la semana. Sé específico con los números. Tono directo y ejecutivo.",
  "insight_sales": "Análisis de 2-3 párrafos sobre el desempeño de ventas. Incluye observaciones sobre transacciones, LPP y descuentos.",
  "insight_campaigns": "Análisis de 2-3 párrafos sobre pautas publicitarias. Evalúa ROAS, eficiencia de inversión y recomendaciones.",
  "insight_inventory": "Análisis de 1-2 párrafos sobre el estado del inventario. Menciona productos críticos si los hay.",
  "insight_finance": "Análisis de 1-2 párrafos sobre la situación financiera. Evalúa días de caja y flujo.",
  "playbook": [
    {
      "action": "Acción específica y concreta que debe tomar el dueño del negocio",
      "reason": "Por qué esta acción es importante basándose en los datos",
      "priority": "urgent",
      "timeframe": "hoy"
    }
  ]
}

El playbook debe tener entre 3 y 5 acciones priorizadas:
- priority "urgent" + timeframe "hoy": máximo 1 acción crítica
- priority "soon" + timeframe "esta semana": 1-2 acciones importantes
- priority "later" + timeframe "este mes": 1-2 acciones estratégicas

Si no hay datos suficientes en algún módulo, indícalo claramente en el análisis correspondiente y da recomendaciones generales.

Responde ÚNICAMENTE con el JSON válido, sin markdown, sin explicaciones adicionales.`

    // 7. Llamar a Claude API
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : ''

    // 8. Parsear respuesta JSON de Claude
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
      // Limpiar posibles backticks de markdown
      const cleaned = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      analysisData = JSON.parse(cleaned)
    } catch {
      return NextResponse.json(
        {
          error: 'Error procesando la respuesta de IA. Intenta de nuevo.',
        },
        { status: 500 }
      )
    }

    // 9. Guardar en Supabase (upsert — actualiza si ya existe)
    const { error: upsertError } = await supabase
      .from('ai_insights')
      .upsert(
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
        {
          onConflict: 'company_id,week_number,year',
        }
      )

    if (upsertError) {
      return NextResponse.json(
        { error: upsertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Análisis generado correctamente',
    })
  } catch (error) {
    console.error('Error generando insight:', error)
    return NextResponse.json(
      {
        error: 'Error interno del servidor. Intenta de nuevo.',
      },
      { status: 500 }
    )
  }
}
