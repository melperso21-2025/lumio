import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyId } from '@/lib/queries/getUser'
import Topbar from '@/components/layout/Topbar'
import KpiCard from '@/components/ui/KpiCard'
import AiInsightBox from '@/components/ui/AiInsightBox'
import ProfitLossExportButton from '@/components/profit-loss/ProfitLossExportButton'
import { getDefaultDateRange, getPreviousPeriodRolling } from '@/lib/dateUtils'

// ── Etiquetas de categorías de gastos ──────────────────────────
const catLabels: Record<string, string> = {
  payroll:   'Nómina',
  marketing: 'Marketing',
  supplier:  'Proveedores',
  rent:      'Arriendo',
  utilities: 'Servicios',
  taxes:     'Impuestos',
  logistics: 'Logística',
  other:     'Otros',
}

function fmtPgAmount(n: number): string {
  return Math.round(n).toLocaleString('es-EC', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function calcDelta(current: number, prev: number): number | null {
  if (prev === 0) return null
  return Math.round(((current - prev) / Math.abs(prev)) * 100)
}

// ── Fila del estado de resultados con columna comparativa ────────
function PGRow({
  label,
  value,
  prevValue,
  delta,
  valueStyle,
  invertDelta = false,
}: {
  label: string
  value: string
  prevValue?: string
  delta?: number | null
  valueStyle?: React.CSSProperties
  /** Para gastos: un delta positivo (más gasto) es malo → invertir color */
  invertDelta?: boolean
}) {
  const showDelta = delta !== null && delta !== undefined
  const isPositive = invertDelta ? (delta ?? 0) < 0 : (delta ?? 0) > 0
  const deltaColor = showDelta
    ? delta === 0 ? 'var(--muted)' : isPositive ? 'var(--green)' : 'var(--red)'
    : 'var(--muted)'

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto',
        alignItems: 'center',
        gap: 8,
        padding: '7px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--text2)' }}>{label}</span>

      {/* Período anterior */}
      <span style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right', minWidth: 72, fontVariantNumeric: 'tabular-nums' }}>
        {prevValue ?? '—'}
      </span>

      {/* Valor actual + delta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end', minWidth: 90 }}>
        <span
          style={{
            fontSize: 13,
            fontFamily: 'var(--font-syne)',
            fontWeight: 600,
            color: 'var(--text)',
            fontVariantNumeric: 'tabular-nums',
            ...valueStyle,
          }}
        >
          {value}
        </span>
        {showDelta && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: 4,
              background: isPositive ? 'rgba(5,150,105,0.1)' : delta === 0 ? 'var(--hover)' : 'rgba(220,38,38,0.08)',
              color: deltaColor,
              whiteSpace: 'nowrap',
            }}
          >
            {(delta ?? 0) > 0 ? '+' : ''}{delta}%
          </span>
        )}
      </div>
    </div>
  )
}

// ── Encabezado de columnas comparativas ─────────────────────────
function PGColumnHeader({ prevLabel }: { prevLabel: string }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto',
        gap: 8,
        paddingBottom: 6,
        borderBottom: '2px solid var(--border)',
        marginBottom: 2,
      }}
    >
      <span style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }} />
      <span style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'right', minWidth: 72 }}>
        {prevLabel}
      </span>
      <span style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'right', minWidth: 90 }}>
        Actual
      </span>
    </div>
  )
}

// ── Helpers de cálculo ───────────────────────────────────────────

function calcMetrics(
  sales: { gross_total: number | null; production_cost: number | null; discount_amount: number | null }[],
  transactions: { amount: number | null; category: string | null; is_fixed: boolean | null; type: string | null }[],
  ads: { spend: number | null; attributed_revenue: number | null }[]
) {
  const gross_revenue    = sales.reduce((s, r) => s + (r.gross_total ?? 0), 0)
  const total_discounts  = sales.reduce((s, r) => s + (r.discount_amount ?? 0), 0)
  const net_revenue      = gross_revenue - total_discounts
  const cost_of_goods    = sales.reduce((s, r) => s + (r.production_cost ?? 0), 0)
  const gross_profit     = net_revenue - cost_of_goods
  const gross_margin_pct = net_revenue > 0 ? (gross_profit / net_revenue) * 100 : 0

  const operating_expenses = transactions
    .filter((t) => t.type === 'expense' && t.category !== 'marketing')
    .reduce((s, t) => s + (t.amount ?? 0), 0)

  const expensesByCategory = transactions
    .filter((t) => t.type === 'expense' && t.category !== 'marketing')
    .reduce((acc, t) => {
      const cat = t.category ?? 'other'
      acc[cat] = (acc[cat] ?? 0) + (t.amount ?? 0)
      return acc
    }, {} as Record<string, number>)

  const fixed_expenses    = transactions
    .filter((t) => t.type === 'expense' && t.is_fixed && t.category !== 'marketing')
    .reduce((s, t) => s + (t.amount ?? 0), 0)
  const variable_expenses = operating_expenses - fixed_expenses

  const ad_spend     = ads.reduce((s, a) => s + (a.spend ?? 0), 0)
  const ad_revenue   = ads.reduce((s, a) => s + (a.attributed_revenue ?? 0), 0)
  const avg_roas     = ad_spend > 0 ? ad_revenue / ad_spend : 0

  const contribution_margin     = gross_profit - ad_spend
  const contribution_margin_pct = net_revenue > 0 ? (contribution_margin / net_revenue) * 100 : 0
  const total_expenses_all      = operating_expenses + ad_spend
  const ebitda                  = gross_profit - total_expenses_all
  const net_margin_pct          = net_revenue > 0 ? (ebitda / net_revenue) * 100 : 0

  return {
    gross_revenue, total_discounts, net_revenue, cost_of_goods,
    gross_profit, gross_margin_pct, operating_expenses, expensesByCategory,
    fixed_expenses, variable_expenses, ad_spend, ad_revenue, avg_roas,
    contribution_margin, contribution_margin_pct, total_expenses_all,
    ebitda, net_margin_pct,
  }
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

  const [
    { data: salesData },
    { data: expensesData },
    { data: adsData },
    { data: prevSalesData },
    { data: prevExpensesData },
    { data: prevAdsData },
  ] = await Promise.all([
    supabase.from('sales').select('gross_total, production_cost, discount_amount')
      .eq('company_id', companyId).is('deleted_at', null).neq('status', 'cancelled')
      .gte('sale_date', from).lte('sale_date', to),
    supabase.from('bank_transactions').select('amount, category, concept, is_fixed, type')
      .eq('company_id', companyId).gte('tx_date', from).lte('tx_date', to),
    supabase.from('ad_campaigns').select('spend, attributed_revenue, roas')
      .eq('company_id', companyId).is('deleted_at', null).gte('campaign_date', from).lte('campaign_date', to),
    supabase.from('sales').select('gross_total, production_cost, discount_amount')
      .eq('company_id', companyId).is('deleted_at', null).neq('status', 'cancelled')
      .gte('sale_date', prevFrom).lte('sale_date', prevTo),
    supabase.from('bank_transactions').select('amount, category, concept, is_fixed, type')
      .eq('company_id', companyId).gte('tx_date', prevFrom).lte('tx_date', prevTo),
    supabase.from('ad_campaigns').select('spend, attributed_revenue, roas')
      .eq('company_id', companyId).is('deleted_at', null).gte('campaign_date', prevFrom).lte('campaign_date', prevTo),
  ])

  const cur  = calcMetrics(salesData ?? [], expensesData ?? [], adsData ?? [])
  const prev = calcMetrics(prevSalesData ?? [], prevExpensesData ?? [], prevAdsData ?? [])
  const hasPrev = (prevSalesData?.length ?? 0) > 0 || (prevExpensesData?.length ?? 0) > 0

  const fmt   = (n: number) => `$ ${fmtPgAmount(n)}`
  const fmtPct = (n: number) => `${n.toFixed(1)}%`
  const p     = hasPrev ? prev : null

  const pygExportData = [
    { Concepto: 'Ventas brutas',          'Período actual': cur.gross_revenue,    'Período anterior': p?.gross_revenue },
    { Concepto: 'Descuentos',             'Período actual': -cur.total_discounts,  'Período anterior': p ? -p.total_discounts : undefined },
    { Concepto: 'Ventas netas',           'Período actual': cur.net_revenue,       'Período anterior': p?.net_revenue },
    { Concepto: 'Costo de ventas',        'Período actual': -cur.cost_of_goods,    'Período anterior': p ? -p.cost_of_goods : undefined },
    { Concepto: 'Margen bruto',           'Período actual': cur.gross_profit,      'Período anterior': p?.gross_profit },
    { Concepto: 'Inversión publicitaria', 'Período actual': -cur.ad_spend,         'Período anterior': p ? -p.ad_spend : undefined },
    { Concepto: 'Gastos operativos',      'Período actual': -cur.operating_expenses,'Período anterior': p ? -p.operating_expenses : undefined },
    { Concepto: 'EBITDA',                 'Período actual': cur.ebitda,            'Período anterior': p?.ebitda },
    { Concepto: 'Margen neto %',          'Período actual': cur.net_margin_pct,    'Período anterior': p?.net_margin_pct },
  ]

  const prevLabel = `${prevFrom} → ${prevTo}`
  const rangeLabel = `${from} → ${to}`

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

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Resumen IA */}
        <AiInsightBox
          variant={cur.ebitda >= 0 ? 'green' : 'red'}
          title={cur.ebitda >= 0 ? `✓ Resultado positivo — ${rangeLabel}` : `⚠ Resultado negativo — ${rangeLabel}`}
          text={`Ingresos netos: $${fmtPgAmount(cur.net_revenue)} · Gastos totales: $${fmtPgAmount(cur.total_expenses_all)} · ${
            cur.ebitda >= 0
              ? `Ganancia: $${fmtPgAmount(cur.ebitda)} (margen ${cur.net_margin_pct.toFixed(1)}%)`
              : `Pérdida: $${fmtPgAmount(Math.abs(cur.ebitda))}. Revisa tus gastos operativos y considera aumentar ingresos.`
          }${hasPrev ? ` · Vs período anterior: resultado ${p!.ebitda >= 0 ? '+' : ''}$${fmtPgAmount(cur.ebitda - p!.ebitda)}` : ''}`}
        />

        {/* KPIs con deltas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          <KpiCard
            label="Ingresos netos"
            prefix="$"
            value={Math.round(cur.net_revenue)}
            isGold
            delta={hasPrev ? calcDelta(cur.net_revenue, prev.net_revenue) ?? undefined : undefined}
            compare={hasPrev ? `Ant: $${fmtPgAmount(prev.net_revenue)}` : undefined}
          />
          <KpiCard
            label="Margen bruto"
            suffix="%"
            value={cur.gross_margin_pct.toFixed(1)}
            delta={hasPrev ? calcDelta(cur.gross_margin_pct, prev.gross_margin_pct) ?? undefined : undefined}
            compare={hasPrev ? `Ant: ${prev.gross_margin_pct.toFixed(1)}%` : undefined}
          />
          <KpiCard
            label="Margen contribución"
            suffix="%"
            value={cur.contribution_margin_pct.toFixed(1)}
            compare={hasPrev ? `Ant: ${prev.contribution_margin_pct.toFixed(1)}%` : `$${fmtPgAmount(cur.contribution_margin)}`}
            delta={hasPrev ? calcDelta(cur.contribution_margin_pct, prev.contribution_margin_pct) ?? undefined : undefined}
          />
          <KpiCard
            label="Gastos totales"
            prefix="$"
            value={Math.round(cur.total_expenses_all)}
            delta={hasPrev ? calcDelta(cur.total_expenses_all, prev.total_expenses_all) ?? undefined : undefined}
            compare={hasPrev ? `Ant: $${fmtPgAmount(prev.total_expenses_all)}` : undefined}
          />
          {cur.ebitda >= 0 ? (
            <KpiCard
              label="Resultado neto"
              prefix="$"
              value={Math.round(cur.ebitda)}
              isGold
              delta={hasPrev ? calcDelta(cur.ebitda, prev.ebitda) ?? undefined : undefined}
              compare={hasPrev ? `Ant: $${fmtPgAmount(prev.ebitda)}` : undefined}
            />
          ) : (
            <div className="group relative rounded-[10px]" style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '14px 16px' }}>
              <div className="uppercase mb-1.5 font-semibold" style={{ fontSize: 9, letterSpacing: '0.1em', color: 'var(--muted)' }}>
                Resultado neto
              </div>
              <div className="font-syne font-bold" style={{ fontSize: 22, color: 'var(--red)' }}>
                $ {fmtPgAmount(cur.ebitda)}
              </div>
              {hasPrev && (
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                  Ant: $ {fmtPgAmount(prev.ebitda)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Grid 3 columnas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>

          {/* Columna 1 — Ingresos */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div className="font-syne font-bold" style={{ fontSize: 14, color: 'var(--text)', marginBottom: 10 }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', marginRight: 8, verticalAlign: 'middle' }} />
              Ingresos
            </div>
            {hasPrev && <PGColumnHeader prevLabel={prevLabel} />}

            <PGRow label="Ventas brutas"     value={fmt(cur.gross_revenue)}   prevValue={p ? fmt(p.gross_revenue)   : undefined} delta={p ? calcDelta(cur.gross_revenue,   p.gross_revenue)   : undefined} />
            <PGRow label="(-) Descuentos"    value={`-$ ${fmtPgAmount(cur.total_discounts)}`}  prevValue={p ? `-$ ${fmtPgAmount(p.total_discounts)}` : undefined}  delta={p ? calcDelta(cur.total_discounts,  p.total_discounts)  : undefined} valueStyle={{ color: 'var(--red)' }} invertDelta />
            <div style={{ borderBottom: '1px solid var(--border)', margin: '4px 0' }} />
            <PGRow label="Ingresos netos"    value={fmt(cur.net_revenue)}     prevValue={p ? fmt(p.net_revenue)     : undefined} delta={p ? calcDelta(cur.net_revenue,     p.net_revenue)     : undefined} valueStyle={{ color: 'var(--gold)', fontSize: 15 }} />
            <PGRow label="(-) Costo ventas"  value={`-$ ${fmtPgAmount(cur.cost_of_goods)}`}    prevValue={p ? `-$ ${fmtPgAmount(p.cost_of_goods)}` : undefined}    delta={p ? calcDelta(cur.cost_of_goods,    p.cost_of_goods)    : undefined} valueStyle={{ color: 'var(--red)' }} invertDelta />
            <div style={{ borderBottom: '1px solid var(--border)', margin: '4px 0' }} />
            <PGRow label="Ganancia bruta"    value={fmt(cur.gross_profit)}    prevValue={p ? fmt(p.gross_profit)    : undefined} delta={p ? calcDelta(cur.gross_profit,    p.gross_profit)    : undefined} valueStyle={{ color: cur.gross_profit >= 0 ? 'var(--green)' : 'var(--red)' }} />
            <PGRow label="(-) Inv. publicitaria" value={`-$ ${fmtPgAmount(cur.ad_spend)}`}  prevValue={p ? `-$ ${fmtPgAmount(p.ad_spend)}` : undefined}  delta={p ? calcDelta(cur.ad_spend, p.ad_spend) : undefined} valueStyle={{ color: 'var(--orange)' }} invertDelta />
            <PGRow label="Margen contribución" value={fmt(cur.contribution_margin)} prevValue={p ? fmt(p.contribution_margin) : undefined} delta={p ? calcDelta(cur.contribution_margin, p.contribution_margin) : undefined} valueStyle={{ color: cur.contribution_margin >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }} />
            <PGRow label="Margen contrib. %" value={fmtPct(cur.contribution_margin_pct)} prevValue={p ? fmtPct(p.contribution_margin_pct) : undefined} delta={p ? calcDelta(cur.contribution_margin_pct, p.contribution_margin_pct) : undefined} valueStyle={{ color: 'var(--muted)', fontSize: 11 }} />
            <PGRow label="Margen bruto %"    value={fmtPct(cur.gross_margin_pct)}        prevValue={p ? fmtPct(p.gross_margin_pct) : undefined}        delta={p ? calcDelta(cur.gross_margin_pct, p.gross_margin_pct) : undefined}        valueStyle={{ color: 'var(--muted)', fontSize: 11 }} />
          </div>

          {/* Columna 2 — Gastos operativos */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div className="font-syne font-bold" style={{ fontSize: 14, color: 'var(--text)', marginBottom: 10 }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', marginRight: 8, verticalAlign: 'middle' }} />
              Gastos operativos
            </div>
            {hasPrev && <PGColumnHeader prevLabel={prevLabel} />}

            <PGRow label="Gastos fijos"     value={fmt(cur.fixed_expenses)}    prevValue={p ? fmt(p.fixed_expenses)    : undefined} delta={p ? calcDelta(cur.fixed_expenses,    p.fixed_expenses)    : undefined} valueStyle={{ color: 'var(--red)' }} invertDelta />
            <PGRow label="Gastos variables" value={fmt(cur.variable_expenses)} prevValue={p ? fmt(p.variable_expenses) : undefined} delta={p ? calcDelta(cur.variable_expenses, p.variable_expenses) : undefined} valueStyle={{ color: 'var(--orange)' }} invertDelta />
            <div style={{ borderBottom: '1px solid var(--border)', margin: '4px 0' }} />
            <PGRow label="Total operativo"  value={fmt(cur.operating_expenses)} prevValue={p ? fmt(p.operating_expenses) : undefined} delta={p ? calcDelta(cur.operating_expenses, p.operating_expenses) : undefined} valueStyle={{ fontWeight: 700 }} invertDelta />

            {Object.entries(cur.expensesByCategory)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, amount]) => (
                <PGRow
                  key={cat}
                  label={catLabels[cat] ?? cat}
                  value={fmt(amount)}
                  prevValue={p?.expensesByCategory[cat] !== undefined ? fmt(p.expensesByCategory[cat]!) : '$ 0'}
                  delta={p ? calcDelta(amount, p.expensesByCategory[cat] ?? 0) : undefined}
                  valueStyle={{ color: 'var(--text2)', fontSize: 11 }}
                  invertDelta
                />
              ))}
          </div>

          {/* Columna 3 — Publicidad & Resultado */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div className="font-syne font-bold" style={{ fontSize: 14, color: 'var(--text)', marginBottom: 10 }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', marginRight: 8, verticalAlign: 'middle' }} />
              Publicidad & Resultado
            </div>
            {hasPrev && <PGColumnHeader prevLabel={prevLabel} />}

            <PGRow label="Inversión pauta"          value={fmt(cur.ad_spend)}    prevValue={p ? fmt(p.ad_spend)    : undefined} delta={p ? calcDelta(cur.ad_spend,    p.ad_spend)    : undefined} invertDelta />
            <PGRow label="Ventas atribuidas (pauta)" value={fmt(cur.ad_revenue)} prevValue={p ? fmt(p.ad_revenue) : undefined} delta={p ? calcDelta(cur.ad_revenue, p.ad_revenue) : undefined} valueStyle={{ color: 'var(--green)' }} />
            <div style={{ fontSize: 10, color: 'var(--muted)', padding: '4px 0 8px', borderBottom: '1px solid var(--border)' }}>
              * Revenue atribuido a campañas — puede solaparse con ventas brutas registradas
            </div>
            <PGRow
              label="ROAS"
              value={`${cur.avg_roas.toFixed(2)}x`}
              prevValue={p ? `${p.avg_roas.toFixed(2)}x` : undefined}
              delta={p ? calcDelta(cur.avg_roas, p.avg_roas) : undefined}
              valueStyle={{ color: 'var(--gold)', fontWeight: 700 }}
            />

            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                RESULTADO FINAL
              </div>
              <PGRow label="(-) Gastos totales" value={fmt(cur.total_expenses_all)} prevValue={p ? fmt(p.total_expenses_all) : undefined} delta={p ? calcDelta(cur.total_expenses_all, p.total_expenses_all) : undefined} valueStyle={{ color: 'var(--red)' }} invertDelta />
              <div style={{ borderBottom: '1px solid var(--border)', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0 4px' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>RESULTADO NETO</span>
                <span className="font-syne font-bold" style={{ fontSize: 18, color: cur.ebitda >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  $ {fmtPgAmount(cur.ebitda)}
                </span>
              </div>
              {hasPrev && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>Ant: $ {fmtPgAmount(prev.ebitda)}</span>
                </div>
              )}
              <PGRow label="Margen neto contable" value={fmtPct(cur.net_margin_pct)} prevValue={p ? fmtPct(p.net_margin_pct) : undefined} delta={p ? calcDelta(cur.net_margin_pct, p.net_margin_pct) : undefined} valueStyle={{ color: 'var(--muted)', fontSize: 11 }} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
