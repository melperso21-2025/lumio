import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyId } from '@/lib/queries/getUser'
import Topbar from '@/components/layout/Topbar'
import ProfitLossExportButton from '@/components/profit-loss/ProfitLossExportButton'
import ProfitLossView, { type PGMetrics, type MonthlyPoint, type CampaignRow } from '@/components/profit-loss/ProfitLossView'
import { getDefaultDateRange, getPreviousPeriodRolling } from '@/lib/dateUtils'

export const dynamic = 'force-dynamic'

// ── Helpers de cálculo ───────────────────────────────────────────

function calcMetrics(
  sales: { gross_total: number | null; production_cost: number | null; discount_amount: number | null }[],
  transactions: { amount: number | null; category: string | null; is_fixed: boolean | null; type: string | null }[],
  ads: { spend: number | null; attributed_revenue: number | null }[]
): PGMetrics {
  const gross_revenue    = sales.reduce((s, r) => s + (r.gross_total ?? 0), 0)
  const total_discounts  = sales.reduce((s, r) => s + (r.discount_amount ?? 0), 0)
  const net_revenue      = gross_revenue - total_discounts
  const cost_of_goods    = sales.reduce((s, r) => s + (r.production_cost ?? 0), 0)
  const gross_profit     = net_revenue - cost_of_goods
  const gross_margin_pct = net_revenue > 0 ? (gross_profit / net_revenue) * 100 : 0

  const operating_expenses = transactions
    .filter(t => t.type === 'expense' && t.category !== 'marketing')
    .reduce((s, t) => s + (t.amount ?? 0), 0)

  const fixed_expenses = transactions
    .filter(t => t.type === 'expense' && t.is_fixed && t.category !== 'marketing')
    .reduce((s, t) => s + (t.amount ?? 0), 0)
  const variable_expenses = operating_expenses - fixed_expenses

  const ad_spend   = ads.reduce((s, a) => s + (a.spend ?? 0), 0)
  const ad_revenue = ads.reduce((s, a) => s + (a.attributed_revenue ?? 0), 0)
  const avg_roas   = ad_spend > 0 ? ad_revenue / ad_spend : 0

  const contribution_margin_pct = net_revenue > 0
    ? ((gross_profit - ad_spend) / net_revenue) * 100
    : 0
  const total_expenses_all = operating_expenses + ad_spend
  const ebitda             = gross_profit - total_expenses_all
  const net_margin_pct     = net_revenue > 0 ? (ebitda / net_revenue) * 100 : 0

  return {
    gross_revenue, total_discounts, net_revenue, cost_of_goods,
    gross_profit, gross_margin_pct, fixed_expenses, variable_expenses,
    operating_expenses, ad_spend, ad_revenue, avg_roas,
    contribution_margin_pct, total_expenses_all, ebitda, net_margin_pct,
  }
}

// ── Generación de rango de 6 meses completos ─────────────────────

function last6Months(): { key: string; label: string }[] {
  const now = new Date()
  const result: { key: string; label: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('es-EC', { month: 'short' })
    result.push({ key, label })
  }
  return result
}

