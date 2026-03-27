import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import KpiCard from '@/components/ui/KpiCard'
import AiInsightBox from '@/components/ui/AiInsightBox'
import getDefaultDateRange from '@/components/ui/DateRangePicker'

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
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const companyId = userData?.company_id
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  const from = params.from ?? monday.toISOString().slice(0, 10)
  const to = params.to ?? now.toISOString().slice(0, 10)

  if (!companyId) {
    return (
      <>
        <Topbar 
          pageTitle="P&G" 
          pageSubtitle={`${from} → ${to}`}
          showPeriodSelector
          showExportButton
        />
        <div style={{ padding: 20 }}>
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

  const operating_expenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + (t.amount ?? 0), 0)

  const expensesByCategory = transactions
    .filter((t) => t.type === 'expense')
    .reduce(
      (acc, t) => {
        const cat = t.category ?? 'other'
        acc[cat] = (acc[cat] ?? 0) + (t.amount ?? 0)
        return acc
      },
      {} as Record<string, number>
    )

  const fixed_expenses = transactions
    .filter((t) => t.type === 'expense' && t.is_fixed)
    .reduce((s, t) => s + (t.amount ?? 0), 0)
  const variable_expenses = operating_expenses - fixed_expenses

  const ad_spend = ads.reduce((s, a) => s + (a.spend ?? 0), 0)
  const ad_revenue = ads.reduce((s, a) => s + (a.attributed_revenue ?? 0), 0)
  const avg_roas = ad_spend > 0 ? ad_revenue / ad_spend : 0

  const total_expenses_all = operating_expenses + ad_spend
  const ebitda = gross_profit - total_expenses_all
  const net_margin_pct =
    net_revenue > 0 ? (ebitda / net_revenue) * 100 : 0

  const rangeLabel = `${from} → ${to}`

  return (
    <>
      <Topbar
        pageTitle="P&G"
        pageSubtitle={`${from} → ${to}`}
        showPeriodSelector
        showExportButton
      />

      <div
        style={{
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
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
          text={`Ingresos netos: $${net_revenue.toFixed(2)} · Gastos totales: $${total_expenses_all.toFixed(2)} · ${
            ebitda >= 0
              ? `Ganancia: $${ebitda.toFixed(2)} (margen ${net_margin_pct.toFixed(1)}%)`
              : `Pérdida: $${Math.abs(ebitda).toFixed(2)}. Revisa tus gastos operativos y considera aumentar ingresos.`
          }`}
        />

        {/* Grid 4 KpiCards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
          }}
        >
          <KpiCard
            label="Ingresos netos"
            prefix="$"
            value={net_revenue.toFixed(2)}
            isGold
          />
          <KpiCard
            label="Margen bruto"
            suffix="%"
            value={gross_margin_pct.toFixed(1)}
          />
          <KpiCard
            label="Gastos totales"
            prefix="$"
            value={total_expenses_all.toFixed(2)}
          />
          {ebitda >= 0 ? (
            <KpiCard
              label="Resultado neto"
              prefix="$"
              value={ebitda.toFixed(2)}
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
                $ {ebitda.toFixed(2)}
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
              padding: 20,
            }}
          >
            <div
              className="font-syne font-bold"
              style={{ fontSize: 14, color: 'var(--text)', marginBottom: 16 }}
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
              value={`$ ${net_revenue.toLocaleString('es-EC')}`}
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
              padding: 20,
            }}
          >
            <div
              className="font-syne font-bold"
              style={{ fontSize: 14, color: 'var(--text)', marginBottom: 16 }}
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
              padding: 20,
            }}
          >
            <div
              className="font-syne font-bold"
              style={{ fontSize: 14, color: 'var(--text)', marginBottom: 16 }}
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
              label="Ventas atribuidas"
              value={`$ ${ad_revenue.toLocaleString('es-EC')}`}
              valueStyle={{ color: 'var(--green)' }}
            />
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
                value={`$ ${total_expenses_all.toLocaleString('es-EC')}`}
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
                  $ {ebitda.toLocaleString('es-EC')}
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
