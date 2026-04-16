import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyId } from '@/lib/queries/getUser'
import Topbar from '@/components/layout/Topbar'
import KpiCard from '@/components/ui/KpiCard'
import AiInsightBox from '@/components/ui/AiInsightBox'
import ProfitLossExportButton from '@/components/profit-loss/ProfitLossExportButton'
import { getDefaultDateRange } from '@/lib/dateUtils'

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

/** Montos P&G sin decimales (redondeo estándar), formato es-EC */
function fmtPgAmount(n: number): string {
  return Math.round(n).toLocaleString('es-EC', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

// ── Componente fila del estado financiero ───────────────────────
function PGRow({
  label,
  value,
  valueStyle,
}: {
  label: string
  value: string
  valueStyle?: React.CSSProperties
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--text2)' }}>{label}</span>
      <span
        style={{
          fontSize: 13,
          fontFamily: 'var(--font-syne)',
          fontWeight: 600,
          color: 'var(--text)',
          ...valueStyle,
        }}
      >
        {value}
      </span>
    </div>
  )
}

export default async function ProfitLossPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const params = await searchParams
  const companyId = await getCompanyId()
  if (!companyId) redirect('/login')

  const supabase = await createClient()
  const defaults = getDefaultDateRange()
  const from = params.from ?? defaults.from
  const to = params.to ?? defaults.to

  if (!companyId) {
    return (
      <>
        <Topbar
          pageTitle="P&G"
          pageSubtitle={`${from} → ${to}`}
          showPeriodSelector
        />
        <div style={{ padding: '14px 16px' }}>
          <p
            style={{
              fontFamily: 'var(--font-syne)',
              color: 'var(--muted)',
              fontSize: 14,
            }}
          >
            No tienes una empresa asignada.
          </p>
        </div>
      </>
    )
  }

  const { data: salesData } = await supabase
    .from('sales')
    .select('gross_total, production_cost, discount_amount')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .neq('status', 'cancelled')
    .gte('sale_date', from)
    .lte('sale_date', to)

  const { data: expensesData } = await supabase
    .from('bank_transactions')
    .select('amount, category, concept, is_fixed, type')
    .eq('company_id', companyId)
    .gte('tx_date', from)
    .lte('tx_date', to)

  const { data: adsData } = await supabase
    .from('ad_campaigns')
    .select('spend, attributed_revenue, roas')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .gte('campaign_date', from)
    .lte('campaign_date', to)

  const sales = salesData ?? []
  const transactions = expensesData ?? []
  const ads = adsData ?? []

  const gross_revenue = sales.reduce((s, r) => s + (r.gross_total ?? 0), 0)
  const total_discounts = sales.reduce((s, r) => s + (r.discount_amount ?? 0), 0)
  const net_revenue = gross_revenue - total_discounts

  const cost_of_goods = sales.reduce((s, r) => s + (r.production_cost ?? 0), 0)
  const gross_profit = net_revenue - cost_of_goods
  const gross_margin_pct =
    net_revenue > 0 ? (gross_profit / net_revenue) * 100 : 0

  // Excluye marketing en bank_tx: la inversión publicitaria oficial es ad_campaigns (evita doble conteo con ad_spend)
  const operating_expenses = transactions
    .filter((t) => t.type === 'expense' && t.category !== 'marketing')
    .reduce((s, t) => s + (t.amount ?? 0), 0)

  const expensesByCategory = transactions
    .filter((t) => t.type === 'expense' && t.category !== 'marketing')
    .reduce(
      (acc, t) => {
        const cat = t.category ?? 'other'
        acc[cat] = (acc[cat] ?? 0) + (t.amount ?? 0)
        return acc
      },
      {} as Record<string, number>
    )

  const fixed_expenses = transactions
    .filter(
      (t) =>
        t.type === 'expense' &&
        t.is_fixed &&
        t.category !== 'marketing'
    )
    .reduce((s, t) => s + (t.amount ?? 0), 0)
  const variable_expenses = operating_expenses - fixed_expenses

  const ad_spend = ads.reduce((s, a) => s + (a.spend ?? 0), 0)
  const ad_revenue = ads.reduce((s, a) => s + (a.attributed_revenue ?? 0), 0)
  const avg_roas = ad_spend > 0 ? ad_revenue / ad_spend : 0

  // Margen de contribución = ganancia bruta − publicidad (fuente única: ad_campaigns)
  const contribution_margin = gross_profit - ad_spend
  const contribution_margin_pct =
    net_revenue > 0 ? (contribution_margin / net_revenue) * 100 : 0

  const total_expenses_all = operating_expenses + ad_spend
  const ebitda = gross_profit - total_expenses_all
  const net_margin_pct =
    net_revenue > 0 ? (ebitda / net_revenue) * 100 : 0

  const pygExportData = [
    { Concepto: 'Ventas brutas', Monto: gross_revenue },
    { Concepto: 'Descuentos', Monto: -total_discounts },
    { Concepto: 'Ventas netas', Monto: net_revenue },
    { Concepto: 'Costo de ventas', Monto: -cost_of_goods },
    { Concepto: 'Margen bruto', Monto: gross_profit },
    { Concepto: 'Inversión publicitaria', Monto: -ad_spend },
    { Concepto: 'Gastos operativos', Monto: -operating_expenses },
    { Concepto: 'EBITDA', Monto: ebitda },
    { Concepto: 'Margen neto %', Monto: net_margin_pct },
  ]

  const rangeLabel = `${from} → ${to}`

  return (
    <>
      <Topbar
        pageTitle="P&G"
        pageSubtitle={`${from} → ${to}`}
        showPeriodSelector
        rightExtras={
          <ProfitLossExportButton
            data={pygExportData}
            from={from}
            to={to}
          />
        }
      />

      <div
        style={{
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {/* AiInsightBox resumen */}
        <AiInsightBox
          variant={ebitda >= 0 ? 'green' : 'red'}
          title={
            ebitda >= 0
              ? `✓ Resultado positivo — ${rangeLabel}`
              : `⚠ Resultado negativo — ${rangeLabel}`
          }
          text={`Ingresos netos: $${fmtPgAmount(net_revenue)} · Gastos totales: $${fmtPgAmount(total_expenses_all)} · ${
            ebitda >= 0
              ? `Ganancia: $${fmtPgAmount(ebitda)} (margen ${net_margin_pct.toFixed(1)}%)`
              : `Pérdida: $${fmtPgAmount(Math.abs(ebitda))}. Revisa tus gastos operativos y considera aumentar ingresos.`
          }`}
        />

        {/* Grid KPIs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 8,
          }}
        >
          <KpiCard
            label="Ingresos netos"
            prefix="$"
            value={Math.round(net_revenue)}
            isGold
          />
          <KpiCard
            label="Margen bruto"
            suffix="%"
            value={gross_margin_pct.toFixed(1)}
          />
          <KpiCard
            label="Margen contribución"
            suffix="%"
            value={contribution_margin_pct.toFixed(1)}
            compare={`$${contribution_margin.toLocaleString('es-EC', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}`}
          />
          <KpiCard
            label="Gastos totales"
            prefix="$"
            value={Math.round(total_expenses_all)}
          />
          {ebitda >= 0 ? (
            <KpiCard
              label="Resultado neto"
              prefix="$"
              value={Math.round(ebitda)}
              isGold
            />
          ) : (
            <div
              className="group relative rounded-[10px] transition-colors duration-150"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                padding: '14px 16px',
              }}
            >
              <div
                className="uppercase mb-1.5 font-semibold"
                style={{
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  color: 'var(--muted)',
                }}
              >
                Resultado neto
              </div>
              <div
                className="font-syne font-bold"
                style={{
                  fontSize: 22,
                  color: 'var(--red)',
                }}
              >
                $ {fmtPgAmount(ebitda)}
              </div>
            </div>
          )}
        </div>

        {/* Grid 3 columnas — detalle del P&G */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
          }}
        >
          {/* Columna 1 — Ingresos */}
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '14px 16px',
            }}
          >
            <div
              className="font-syne font-bold"
              style={{ fontSize: 14, color: 'var(--text)', marginBottom: 12 }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--green)',
                  marginRight: 8,
                  verticalAlign: 'middle',
                }}
              />
              Ingresos
            </div>

            <PGRow
              label="Ventas brutas"
              value={`$ ${gross_revenue.toLocaleString('es-EC')}`}
            />
            <PGRow
              label="(-) Descuentos"
              value={`-$ ${total_discounts.toLocaleString('es-EC')}`}
              valueStyle={{ color: 'var(--red)' }}
            />
            <div style={{ borderBottom: '1px solid var(--border)', margin: '4px 0' }} />
            <PGRow
              label="Ingresos netos"
              value={`$ ${fmtPgAmount(net_revenue)}`}
              valueStyle={{ color: 'var(--gold)', fontSize: 15 }}
            />
            <PGRow
              label="(-) Costo ventas"
              value={`-$ ${cost_of_goods.toLocaleString('es-EC')}`}
              valueStyle={{ color: 'var(--red)' }}
            />
            <div style={{ borderBottom: '1px solid var(--border)', margin: '4px 0' }} />
            <PGRow
              label="Ganancia bruta"
              value={`$ ${gross_profit.toLocaleString('es-EC')}`}
              valueStyle={{
                color: gross_profit >= 0 ? 'var(--green)' : 'var(--red)',
              }}
            />
            <PGRow
              label="(-) Inversión publicitaria"
              value={`-$ ${ad_spend.toLocaleString('es-EC', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
              valueStyle={{ color: 'var(--orange)' }}
            />
            <PGRow
              label="Margen de contribución"
              value={`$ ${contribution_margin.toLocaleString('es-EC', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
              valueStyle={{
                color: contribution_margin >= 0 ? 'var(--green)' : 'var(--red)',
                fontWeight: 700,
              }}
            />
            <PGRow
              label="Margen contribución %"
              value={`${contribution_margin_pct.toFixed(1)}%`}
              valueStyle={{ color: 'var(--muted)', fontSize: 11 }}
            />
            <PGRow
              label="Margen bruto"
              value={`${gross_margin_pct.toFixed(1)}%`}
              valueStyle={{ color: 'var(--muted)', fontSize: 11 }}
            />
          </div>

          {/* Columna 2 — Gastos operativos */}
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '14px 16px',
            }}
          >
            <div
              className="font-syne font-bold"
              style={{ fontSize: 14, color: 'var(--text)', marginBottom: 12 }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--red)',
                  marginRight: 8,
                  verticalAlign: 'middle',
                }}
              />
              Gastos operativos
            </div>

            <PGRow
              label="Gastos fijos"
              value={`$ ${fixed_expenses.toLocaleString('es-EC')}`}
              valueStyle={{ color: 'var(--red)' }}
            />
            <PGRow
              label="Gastos variables"
              value={`$ ${variable_expenses.toLocaleString('es-EC')}`}
              valueStyle={{ color: 'var(--orange)' }}
            />
            <div style={{ borderBottom: '1px solid var(--border)', margin: '4px 0' }} />
            <PGRow
              label="Total operativo"
              value={`$ ${operating_expenses.toLocaleString('es-EC')}`}
              valueStyle={{ fontWeight: 700 }}
            />

            {Object.entries(expensesByCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, amount]) => (
                <PGRow
                  key={cat}
                  label={catLabels[cat] ?? cat}
                  value={`$ ${amount.toLocaleString('es-EC')}`}
                  valueStyle={{ color: 'var(--text2)', fontSize: 11 }}
                />
              ))}
          </div>

          {/* Columna 3 — Publicidad & Resultado */}
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '14px 16px',
            }}
          >
            <div
              className="font-syne font-bold"
              style={{ fontSize: 14, color: 'var(--text)', marginBottom: 12 }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--gold)',
                  marginRight: 8,
                  verticalAlign: 'middle',
                }}
              />
              Publicidad & Resultado
            </div>

            <PGRow
              label="Inversión pauta"
              value={`$ ${ad_spend.toLocaleString('es-EC')}`}
            />
            <PGRow
              label="Ventas atribuidas (pauta)"
              value={`$ ${ad_revenue.toLocaleString('es-EC')}`}
              valueStyle={{ color: 'var(--green)' }}
            />
            <div
              style={{
                fontSize: 10,
                color: 'var(--muted)',
                padding: '4px 0 8px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              * Revenue atribuido a campañas — puede solaparse con ventas brutas
              registradas
            </div>
            <PGRow
              label="ROAS"
              value={avg_roas.toFixed(2)}
              valueStyle={{ color: 'var(--gold)', fontWeight: 700 }}
            />

            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 8,
                }}
              >
                RESULTADO FINAL
              </div>
              <PGRow
                label="(-) Gastos totales"
                value={`$ ${fmtPgAmount(total_expenses_all)}`}
                valueStyle={{ color: 'var(--red)' }}
              />
              <div style={{ borderBottom: '1px solid var(--border)', margin: '4px 0' }} />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  RESULTADO NETO
                </span>
                <span
                  className="font-syne font-bold"
                  style={{
                    fontSize: 18,
                    color: ebitda >= 0 ? 'var(--green)' : 'var(--red)',
                  }}
                >
                  $ {fmtPgAmount(ebitda)}
                </span>
              </div>
              <PGRow
                label="Margen neto"
                value={`${net_margin_pct.toFixed(1)}%`}
                valueStyle={{ color: 'var(--muted)', fontSize: 11 }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
