import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getUserData } from '@/lib/queries/getUser'
import KpiCard from '@/components/ui/KpiCard'
import AiInsightBox from '@/components/ui/AiInsightBox'
import QuickSaleForm from '@/components/sales/QuickSaleForm'
import { UserMenu } from '@/components/layout/Topbar'
import DateRangePicker from '@/components/ui/DateRangePicker'
import InsightReminderModal, { type ModalScenario } from '@/components/dashboard/InsightReminderModal'
import {
  getWeeksInRange,
  toLocalISO,
  getPreviousPeriodRolling,
  roundToFullWeeks,
  isoWeekFromString,
  formatBusinessDate,
  isoWeekDateRange,
} from '@/lib/dateUtils'

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
        marginBottom: 6,
        paddingBottom: 5,
        borderBottom: '2px solid var(--border)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-syne)',
          fontWeight: 700,
          fontSize: 13,
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
  searchParams: Promise<{ from?: string; to?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams
  const now = new Date()
  const todayISO = toLocalISO(now)
  const day = now.getDay()
  const mondayLocal = new Date(now)
  mondayLocal.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  mondayLocal.setHours(0, 0, 0, 0)
  const rawFrom = toLocalISO(mondayLocal)
  const { from: defaultFrom, to: defaultTo } = roundToFullWeeks(rawFrom, todayISO)
  const from = params.from ?? defaultFrom
  const to = params.to ?? defaultTo

  const userData = await getUserData()
  if (!userData?.company_id) redirect('/login')

  const companyId = userData.company_id
  const userRole  = userData.role ?? 'operator'
  const supabase  = await createClient()

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
        <div style={{ padding: '14px 16px' }}>
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

  const [{ data: branchesList }, { data: channelsList }] = await Promise.all([
    supabase
      .from('branches')
      .select('id, name, type')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('name', { ascending: true }),
    supabase
      .from('sales_channels')
      .select('id, name')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name', { ascending: true }),
  ])

  const branches  = branchesList ?? []
  const channels  = channelsList ?? []

  // ── Semanas en el rango from-to para weekly_snapshots ─────
  const currentYear = now.getFullYear()
  const startOfYear = new Date(currentYear, 0, 1)
  const currentWeek = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 +
      startOfYear.getDay() +
      1) /
      7
  )

  const weeksInRange = getWeeksInRange(from, to)
  const weeksByYear = weeksInRange.reduce(
    (acc, { year, week_number }) => {
      if (!acc[year]) acc[year] = []
      if (!acc[year].includes(week_number)) acc[year].push(week_number)
      return acc
    },
    {} as Record<number, number[]>
  )

  const { prevFrom, prevTo } = getPreviousPeriodRolling(from, to)
  const prevWeeksInRange = getWeeksInRange(prevFrom, prevTo)
  const prevWeeksByYear = prevWeeksInRange.reduce(
    (acc, { year, week_number }) => {
      if (!acc[year]) acc[year] = []
      if (!acc[year].includes(week_number)) acc[year].push(week_number)
      return acc
    },
    {} as Record<number, number[]>
  )

  // Snapshot período actual — un query por año si hay múltiples
  const allSnapsArrays = await Promise.all(
    Object.entries(weeksByYear).map(([yearStr, weekNums]) =>
      supabase
        .from('weekly_snapshots')
        .select('*')
        .eq('company_id', companyId)
        .eq('year', Number(yearStr))
        .in('week_number', weekNums.length > 0 ? weekNums : [0])
        .order('week_number', { ascending: false })
        .then(({ data }) => data ?? [])
    )
  )
  const allSnaps: Record<string, unknown>[] = allSnapsArrays.flat()
  const snaps = allSnaps.sort(
    (a, b) =>
      Number(b.year ?? 0) - Number(a.year ?? 0) ||
      Number(b.week_number ?? 0) - Number(a.week_number ?? 0)
  )

  // Snapshot período anterior — para deltas (todas las columnas numéricas)
  type PrevSnapRow = { total_sales?: number; total_transactions?: number; avg_lpp?: number; total_discounts?: number; gross_margin_pct?: number; total_ad_spend?: number; avg_roas?: number; total_leads?: number; avg_effectiveness?: number; avg_ctr?: number; cash_days?: number; net_margin_pct?: number; fixed_vs_total_pct?: number }
  let prevSnapsData: PrevSnapRow[] = []
  if (Object.keys(prevWeeksByYear).length > 0) {
    const prevArrays = await Promise.all(
      Object.entries(prevWeeksByYear).map(([yearStr, weekNums]) =>
        supabase
          .from('weekly_snapshots')
          .select(
            'total_sales, total_transactions, avg_lpp, total_discounts, gross_margin_pct, total_ad_spend, avg_roas, total_leads, avg_effectiveness, avg_ctr, cash_days, net_margin_pct, fixed_vs_total_pct'
          )
          .eq('company_id', companyId)
          .eq('year', Number(yearStr))
          .in('week_number', weekNums.length > 0 ? weekNums : [0])
          .then(({ data }) => (data ?? []) as PrevSnapRow[])
      )
    )
    prevSnapsData = prevArrays.flat()
  }

  // ── Agregar valores del período actual ───────────────────
  const totalSales = snaps.reduce((s, r) => s + Number(r.total_sales ?? 0), 0)
  const totalTransactions = snaps.reduce(
    (s, r) => s + Number(r.total_transactions ?? 0),
    0
  )
  const avgLpp =
    snaps.length > 0
      ? snaps.reduce((s, r) => s + Number(r.avg_lpp ?? 0), 0) / snaps.length
      : 0
  const totalDiscounts = snaps.reduce((s, r) => s + Number(r.total_discounts ?? 0), 0)
  const totalAdSpend = snaps.reduce((s, r) => s + Number(r.total_ad_spend ?? 0), 0)
  const avgRoas =
    snaps.length > 0
      ? snaps.reduce((s, r) => s + Number(r.avg_roas ?? 0), 0) / snaps.length
      : 0
  const totalLeads = snaps.reduce((s, r) => s + Number(r.total_leads ?? 0), 0)
  const avgEffectiveness =
    snaps.length > 0
      ? snaps.reduce((s, r) => s + Number(r.avg_effectiveness ?? 0), 0) / snaps.length
      : 0
  const avgCashDays =
    snaps.length > 0
      ? snaps.reduce((s, r) => s + Number(r.cash_days ?? 0), 0) / snaps.length
      : 0
  const avgNetMargin =
    snaps.length > 0
      ? snaps.reduce((s, r) => s + Number(r.net_margin_pct ?? 0), 0) / snaps.length
      : 0
  const avgGrossMargin =
    snaps.length > 0
      ? snaps.reduce((s, r) => s + Number(r.gross_margin_pct ?? 0), 0) / snaps.length
      : 0
  const overdueRec =
    snaps.length > 0 ? Number(snaps[0].overdue_receivables ?? 0) : 0

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
  const prevTotalDiscounts = prevSnapsData.reduce(
    (s, r) => s + (r.total_discounts ?? 0),
    0
  )
  const prevAvgGrossMargin =
    prevSnapsData.length > 0
      ? prevSnapsData.reduce((s, r) => s + (r.gross_margin_pct ?? 0), 0) /
        prevSnapsData.length
      : 0
  const prevTotalLeads = prevSnapsData.reduce(
    (s, r) => s + (r.total_leads ?? 0),
    0
  )
  const prevAvgEffectiveness =
    prevSnapsData.length > 0
      ? prevSnapsData.reduce((s, r) => s + (r.avg_effectiveness ?? 0), 0) /
        prevSnapsData.length
      : 0
  const prevAvgCtr =
    prevSnapsData.length > 0
      ? prevSnapsData.reduce((s, r) => s + (r.avg_ctr ?? 0), 0) /
        prevSnapsData.length
      : 0
  const prevFixedVsTotal =
    prevSnapsData.length > 0
      ? prevSnapsData.reduce((s, r) => s + (r.fixed_vs_total_pct ?? 0), 0) /
        prevSnapsData.length
      : 0

  // Muestra 0% cuando hay datos pero sin cambio; undefined solo si no hay prev
  function calcDelta(
    current: number,
    previous: number
  ): number | undefined {
    if (previous === 0 || prevSnapsData.length === 0) return undefined
    return Math.round(((current - previous) / previous) * 100)
  }

  // ── Todas las queries independientes en paralelo ─────────
  const [
    { data: historySnaps },
    { data: insight },
    { count: globalSalesCount },
    { data: initialInsightModal },
    { data: lastWeeklyInsight },
    { data: salesByChanDataRaw },
    { data: productsData },
    { data: txData },
  ] = await Promise.all([
    supabase
      .from('weekly_snapshots')
      .select('week_number, year, total_sales')
      .eq('company_id', companyId)
      .order('year', { ascending: false })
      .order('week_number', { ascending: false })
      .limit(10),
    supabase
      .from('ai_insights')
      .select('executive_summary, week_number, year')
      .eq('company_id', companyId)
      .order('year', { ascending: false })
      .order('week_number', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('sales')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .is('deleted_at', null),
    supabase
      .from('ai_insights')
      .select('executive_summary, playbook, created_at')
      .eq('company_id', companyId)
      .eq('type', 'initial')
      .maybeSingle(),
    supabase
      .from('ai_insights')
      .select('executive_summary, playbook, week_number, year')
      .eq('company_id', companyId)
      .eq('type', 'weekly')
      .gt('week_number', 0)
      .order('year', { ascending: false })
      .order('week_number', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('sales')
      .select('gross_total, channel_id, sales_channels(name)')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .neq('status', 'cancelled')
      .gte('sale_date', from)
      .lte('sale_date', to),
    supabase
      .from('products')
      .select('id, name, current_stock, min_stock_alert, unit_cost')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('is_active', true),
    supabase
      .from('bank_transactions')
      .select('type, amount, is_fixed')
      .eq('company_id', companyId)
      .gte('tx_date', from)
      .lte('tx_date', to),
  ])

  const history = (historySnaps ?? []).reverse()
  const maxSales = Math.max(...history.map((h) => h.total_sales ?? 0), 1)
  const hasSalesData = (globalSalesCount ?? 0) > 0

  // Semana anterior completa (la que debería tener insights ya)
  const prevWeekNumber = currentWeek > 1 ? currentWeek - 1 : 52
  const prevWeekYear = currentWeek > 1 ? currentYear : currentYear - 1

  // ── Determinar escenario del modal ────────────────────────
  // Clave de dismiss: fecha del día actual (muestra una vez por día)
  const today = now.toISOString().slice(0, 10)
  const modalDismissKey = today

  let modalScenario: ModalScenario = 'no-data'
  let modalWeekNumber: number | undefined
  let modalWeekYear: number | undefined
  let modalWeeklySummary: string | null = null
  let modalWeeklyPlaybook: unknown[] | null = null
  let modalHasData = hasSalesData

  if (!hasSalesData) {
    // Sin datos en absoluto
    modalScenario = 'no-data'
  } else {
    const lastInsightWeek = lastWeeklyInsight?.week_number ?? 0
    const lastInsightYear = lastWeeklyInsight?.year ?? 0
    const isNewWeek =
      lastInsightYear < prevWeekYear ||
      (lastInsightYear === prevWeekYear && lastInsightWeek < prevWeekNumber)

    if (isNewWeek) {
      modalWeekNumber = prevWeekNumber
      modalWeekYear = prevWeekYear
      if (
        lastWeeklyInsight?.week_number === prevWeekNumber &&
        lastWeeklyInsight?.year === prevWeekYear
      ) {
        // Semana anterior tiene insights
        modalScenario = 'new-week-insight'
        modalWeeklySummary = lastWeeklyInsight.executive_summary ?? null
        modalWeeklyPlaybook = Array.isArray(lastWeeklyInsight.playbook)
          ? (lastWeeklyInsight.playbook as unknown[])
          : null
      } else {
        // Semana anterior sin insights
        modalScenario = 'new-week-missing'
        modalHasData = hasSalesData
      }
    } else if (initialInsightModal) {
      // Todo al día — mostrar el diagnóstico inicial como recordatorio
      modalScenario = 'initial-insight'
    }
    // Si no hay isNewWeek ni initialInsight, no se mostrará el modal
    // (scenario queda como 'no-data' pero hasSalesData=true lo ajustaremos)
  }

  const salesByChanData = salesByChanDataRaw

  // ── Ventas por canal ─────────────────────────────────────
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
  // Días de inventario leído directamente del snapshot (no calcular)
  const inventoryDays =
    snaps.length > 0
      ? Math.round(
          snaps.reduce((s, r) => s + Number(r.inventory_days ?? 0), 0) /
            snaps.length
        )
      : 0
  const inventoryDaysPct = Math.min(Math.round((inventoryDays / 60) * 100), 100)

  // ── Finanzas ─────────────────────────────────────────────
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

  // Insight desactualizado si es de una semana anterior
  const insightIsStale =
    insight && insight.week_number !== currentWeek

  // ── Label del período (semanas ISO + fechas legibles) ───────
  const weekFrom = isoWeekFromString(from)
  const weekTo = isoWeekFromString(to)
  const fromLabel = formatBusinessDate(from)
  const toLabel = formatBusinessDate(to)
  const periodLabel =
    weekFrom.year === weekTo.year && weekFrom.week === weekTo.week
      ? `S${weekFrom.week} · ${fromLabel} → ${toLabel}`
      : weekFrom.year === weekTo.year
        ? `S${weekFrom.week}–S${weekTo.week} · ${fromLabel} → ${toLabel}`
        : `S${weekFrom.week}/${weekFrom.year}–S${weekTo.week}/${weekTo.year} · ${fromLabel} → ${toLabel}`

  return (
    <>
      {/* Modal de recordatorio — solo si aplica algún escenario */}
      {(modalScenario !== 'no-data' || !hasSalesData) && (
        <InsightReminderModal
          scenario={modalScenario}
          dismissKey={modalDismissKey}
          hasData={modalHasData}
          weekNumber={modalWeekNumber}
          weekYear={modalWeekYear}
          weeklySummary={modalWeeklySummary}
          weeklyPlaybook={modalWeeklyPlaybook as Parameters<typeof InsightReminderModal>[0]['weeklyPlaybook']}
          initialSummary={initialInsightModal?.executive_summary ?? null}
          initialPlaybook={
            Array.isArray(initialInsightModal?.playbook)
              ? (initialInsightModal!.playbook as Parameters<typeof InsightReminderModal>[0]['initialPlaybook'])
              : null
          }
        />
      )}

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
            <DateRangePicker snapToWeeks />
          </Suspense>
          <button
            type="button"
            title="Exportar CSV — próximamente"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 11,
              border: '1px solid var(--border2)',
              background: 'transparent',
              color: 'var(--muted)',
              cursor: 'not-allowed',
              fontFamily: 'var(--font-jakarta)',
              opacity: 0.6,
            }}
          >
            ⬇ Exportar
          </button>
          <QuickSaleForm
            companyId={companyId}
            branches={branches}
            channels={channels}
            userRole={userRole}
          />
          {/* Separador + menú de usuario — siempre el último elemento */}
          <div
            style={{
              marginLeft: 4,
              paddingLeft: 8,
              borderLeft: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <UserMenu />
          </div>
        </div>
      </div>

      <div
        style={{
          padding: '14px 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <AiInsightBox
            variant={insightIsStale ? 'blue' : 'gold'}
            title={
              insightIsStale
                ? `lumio IA · Resumen semana ${insight?.week_number ?? currentWeek} (desactualizado)`
                : `lumio IA · Resumen ejecutivo — Semana ${insight?.week_number ?? currentWeek}`
            }
            text={
              insightIsStale
                ? `Este análisis es de la semana ${insight?.week_number}. Ve a IA Insights para generar el análisis actualizado de la semana ${currentWeek}.`
                : (insight?.executive_summary ??
                    'Registra ventas y pautas para ver tus primeros insights.')
            }
          />
        </div>

        <BlockHeader
          title="Financiero"
          dotColor="#059669"
          href="/profit-loss"
          link="Ver P&G →"
        />
        {avgCashDays < 30 && avgCashDays > 0 && (
          <div style={{ marginBottom: 8 }}>
            <AiInsightBox
              variant={avgCashDays < 15 ? 'red' : 'gold'}
              title={avgCashDays < 15 ? '🔴 Alerta crítica de caja' : '⚠ Días de caja bajos'}
              text={`Tienes aproximadamente ${Math.round(avgCashDays)} días de caja disponibles. ${
                avgCashDays < 15
                  ? 'Acción urgente: revisar ingresos pendientes y reducir egresos no esenciales.'
                  : 'Considera revisar tus CxC pendientes y planificar ingresos para las próximas semanas.'
              }`}
            />
          </div>
        )}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5,1fr)',
            gap: 8,
            marginBottom: 14,
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
            value={String(overdueRec)}
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
            compare="desde egresos bancarios"
          />
          <KpiCard
            label="Gastos fijos / Egr"
            suffix="%"
            value={fixedExpensesPct}
            delta={calcDelta(fixedExpensesPct, Math.round(prevFixedVsTotal))}
            compare="Benchmark: <55%"
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
            gap: 8,
            marginBottom: 14,
          }}
        >
          <KpiCard
            label="Ventas $"
            prefix="$"
            value={Math.round(totalSales)}
            isGold
            delta={calcDelta(totalSales, prevTotalSales)}
            compare={
              prevTotalSales > 0
                ? `Ant: $${Math.round(prevTotalSales)}`
                : undefined
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
            delta={calcDelta(avgGrossMargin, prevAvgGrossMargin)}
            compare="del período"
          />
          <KpiCard
            label="Contribución"
            prefix="$"
            value={(totalSales - totalDiscounts).toFixed(0)}
            delta={calcDelta(
              totalSales - totalDiscounts,
              prevTotalSales - prevTotalDiscounts
            )}
          />
          <KpiCard
            label="Descuentos"
            prefix="$"
            value={totalDiscounts.toFixed(2)}
            delta={calcDelta(totalDiscounts, prevTotalDiscounts)}
            compare={
              totalSales > 0
                ? `${Math.round((totalDiscounts / totalSales) * 100)}% de ventas`
                : undefined
            }
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: 8,
            marginTop: 0,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '12px 14px',
            }}
          >
            <div
              className="font-syne font-bold"
              style={{
                fontSize: 12,
                color: 'var(--text)',
                marginBottom: 10,
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
                  height: '160px',
                  padding: '28px 4px 0',
                }}
              >
                {(() => {
                  return history.map((h, i) => {
                    const rawPct = maxSales > 0 ? (h.total_sales ?? 0) / maxSales : 0
                    const isLast = i === history.length - 1
                    const sales = h.total_sales ?? 0
                    const { start, end } = isoWeekDateRange(h.year, h.week_number)
                    return (
                      <div
                        key={`${h.year}-${h.week_number}`}
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 3,
                          position: 'relative',
                        }}
                      >
                        {/* Valor encima de la barra */}
                        <div
                          style={{
                            position: 'absolute',
                            top: -18,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontSize: 7,
                            color: isLast ? 'var(--gold)' : 'var(--muted)',
                            fontWeight: isLast ? 700 : 400,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ${sales.toLocaleString('es-EC')}
                        </div>

                        {/* Barra */}
                        <div
                          title={`S${h.week_number} (${start} – ${end}): $${sales.toLocaleString('es-EC')}`}
                          style={{
                            width: '100%',
                            height: `${Math.max(Math.sqrt(rawPct) * 110, 4)}px`,
                            borderRadius: '3px 3px 0 0',
                            background: isLast
                              ? 'linear-gradient(180deg,#F5C842,#F09A1A)'
                              : 'rgba(232,165,0,0.12)',
                            border: isLast ? 'none' : '1px solid rgba(232,165,0,0.08)',
                            boxShadow: isLast ? '0 0 10px rgba(232,165,0,0.25)' : 'none',
                            minHeight: 4,
                          }}
                        />

                        {/* Etiqueta inferior */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <span
                            style={{
                              fontSize: 8,
                              color: isLast ? 'var(--gold)' : 'var(--muted)',
                              fontWeight: isLast ? 600 : 400,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Sem {h.week_number}
                          </span>
                          <span
                            style={{
                              fontSize: 7,
                              color: isLast ? 'var(--gold-light)' : 'var(--text2)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {start}–{end}
                          </span>
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </div>

          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '12px 14px',
            }}
          >
            <div
              className="font-syne font-bold"
              style={{
                fontSize: 12,
                color: 'var(--text)',
                marginBottom: 10,
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
                  padding: '14px 0',
                }}
              >
                Sin datos de canales
              </p>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
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
                          {`$${Math.round(ch.total).toLocaleString('es-EC', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })} · ${pct}%`}
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
            gap: 8,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '10px 12px',
            }}
          >
            <div
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--muted)',
                marginBottom: 5,
                fontWeight: 600,
              }}
            >
              Top 3 sin movimiento
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                marginTop: 2,
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
              padding: '10px 12px',
            }}
          >
            <div
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--muted)',
                marginBottom: 5,
                fontWeight: 600,
              }}
            >
              Capital paralizado
            </div>
            <div
              className="font-syne font-bold"
              style={{
                fontSize: 20,
                color: frozenCapital > 0 ? 'var(--red)' : 'var(--text)',
                lineHeight: 1,
              }}
            >
              {`$${Math.round(frozenCapital).toLocaleString('es-EC', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}`}
            </div>
            <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 3 }}>
              Liberable: liquidar o descontinuar
            </div>
          </div>
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '10px 12px',
            }}
          >
            <div
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--muted)',
                marginBottom: 5,
                fontWeight: 600,
              }}
            >
              Días de inventario
            </div>
            <div
              className="font-syne font-bold"
              style={{
                fontSize: 20,
                color: 'var(--text)',
                lineHeight: 1,
                marginBottom: 4,
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
                marginTop: 6,
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
            gap: 8,
            marginBottom: 14,
          }}
        >
          <KpiCard
            label="Inversión"
            prefix="$"
            value={Math.round(totalAdSpend)}
            delta={calcDelta(totalAdSpend, prevTotalAdSpend)}
            compare={
              prevTotalAdSpend > 0
                ? `Ant: $${Math.round(prevTotalAdSpend)}`
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
              (s, r) => s + Number(r.total_transactions ?? 0),
              0
            )}
            delta={calcDelta(
              snaps.reduce((s, r) => s + Number(r.total_transactions ?? 0), 0),
              prevTotalTransactions
            )}
          />
          <KpiCard
            label="Leads generados"
            value={totalLeads}
            delta={calcDelta(totalLeads, prevTotalLeads)}
            compare={
              prevTotalLeads > 0 ? `Ant: ${prevTotalLeads}` : undefined
            }
          />
          <KpiCard
            label="Efectividad"
            suffix="%"
            value={avgEffectiveness.toFixed(1)}
            delta={calcDelta(avgEffectiveness, prevAvgEffectiveness)}
            compare={
              prevAvgEffectiveness > 0
                ? `Ant: ${prevAvgEffectiveness.toFixed(1)}%`
                : undefined
            }
          />
          <KpiCard
            label="CTR"
            suffix="%"
            value={
              snaps.length > 0
                ? (
                    snaps.reduce((s, r) => s + Number(r.avg_ctr ?? 0), 0) /
                    snaps.length
                  ).toFixed(2)
                : '0'
            }
            delta={calcDelta(
              snaps.length > 0
                ? snaps.reduce((s, r) => s + Number(r.avg_ctr ?? 0), 0) /
                    snaps.length
                : 0,
              prevAvgCtr
            )}
            compare={
              prevAvgCtr > 0 ? `Ant: ${prevAvgCtr.toFixed(2)}%` : undefined
            }
          />
        </div>
      </div>
    </>
  )
}
