import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserData } from '@/lib/queries/getUser'
import Topbar from '@/components/layout/Topbar'
import SalesOverview from '@/components/sales/SalesOverview'
import { getDefaultDateRange, getPreviousPeriodRolling } from '@/lib/dateUtils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const PAGE_SIZE = 50

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string
    to?: string
    page?: string
    week?: string
    channel_id?: string
    status?: string
  }>
}) {
  const params   = await searchParams
  const userData = await getUserData()
  if (!userData?.company_id) redirect('/login')

  const companyId = userData.company_id
  const userRole  = userData.role ?? 'operator'
  const supabase  = await createClient()
  const defaults  = getDefaultDateRange()

  const from = params.from ?? defaults.from
  const to   = params.to   ?? defaults.to
  const { prevFrom, prevTo } = getPreviousPeriodRolling(from, to)

  const currentPage     = Math.max(0, parseInt(params.page ?? '0'))
  const filterWeek      = params.week       ?? ''
  const filterChannelId = params.channel_id ?? ''
  const filterStatus    = params.status     ?? ''
  const offset          = currentPage * PAGE_SIZE

  // ── Helper: aplica filtros de semana/canal/estado a una query base ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyFilters(q: any) {
    if (filterWeek)      q = q.eq('week_number', parseInt(filterWeek))
    if (filterChannelId) q = q.eq('channel_id', filterChannelId)
    if (filterStatus)    q = q.eq('status', filterStatus)
    return q
  }

  const [
    { data: kpiSales },
    { count: filteredCount },
    { data: tableRows },
    { data: prevKpiSales },
    { data: filterOptions },
    { data: channelsList },
    { data: branchesList },
  ] = await Promise.all([
    // 1 — KPIs período actual: todos los registros filtrados, sin límite
    applyFilters(
      supabase
        .from('sales')
        .select('sale_date, gross_total, discount_amount, production_cost, lines_per_order')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .neq('status', 'cancelled')
        .gte('sale_date', from)
        .lte('sale_date', to)
    ),

    // 2 — Total de registros filtrados (para saber cuántas páginas)
    applyFilters(
      supabase
        .from('sales')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .gte('sale_date', from)
        .lte('sale_date', to)
    ),

    // 3 — Filas de la tabla: PAGE_SIZE registros de la página actual
    applyFilters(
      supabase
        .from('sales')
        .select(
          'id, sale_date, week_number, gross_total, discount_amount, production_cost, lines_per_order, status, channel_id, sales_channels(name), customers(full_name)'
        )
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .gte('sale_date', from)
        .lte('sale_date', to)
        .order('sale_date', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)
    ),

    // 4 — KPIs período anterior (mismos filtros para comparativa coherente)
    applyFilters(
      supabase
        .from('sales')
        .select('gross_total, discount_amount, production_cost, lines_per_order')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .neq('status', 'cancelled')
        .gte('sale_date', prevFrom)
        .lte('sale_date', prevTo)
    ),

    // 5 — Opciones de filtro: semanas y estados únicos del período
    supabase
      .from('sales')
      .select('week_number, status, channel_id')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .gte('sale_date', from)
      .lte('sale_date', to),

    // 6 — Canales disponibles (para nombres en filtro)
    supabase
      .from('sales_channels')
      .select('id, name')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name'),

    // 7 — Sucursales
    supabase
      .from('branches')
      .select('id, name, type')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('name'),
  ])

  // Derivar opciones únicas de filtro desde los datos del período
  const rows = filterOptions ?? []
  const uniqueWeeks = Array.from(
    new Set(rows.map((r) => r.week_number).filter(Boolean))
  ).sort((a, b) => (a as number) - (b as number)) as number[]

  const uniqueStatuses = Array.from(
    new Set(rows.map((r) => r.status).filter(Boolean))
  ) as string[]

  const channelIdsInPeriod = new Set(rows.map((r) => r.channel_id).filter(Boolean))
  const channels = (channelsList ?? []).filter((c) => channelIdsInPeriod.has(c.id))

  const totalCount = filteredCount ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <>
      <Topbar
        pageTitle="Ventas"
        pageSubtitle={`${from} → ${to}`}
        showPeriodSelector
        showExportButton
      />

      <div
        style={{
          padding: '14px 16px',
          height: 'calc(100vh - 52px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <SalesOverview
          kpiSales={kpiSales ?? []}
          sales={tableRows ?? []}
          prevKpiSales={prevKpiSales ?? []}
          channels={channels}
          branches={branchesList ?? []}
          from={from}
          to={to}
          prevFrom={prevFrom}
          prevTo={prevTo}
          companyId={companyId}
          userRole={userRole}
          // Paginación server-side
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          // Filtros actuales (desde URL)
          filterWeek={filterWeek}
          filterChannelId={filterChannelId}
          filterStatus={filterStatus}
          // Opciones de filtro
          uniqueWeeks={uniqueWeeks}
          uniqueStatuses={uniqueStatuses}
        />
      </div>
    </>
  )
}
