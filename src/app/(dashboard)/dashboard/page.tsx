import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import KpiCard from '@/components/ui/KpiCard'
import AiInsightBox from '@/components/ui/AiInsightBox'
import RegisterSaleButton from '@/components/dashboard/RegisterSaleButton'
import PeriodSelector from '@/components/dashboard/PeriodSelector'

// ── Componente interno BlockHeader ──────────────────────────
function BlockHeader({
  title,
  dotColor,
  href,
  link,
}: {
  title: string
  dotColor: string
  href: string
  link: string
}) {
  return (
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
            background: dotColor,
            flexShrink: 0,
          }}
        />
        {title}
      </div>
      <Link href={href} style={{ fontSize: 11, color: 'var(--muted)', textDecoration: 'none' }}>
        {link}
      </Link>
    </div>
  )
}

interface DashboardPageProps {
  searchParams: Promise<{ period?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams
  const period = params.period ?? 'week'

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
        <div
          style={{
            background: 'var(--topbar-bg, var(--surface))',
            borderBottom: '1px solid var(--border)',
            padding: '0 22px',
            height: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div className="font-syne font-bold" style={{ fontSize: 15, color: 'var(--text)' }}>
            Dashboard
          </div>
        </div>
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

  // ── Calcular rango de fechas según período ───────────────
  const now = new Date()
  const currentYear = now.getFullYear()
  const startOfYear = new Date(currentYear, 0, 1)
  const currentWeek = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 +
      startOfYear.getDay() +
      1) /
      7
  )
  const currentMonth = now.getMonth() + 1

  let weekNumbers: number[] = []
  if (period === 'week') {
    weekNumbers = [currentWeek]
  } else if (period === 'month') {
    const firstWeekOfMonth = Math.ceil(
      ((new Date(currentYear, currentMonth - 1, 1).getTime() -
        startOfYear.getTime()) /
        86400000 +
        startOfYear.getDay() +
        1) /
        7
    )
    weekNumbers = Array.from({ length: 4 }, (_, i) => firstWeekOfMonth + i)
      .filter((w) => w <= currentWeek && w > 0 && w <= 52)
  } else {
    weekNumbers = Array.from({ length: 5 }, (_, i) => currentWeek - i).filter(
      (w) => w > 0
    )
  }

  const prevWeekNumbers = weekNumbers
    .map((w) => w - weekNumbers.length)
    .filter((w) => w > 0)

  // Snapshot período actual
  const { data: currentSnaps } = await supabase
    .from('weekly_snapshots')
    .select('*')
    .eq('company_id', companyId)
    .eq('year', currentYear)
    .in('week_number', weekNumbers.length > 0 ? weekNumbers : [0])
    .order('week_number', { ascending: false })

  const snaps = currentSnaps ?? []

  // Snapshot período anterior — para deltas
  const { data: prevSnaps } = await supabase
    .from('weekly_snapshots')
    .select(
      'total_sales, total_transactions, avg_lpp, total_ad_spend, avg_roas, total_leads, cash_days, net_margin_pct, avg_effectiveness'
    )
    .eq('company_id', companyId)
    .eq('year', currentYear)
    .in('week_number', prevWeekNumbers.length > 0 ? prevWeekNumbers : [0])

  const prevSnapsData = prevSnaps ?? []

  // ── Agregar valores del período actual ───────────────────
  const totalSales = snaps.reduce((s, r) => s + (r.total_sales ?? 0), 0)
  const totalTransactions = snaps.reduce(
    (s, r) => s + (r.total_transactions ?? 0),
    0
  )
  const avgLpp =
    snaps.length > 0
      ? snaps.reduce((s, r) => s + (r.avg_lpp ?? 0), 0) / snaps.length
      : 0
  const totalDiscounts = snaps.reduce((s, r) => s + (r.total_discounts ?? 0), 0)
  const totalAdSpend = snaps.reduce((s, r) => s + (r.total_ad_spend ?? 0), 0)
  const avgRoas =
    snaps.length > 0
      ? snaps.reduce((s, r) => s + (r.avg_roas ?? 0), 0) / snaps.length
      : 0
  const totalLeads = snaps.reduce((s, r) => s + (r.total_leads ?? 0), 0)
  const avgEffectiveness =
    snaps.length > 0
      ? snaps.reduce((s, r) => s + (r.avg_effectiveness ?? 0), 0) / snaps.length
      : 0
  const avgCashDays =
    snaps.length > 0
      ? snaps.reduce((s, r) => s + (r.cash_days ?? 0), 0) / snaps.length
      : 0
  const avgNetMargin =
    snaps.length > 0
      ? snaps.reduce((s, r) => s + (r.net_margin_pct ?? 0), 0) / snaps.length
      : 0
  const avgGrossMargin =
    snaps.length > 0
      ? snaps.reduce((s, r) => s + (r.gross_margin_pct ?? 0), 0) / snaps.length
      : 0
  const overdueRec =
    snaps.length > 0 ? snaps[0].overdue_receivables ?? 0 : 0

  // ── Agregar valores del período anterior ─────────────────
  const prevTotalSales = prevSnapsData.reduce(
    (s, r) => s + (r.total_sales ?? 0),
    0
  )
  const prevTotalTransactions = prevSnapsData.reduce(
    (s, r) => s + (r.total_transactions ?? 0),
    0
  )
  const prevAvgLpp =
    prevSnapsData.length > 0
      ? prevSnapsData.reduce((s, r) => s + (r.avg_lpp ?? 0), 0) /
        prevSnapsData.length
      : 0
  const prevTotalAdSpend = prevSnapsData.reduce(
    (s, r) => s + (r.total_ad_spend ?? 0),
    0
  )
  const prevAvgRoas =
    prevSnapsData.length > 0
      ? prevSnapsData.reduce((s, r) => s + (r.avg_roas ?? 0), 0) /
        prevSnapsData.length
      : 0
  const prevAvgNetMargin =
    prevSnapsData.length > 0
      ? prevSnapsData.reduce((s, r) => s + (r.net_margin_pct ?? 0), 0) /
        prevSnapsData.length
      : 0

  function calcDelta(
    current: number,
    previous: number
  ): number | undefined {
    if (!previous || previous === 0) return undefined
    return Math.round(((current - previous) / previous) * 100)
  }

  // ── Últimas 10 semanas para gráfica (SIEMPRE) ────────────
  const { data: historySnaps } = await supabase
    .from('weekly_snapshots')
    .select('week_number, year, total_sales')
    .eq('company_id', companyId)
    .order('year', { ascending: false })
    .order('week_number', { ascending: false })
    .limit(10)
  const history = (historySnaps ?? []).reverse()
  const maxSales = Math.max(...history.map((h) => h.total_sales ?? 0), 1)

  // ── Insight ──────────────────────────────────────────────
  const { data: insight } = await supabase
    .from('ai_insights')
    .select('executive_summary, week_number, year')
    .eq('company_id', companyId)
    .order('year', { ascending: false })
    .order('week_number', { ascending: false })
    .limit(1)
    .single()

  // ── Ventas por canal ─────────────────────────────────────
  const dateFrom =
    period === 'week'
      ? new Date(
          now.getTime() - 7 * 24 * 60 * 60 * 1000
        ).toISOString().slice(0, 10)
      : period === 'month'
        ? `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
        : new Date(
            now.getTime() - 30 * 24 * 60 * 60 * 1000
          ).toISOString().slice(0, 10)

  const { data: salesByChanData } = await supabase
    .from('sales')
    .select('gross_total, channel_id, sales_channels(name)')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .neq('status', 'cancelled')
    .gte('sale_date', dateFrom)

  const channelMap: Record<string, { name: string; total: number }> = {}
  const totalAllSales =
    salesByChanData?.reduce((s, r) => s + (r.gross_total ?? 0), 0) ?? 0
  salesByChanData?.forEach((r) => {
    const sc = (r as Record<string, unknown>).sales_channels
    const chanName =
      (sc &&
      typeof sc === 'object' &&
      sc !== null &&
      'name' in sc
        ? (sc as { name: string }).name
        : null) ?? 'Sin canal'
    const id = r.channel_id ?? 'none'
    if (!channelMap[id]) channelMap[id] = { name: chanName, total: 0 }
    channelMap[id].total += r.gross_total ?? 0
  })
  const channelData = Object.values(channelMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  // ── Inventario ───────────────────────────────────────────
  const { data: productsData } = await supabase
    .from('products')
    .select('id, name, current_stock, min_stock_alert, unit_cost')
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

  // ── Finanzas ─────────────────────────────────────────────
  const { data: txData } = await supabase
    .from('bank_transactions')
    .select('type, amount, is_fixed')
    .eq('company_id', companyId)
    .gte('tx_date', dateFrom)

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

  // ── Label del período ─────────────────────────────────────
  const periodLabel =
    period === 'week'
      ? `Semana ${currentWeek} · ${currentYear}`
      : period === 'month'
        ? `${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][currentMonth - 1]} ${currentYear}`
        : 'Últimos 30 días'

  return (
    <>
      <div
        style={{
          background: 'var(--topbar-bg, var(--surface))',
          borderBottom: '1px solid var(--border)',
          padding: '0 22px',
          height: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div>
          <div
            className="font-syne font-bold"
            style={{ fontSize: 15, color: 'var(--text)' }}
          >
            Dashboard
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
            {periodLabel}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Suspense fallback={null}>
            <PeriodSelector />
          </Suspense>
          <button
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 11,
              border: '1px solid var(--border2)',
              background: 'transparent',
              color: 'var(--text2)',
              cursor: 'pointer',
              fontFamily: 'var(--font-jakarta)',
            }}
          >
            ⬇ Exportar
          </button>
          <RegisterSaleButton companyId={companyId} />
        </div>
      </div>

      <div
        style={{
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <AiInsightBox
            variant="gold"
            title={`lumio IA · Resumen ejecutivo — Semana ${insight?.week_number ?? currentWeek}`}
            text={
              insight?.executive_summary ??
              'Registra ventas y pautas para ver tus primeros insights.'
            }
          />
        </div>

        <BlockHeader
          title="Ventas"
          dotColor="#E8A500"
          href="/sales"
          link="Ver detalle →"
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6,1fr)',
            gap: 10,
            marginBottom: 20,
          }}
        >
          <KpiCard
            label="Ventas $"
            prefix="$"
            value={totalSales.toFixed(2)}
            isGold
            delta={calcDelta(totalSales, prevTotalSales)}
            compare={
              prevTotalSales > 0 ? `Ant: $${prevTotalSales.toFixed(0)}` : undefined
            }
          />
          <KpiCard
            label="Transacciones"
            value={totalTransactions}
            delta={calcDelta(totalTransactions, prevTotalTransactions)}
            compare={
              prevTotalTransactions > 0
                ? `Ant: ${prevTotalTransactions}`
                : undefined
            }
          />
          <KpiCard
            label="LPP"
            value={avgLpp.toFixed(1)}
            delta={calcDelta(avgLpp, prevAvgLpp)}
            compare="líneas por pedido"
          />
          <KpiCard
            label="Margen bruto"
            suffix="%"
            value={avgGrossMargin.toFixed(1)}
            compare="del período"
          />
          <KpiCard
            label="Contribución"
            prefix="$"
            value={(totalSales - totalDiscounts).toFixed(0)}
          />
          <KpiCard
            label="Descuentos"
            prefix="$"
            value={totalDiscounts.toFixed(2)}
            compare={
              totalSales > 0
                ? `${Math.round((totalDiscounts / totalSales) * 100)}% de ventas`
                : undefined
            }
          />
        </div>

        <BlockHeader
          title="Inventario"
          dotColor="#2563EB"
          href="/inventory"
          link="Ver detalle →"
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
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
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
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
              padding: '13px 15px',
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
              Capital paralizado
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
              Días de inventario
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
            <div style={{ fontSize: 9, color: 'var(--muted)' }}>
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
                    'linear-gradient(90deg,#F5C842,#F09A1A)',
                  width: `${inventoryDaysPct}%`,
                }}
              />
            </div>
          </div>
        </div>

        <BlockHeader
          title="Pautas Publicitarias"
          dotColor="#E8A500"
          href="/ad-campaigns"
          link="Ver detalle →"
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6,1fr)',
            gap: 10,
            marginBottom: 20,
          }}
        >
          <KpiCard
            label="Inversión"
            prefix="$"
            value={totalAdSpend.toFixed(2)}
            delta={calcDelta(totalAdSpend, prevTotalAdSpend)}
            compare={
              prevTotalAdSpend > 0
                ? `Ant: $${prevTotalAdSpend.toFixed(0)}`
                : undefined
            }
          />
          <KpiCard
            label="ROAS"
            value={avgRoas.toFixed(2)}
            isGold
            delta={calcDelta(avgRoas, prevAvgRoas)}
            compare={
              prevAvgRoas > 0 ? `Ant: ${prevAvgRoas.toFixed(2)}` : undefined
            }
          />
          <KpiCard
            label="Trans. digitales"
            value={snaps.reduce(
              (s, r) => s + (r.total_transactions ?? 0),
              0
            )}
          />
          <KpiCard label="Leads generados" value={totalLeads} />
          <KpiCard
            label="Efectividad"
            suffix="%"
            value={avgEffectiveness.toFixed(1)}
          />
          <KpiCard
            label="CTR"
            suffix="%"
            value={
              snaps.length > 0
                ? (
                    snaps.reduce((s, r) => s + (r.avg_ctr ?? 0), 0) /
                    snaps.length
                  ).toFixed(2)
                : '0'
            }
          />
        </div>

        <BlockHeader
          title="Financiero"
          dotColor="#059669"
          href="/profit-loss"
          link="Ver P&G →"
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5,1fr)',
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
            value={overdueRec}
            compare="facturas >30 días"
          />
          <KpiCard
            label="Días de caja"
            value={avgCashDays.toFixed(0)}
            compare="Óptimo: >30 días"
          />
          <KpiCard
            label="Margen neto"
            suffix="%"
            value={avgNetMargin.toFixed(1)}
            delta={calcDelta(avgNetMargin, prevAvgNetMargin)}
          />
          <KpiCard
            label="Gastos fijos / Egr"
            suffix="%"
            value={fixedExpensesPct}
            compare="Benchmark: <55%"
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: 14,
            marginTop: 20,
          }}
        >
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
              Ventas — últimas {history.length} semanas
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
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
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
                  const heightPct = Math.max(
                    ((h.total_sales ?? 0) / maxSales) * 100,
                    4
                  )
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
                            ? 'linear-gradient(180deg,#F5C842,#F09A1A)'
                            : 'rgba(232,165,0,0.12)',
                          border: isLast
                            ? 'none'
                            : '1px solid rgba(232,165,0,0.08)',
                          boxShadow: isLast
                            ? '0 0 10px rgba(232,165,0,0.25)'
                            : 'none',
                          minHeight: 4,
                        }}
                      />
                      <div
                        style={{
                          fontSize: 8,
                          color: isLast ? 'var(--gold)' : 'var(--muted)',
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
                              'linear-gradient(90deg,#F5C842,#F09A1A)',
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
