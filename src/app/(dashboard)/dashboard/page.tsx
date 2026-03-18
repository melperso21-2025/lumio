import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import KpiCard from '@/components/ui/KpiCard'
import AiInsightBox from '@/components/ui/AiInsightBox'
import RegisterSaleButton from '@/components/dashboard/RegisterSaleButton'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const companyId = userData?.company_id

  if (!companyId) {
    return (
      <>
        <Topbar pageTitle="Dashboard" pageSubtitle="Sin empresa asignada" />
        <div style={{ padding: 20 }}>
          <p
            style={{
              fontFamily: 'var(--font-syne)',
              color: 'var(--muted)',
              fontSize: 14,
            }}
          >
            No tienes una empresa asignada. Contacta a tu administrador.
          </p>
        </div>
      </>
    )
  }

  // ── Semana y año actual ──────────────────────────────────
  const now = new Date()
  const currentYear = now.getFullYear()
  const startOfYear = new Date(currentYear, 0, 1)
  const weekNumber = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 +
      startOfYear.getDay() +
      1) /
      7
  )

  // ── Snapshot semana actual ───────────────────────────────
  const { data: snap } = await supabase
    .from('weekly_snapshots')
    .select('*')
    .eq('company_id', companyId)
    .order('year', { ascending: false })
    .order('week_number', { ascending: false })
    .limit(1)
    .single()

  // ── Snapshot semana anterior (para deltas) ───────────────
  const { data: prevSnap } = await supabase
    .from('weekly_snapshots')
    .select(
      'total_sales, total_transactions, avg_lpp, total_ad_spend, avg_roas, total_leads, cash_days, net_margin_pct'
    )
    .eq('company_id', companyId)
    .order('year', { ascending: false })
    .order('week_number', { ascending: false })
    .limit(1)
    .range(1, 1)
    .single()

  // ── Insight más reciente ─────────────────────────────────
  const { data: insight } = await supabase
    .from('ai_insights')
    .select('executive_summary, week_number, year')
    .eq('company_id', companyId)
    .order('year', { ascending: false })
    .order('week_number', { ascending: false })
    .limit(1)
    .single()

  // ── Últimas 10 semanas para gráfica ─────────────────────
  const { data: snapshotsHistory } = await supabase
    .from('weekly_snapshots')
    .select('week_number, year, total_sales')
    .eq('company_id', companyId)
    .order('year', { ascending: false })
    .order('week_number', { ascending: false })
    .limit(10)
  const history = (snapshotsHistory ?? []).reverse()

  // ── Ventas por canal ─────────────────────────────────────
  const { data: salesByChanData } = await supabase
    .from('sales')
    .select('gross_total, channel_id, sales_channels(name)')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .neq('status', 'cancelled')

  const channelMap: Record<string, { name: string; total: number }> = {}
  const totalAllSales =
    salesByChanData?.reduce((s, r) => s + (r.gross_total ?? 0), 0) ?? 0
  salesByChanData?.forEach((r) => {
    const sc = (r as Record<string, unknown>).sales_channels
    const chanName =
      (sc && typeof sc === 'object' && sc !== null && 'name' in sc
        ? (sc as { name: string }).name
        : null) ?? 'Sin canal'
    const id = r.channel_id ?? 'none'
    if (!channelMap[id]) channelMap[id] = { name: chanName, total: 0 }
    channelMap[id].total += r.gross_total ?? 0
  })
  const channelData = Object.values(channelMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  // ── Inventario: productos sin movimiento ─────────────────
  const { data: productsData } = await supabase
    .from('products')
    .select('id, name, current_stock, min_stock_alert, unit_cost, sale_price')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .eq('is_active', true)

  const products = productsData ?? []

  const frozenCapital = products.reduce(
    (s, p) => s + (p.current_stock ?? 0) * (p.unit_cost ?? 0),
    0
  )

  const slowMovers = products
    .filter(
      (p) =>
        (p.current_stock ?? 0) > (p.min_stock_alert ?? 0) * 3 &&
        (p.min_stock_alert ?? 0) > 0
    )
    .sort((a, b) => (b.current_stock ?? 0) - (a.current_stock ?? 0))
    .slice(0, 3)

  const totalStock = products.reduce(
    (s, p) => s + (p.current_stock ?? 0),
    0
  )
  const inventoryDays =
    totalStock > 0
      ? Math.min(
          Math.round(totalStock / Math.max(products.length * 0.3, 1)),
          90
        )
      : 0
  const inventoryDaysPct = Math.min(Math.round((inventoryDays / 45) * 100), 100)

  // ── Datos financieros del mes ────────────────────────────
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const { data: txData } = await supabase
    .from('bank_transactions')
    .select('type, amount, is_fixed')
    .eq('company_id', companyId)
    .gte('tx_date', monthStart)

  const totalIncome = (txData ?? [])
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + (t.amount ?? 0), 0)
  const totalExpenses = (txData ?? [])
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + (t.amount ?? 0), 0)
  const fixedExpenses = (txData ?? [])
    .filter((t) => t.type === 'expense' && t.is_fixed)
    .reduce((s, t) => s + (t.amount ?? 0), 0)
  const balance = totalIncome - totalExpenses
  const fixedExpensesPct =
    totalExpenses > 0 ? Math.round((fixedExpenses / totalExpenses) * 100) : 0

  // ── Calcular deltas (% cambio vs semana anterior) ────────
  function calcDelta(
    current: number | null | undefined,
    previous: number | null | undefined
  ): number | undefined {
    if (!current || !previous || previous === 0) return undefined
    return Math.round(((current - previous) / previous) * 100)
  }

  const weekLabel =
    snap?.week_number != null
      ? `Semana ${snap.week_number} · ${snap.year}`
      : `Semana ${weekNumber} · ${currentYear}`

  const maxSales = Math.max(...history.map((h) => h.total_sales ?? 0), 1)

  // total_cost no existe en weekly_snapshots — usar 0 como fallback
  const totalCost = 0

  return (
    <>
      <Topbar pageTitle="Dashboard" pageSubtitle={weekLabel} />
      <RegisterSaleButton companyId={companyId} />

      <div
        style={{
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}
      >
        {/* AI Insight Central */}
        <div style={{ marginBottom: 20 }}>
          <AiInsightBox
            variant="gold"
            title={`lumio IA · Resumen ejecutivo — Semana ${insight?.week_number ?? weekNumber}`}
            text={
              insight?.executive_summary ??
              'Aún no hay suficientes datos para generar un análisis. Registra ventas y pautas para ver tus primeros insights.'
            }
          />
        </div>

        {/* BLOQUE 1 — VENTAS */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
            paddingBottom: 8,
            borderBottom: '2px solid var(--border)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#E8A500',
                flexShrink: 0,
              }}
            />
            Ventas
          </div>
          <Link
            href="/sales"
            style={{ fontSize: 11, color: 'var(--muted)', textDecoration: 'none' }}
          >
            Ver detalle →
          </Link>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 10,
            marginBottom: 20,
          }}
        >
          <KpiCard
            label="Ventas $"
            prefix="$"
            value={snap?.total_sales ?? 0}
            isGold
            delta={calcDelta(snap?.total_sales, prevSnap?.total_sales)}
            compare={
              prevSnap?.total_sales
                ? `Ant: $${prevSnap.total_sales}`
                : undefined
            }
          />
          <KpiCard
            label="Transacciones"
            value={snap?.total_transactions ?? 0}
            delta={calcDelta(
              snap?.total_transactions,
              prevSnap?.total_transactions
            )}
            compare={
              prevSnap?.total_transactions
                ? `Ant: ${prevSnap.total_transactions}`
                : undefined
            }
          />
          <KpiCard
            label="LPP"
            value={snap?.avg_lpp ?? 0}
            delta={calcDelta(snap?.avg_lpp, prevSnap?.avg_lpp)}
            compare="líneas por pedido"
          />
          <KpiCard
            label="Costo $"
            prefix="$"
            value={totalCost}
            compare={
              snap?.gross_margin_pct
                ? `Margen: ${snap.gross_margin_pct}%`
                : undefined
            }
          />
          <KpiCard
            label="Contribución"
            prefix="$"
            value={
              snap
                ? (snap.total_sales ?? 0) -
                  totalCost -
                  (snap.total_discounts ?? 0)
                : 0
            }
          />
          <KpiCard
            label="Descuentos"
            prefix="$"
            value={snap?.total_discounts ?? 0}
            compare={
              snap?.total_sales && snap.total_discounts
                ? `${Math.round((snap.total_discounts / snap.total_sales) * 100)}% de ventas`
                : undefined
            }
          />
        </div>

        {/* BLOQUE 2 — INVENTARIO */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
            paddingBottom: 8,
            borderBottom: '2px solid var(--border)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#2563EB',
                flexShrink: 0,
              }}
            />
            Inventario
          </div>
          <Link
            href="/inventory"
            style={{ fontSize: 11, color: 'var(--muted)', textDecoration: 'none' }}
          >
            Ver detalle →
          </Link>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '13px 15px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--muted)',
                marginBottom: 7,
                fontWeight: 600,
              }}
            >
              Top 3 sin movimiento
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                marginTop: 4,
              }}
            >
              {slowMovers.length === 0 ? (
                <div
                  style={{ fontSize: 11, color: 'var(--muted)' }}
                >
                  Sin productos estancados ✓
                </div>
              ) : (
                slowMovers.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 11,
                    }}
                  >
                    <span
                      style={{
                        color: 'var(--text2)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '70%',
                      }}
                    >
                      {p.name}
                    </span>
                    <span
                      style={{
                        color: 'var(--red)',
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {p.current_stock} u.
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '14px 16px',
            }}
          >
            <div
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--muted)',
                marginBottom: 6,
                fontWeight: 600,
              }}
            >
              Capital paralizado en stock
            </div>
            <div
              className="font-syne font-bold"
              style={{
                fontSize: 22,
                color: frozenCapital > 0 ? 'var(--red)' : 'var(--text)',
                lineHeight: 1,
              }}
            >
              ${frozenCapital.toFixed(0)}
            </div>
            <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 4 }}>
              Liberable: liquidar o descontinuar
            </div>
          </div>
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '13px 15px',
            }}
          >
            <div
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--muted)',
                marginBottom: 7,
                fontWeight: 600,
              }}
            >
              Días de inventario general
            </div>
            <div
              className="font-syne font-bold"
              style={{
                fontSize: 22,
                color: 'var(--text)',
                lineHeight: 1,
                marginBottom: 5,
              }}
            >
              {inventoryDays} días
            </div>
            <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>
              Óptimo: 20–45 días
            </div>
            <div
              style={{
                height: 4,
                background: 'var(--border)',
                borderRadius: 2,
                overflow: 'hidden',
                marginTop: 8,
              }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: 2,
                  background:
                    'linear-gradient(90deg, #F5C842, #F09A1A)',
                  width: `${inventoryDaysPct}%`,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        </div>

        {/* BLOQUE 3 — PAUTAS PUBLICITARIAS */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
            paddingBottom: 8,
            borderBottom: '2px solid var(--border)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#E8A500',
                flexShrink: 0,
              }}
            />
            Pautas Publicitarias
          </div>
          <Link
            href="/ad-campaigns"
            style={{ fontSize: 11, color: 'var(--muted)', textDecoration: 'none' }}
          >
            Ver detalle →
          </Link>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 10,
            marginBottom: 20,
          }}
        >
          <KpiCard
            label="Inversión"
            prefix="$"
            value={snap?.total_ad_spend ?? 0}
            delta={calcDelta(snap?.total_ad_spend, prevSnap?.total_ad_spend)}
            compare={
              prevSnap?.total_ad_spend
                ? `Ant: $${prevSnap.total_ad_spend}`
                : undefined
            }
          />
          <KpiCard
            label="ROAS"
            value={snap?.avg_roas ?? 0}
            isGold
            delta={calcDelta(snap?.avg_roas, prevSnap?.avg_roas)}
            compare={
              prevSnap?.avg_roas ? `Ant: ${prevSnap.avg_roas}` : undefined
            }
          />
          <KpiCard
            label="Trans. digitales"
            value={0}
          />
          <KpiCard
            label="Leads generados"
            value={snap?.total_leads ?? 0}
          />
          <KpiCard
            label="Calidad contactos"
            suffix="%"
            value={0}
          />
          <KpiCard
            label="Efectividad"
            suffix="%"
            value={snap?.avg_effectiveness ?? 0}
          />
        </div>

        {/* BLOQUE 4 — FINANCIERO */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
            paddingBottom: 8,
            borderBottom: '2px solid var(--border)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#059669',
                flexShrink: 0,
              }}
            />
            Financiero
          </div>
          <Link
            href="/profit-loss"
            style={{ fontSize: 11, color: 'var(--muted)', textDecoration: 'none' }}
          >
            Ver P&G →
          </Link>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 10,
            marginBottom: 20,
          }}
        >
          <KpiCard
            label="Ingresos vs Egresos"
            prefix={balance >= 0 ? '+$' : '-$'}
            value={Math.abs(balance).toFixed(0)}
            compare={`Ing: $${totalIncome.toFixed(0)} / Egr: $${totalExpenses.toFixed(0)}`}
          />
          <KpiCard
            label="CxC vencidas"
            prefix="$"
            value={snap?.overdue_receivables ?? 0}
            compare="facturas >30 días"
          />
          <KpiCard
            label="Días de caja"
            value={snap?.cash_days ?? 0}
            compare="Óptimo: >30 días"
          />
          <KpiCard
            label="Margen neto mes"
            suffix="%"
            value={snap?.net_margin_pct ?? 0}
            delta={calcDelta(snap?.net_margin_pct, prevSnap?.net_margin_pct)}
          />
          <KpiCard
            label="Gastos fijos / Egresos"
            suffix="%"
            value={fixedExpensesPct}
            compare="Benchmark: <55%"
          />
        </div>

        {/* SECCIÓN FINAL — GRÁFICAS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: 14,
            marginTop: 20,
          }}
        >
          {/* Card izquierda — Gráfica de barras */}
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}
            >
              <div
                className="font-syne font-bold"
                style={{ fontSize: 12, color: 'var(--text)' }}
              >
                Ventas — últimas {history.length} semanas
              </div>
            </div>
            {history.length === 0 ? (
              <div
                style={{
                  height: 90,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{ fontSize: 12, color: 'var(--muted)' }}
                >
                  Sin datos históricos
                </span>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 5,
                  height: 90,
                }}
              >
                {history.map((h, i) => {
                  const heightPct =
                    maxSales > 0
                      ? Math.max(
                          ((h.total_sales ?? 0) / maxSales) * 100,
                          4
                        )
                      : 4
                  const isLast = i === history.length - 1
                  return (
                    <div
                      key={`${h.year}-${h.week_number}`}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: `${heightPct}%`,
                          borderRadius: '3px 3px 0 0',
                          background: isLast
                            ? 'linear-gradient(180deg, #F5C842, #F09A1A)'
                            : 'rgba(232,165,0,0.12)',
                          border: isLast
                            ? 'none'
                            : '1px solid rgba(232,165,0,0.08)',
                          boxShadow: isLast
                            ? '0 0 10px rgba(232,165,0,0.25)'
                            : 'none',
                          minHeight: 4,
                          transition: 'height 0.3s ease',
                        }}
                      />
                      <div
                        style={{
                          fontSize: 8,
                          color: isLast ? 'var(--gold)' : 'var(--muted)',
                          textAlign: 'center',
                          fontWeight: isLast ? 600 : 400,
                        }}
                      >
                        S{h.week_number}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Card derecha — Ventas por canal */}
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 16,
            }}
          >
            <div
              className="font-syne font-bold"
              style={{
                fontSize: 12,
                color: 'var(--text)',
                marginBottom: 14,
              }}
            >
              Ventas por canal
            </div>
            {channelData.length === 0 ? (
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--muted)',
                  textAlign: 'center',
                  padding: '20px 0',
                }}
              >
                Sin datos de canales
              </p>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {channelData.map((ch) => {
                  const pct =
                    totalAllSales > 0
                      ? Math.round((ch.total / totalAllSales) * 100)
                      : 0
                  return (
                    <div key={ch.name}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 3,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            color: 'var(--text2)',
                          }}
                        >
                          {ch.name}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            color: 'var(--gold)',
                            fontWeight: 600,
                          }}
                        >
                          ${ch.total.toLocaleString('es-EC')} · {pct}%
                        </span>
                      </div>
                      <div
                        style={{
                          height: 4,
                          background: 'var(--border)',
                          borderRadius: 2,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            borderRadius: 2,
                            background:
                              'linear-gradient(90deg, #F5C842, #F09A1A)',
                            width: `${pct}%`,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