export default async function ProfitLossPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const params    = await searchParams
  const companyId = await getCompanyId()
  if (!companyId) redirect('/login')

  const supabase = await createClient()
  const defaults = getDefaultDateRange()
  const from = params.from ?? defaults.from
  const to   = params.to   ?? defaults.to
  const { prevFrom, prevTo } = getPreviousPeriodRolling(from, to)

  // 6 meses históricos
  const months = last6Months()
  const histFrom = months[0].key + '-01'
  const histLastDay = new Date(
    parseInt(months[5].key.slice(0, 4)),
    parseInt(months[5].key.slice(5, 7)),
    0
  )
  const histTo = `${months[5].key}-${String(histLastDay.getDate()).padStart(2, '0')}`

  const [
    { data: salesData },
    { data: expensesData },
    { data: adsData },
    { data: prevSalesData },
    { data: prevExpensesData },
    { data: prevAdsData },
    { data: histSalesData },
    { data: histTxData },
    { data: histAdsData },
  ] = await Promise.all([
    // Período actual — ventas
    supabase.from('sales').select('gross_total, production_cost, discount_amount')
      .eq('company_id', companyId).is('deleted_at', null).neq('status', 'cancelled')
      .gte('sale_date', from).lte('sale_date', to),
    // Período actual — transacciones
    supabase.from('bank_transactions').select('amount, category, is_fixed, type')
      .eq('company_id', companyId).gte('tx_date', from).lte('tx_date', to),
    // Período actual — campañas (con detalle)
    supabase.from('ad_campaigns')
      .select('id, campaign_name, platform, spend, attributed_revenue, roas')
      .eq('company_id', companyId).is('deleted_at', null)
      .gte('campaign_date', from).lte('campaign_date', to),
    // Período anterior — ventas
    supabase.from('sales').select('gross_total, production_cost, discount_amount')
      .eq('company_id', companyId).is('deleted_at', null).neq('status', 'cancelled')
      .gte('sale_date', prevFrom).lte('sale_date', prevTo),
    // Período anterior — transacciones
    supabase.from('bank_transactions').select('amount, category, is_fixed, type')
      .eq('company_id', companyId).gte('tx_date', prevFrom).lte('tx_date', prevTo),
    // Período anterior — campañas
    supabase.from('ad_campaigns').select('spend, attributed_revenue, roas')
      .eq('company_id', companyId).is('deleted_at', null)
      .gte('campaign_date', prevFrom).lte('campaign_date', prevTo),
    // Histórico 6 meses — ventas
    supabase.from('sales').select('gross_total, production_cost, discount_amount, sale_date')
      .eq('company_id', companyId).is('deleted_at', null).neq('status', 'cancelled')
      .gte('sale_date', histFrom).lte('sale_date', histTo),
    // Histórico 6 meses — transacciones
    supabase.from('bank_transactions').select('amount, category, is_fixed, type, tx_date')
      .eq('company_id', companyId).gte('tx_date', histFrom).lte('tx_date', histTo),
    // Histórico 6 meses — campañas
    supabase.from('ad_campaigns').select('spend, attributed_revenue, campaign_date')
      .eq('company_id', companyId).is('deleted_at', null)
      .gte('campaign_date', histFrom).lte('campaign_date', histTo),
  ])

  const cur  = calcMetrics(salesData ?? [], expensesData ?? [], adsData ?? [])
  const prev = calcMetrics(prevSalesData ?? [], prevExpensesData ?? [], prevAdsData ?? [])
  const hasPrev = (prevSalesData?.length ?? 0) > 0 || (prevExpensesData?.length ?? 0) > 0

  // Datos mensuales históricos
  const monthlyData: MonthlyPoint[] = months.map(m => {
    const mSales = (histSalesData ?? []).filter(r => {
      const d = (r as { sale_date?: string }).sale_date
      return d?.startsWith(m.key)
    })
    const mTx = (histTxData ?? []).filter(r => {
      const d = (r as { tx_date?: string }).tx_date
      return d?.startsWith(m.key)
    })
    const mAds = (histAdsData ?? []).filter(r => {
      const d = (r as { campaign_date?: string }).campaign_date
      return d?.startsWith(m.key)
    })
    const mMetrics = calcMetrics(mSales as Parameters<typeof calcMetrics>[0], mTx as Parameters<typeof calcMetrics>[1], mAds as Parameters<typeof calcMetrics>[2])
    const roas = mMetrics.ad_spend > 0 ? mMetrics.avg_roas : null
    return { key: m.key, label: m.label, netResult: mMetrics.ebitda, roas }
  })

  // Campañas del período actual
  const campaigns: CampaignRow[] = (adsData ?? []).map(a => {
    const c = a as { id?: string; campaign_name?: string | null; platform?: string | null; spend?: number | null; attributed_revenue?: number | null; roas?: number | null }
    return {
      id: c.id ?? '',
      campaign_name: c.campaign_name ?? null,
      platform: c.platform ?? null,
      spend: c.spend ?? null,
      attributed_revenue: c.attributed_revenue ?? null,
      roas: c.roas ?? null,
    }
  })

  // Datos para exportar (compatible con formato anterior)
  const fmtN = (n: number) => Math.round(n)
  const pygExportData = [
    { Concepto: 'Ventas brutas',           'Período actual': fmtN(cur.gross_revenue),      'Período anterior': hasPrev ? fmtN(prev.gross_revenue)      : undefined },
    { Concepto: 'Descuentos',              'Período actual': -fmtN(cur.total_discounts),    'Período anterior': hasPrev ? -fmtN(prev.total_discounts)   : undefined },
    { Concepto: 'Ventas netas',            'Período actual': fmtN(cur.net_revenue),         'Período anterior': hasPrev ? fmtN(prev.net_revenue)        : undefined },
    { Concepto: 'Costo de ventas',         'Período actual': -fmtN(cur.cost_of_goods),      'Período anterior': hasPrev ? -fmtN(prev.cost_of_goods)     : undefined },
    { Concepto: 'Margen bruto',            'Período actual': fmtN(cur.gross_profit),        'Período anterior': hasPrev ? fmtN(prev.gross_profit)       : undefined },
    { Concepto: 'Inversión publicitaria',  'Período actual': -fmtN(cur.ad_spend),           'Período anterior': hasPrev ? -fmtN(prev.ad_spend)          : undefined },
    { Concepto: 'Gastos operativos',       'Período actual': -fmtN(cur.operating_expenses), 'Período anterior': hasPrev ? -fmtN(prev.operating_expenses): undefined },
    { Concepto: 'EBITDA',                  'Período actual': fmtN(cur.ebitda),              'Período anterior': hasPrev ? fmtN(prev.ebitda)             : undefined },
    { Concepto: 'Margen neto %',           'Período actual': cur.net_margin_pct,            'Período anterior': hasPrev ? prev.net_margin_pct           : undefined },
  ]

  return (
    <>
      <Topbar
        pageTitle="P&G"
        pageSubtitle={`${from} → ${to}`}
        showPeriodSelector
        rightExtras={
          <ProfitLossExportButton data={pygExportData} from={from} to={to} />
        }
      />

      <ProfitLossView
        cur={cur}
        prev={hasPrev ? prev : null}
        from={from}
        to={to}
        monthlyData={monthlyData}
        campaigns={campaigns}
      />
    </>
  )
}
