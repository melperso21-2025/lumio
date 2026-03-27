import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import SalesOverview from '@/components/sales/SalesOverview'
import { getDefaultDateRange } from '@/lib/dateUtils'

export default async function SalesPage({
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
  const defaults = getDefaultDateRange()
  const from = params.from ?? defaults.from
  const to = params.to ?? defaults.to

  // Período anterior (igual duración) para deltas
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const daysDiff = Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1
  const prevToDate = new Date(fromDate)
  prevToDate.setDate(prevToDate.getDate() - 1)
  const prevFromDate = new Date(prevToDate)
  prevFromDate.setDate(prevFromDate.getDate() - daysDiff + 1)
  const prevFrom = prevFromDate.toISOString().slice(0, 10)
  const prevTo = prevToDate.toISOString().slice(0, 10)

  if (!companyId) {
    return (
      <>
        <Topbar
          pageTitle="Ventas"
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

  const { data: salesList } = await supabase
    .from('sales')
    .select(
      'id, sale_date, week_number, gross_total, discount_amount, lines_per_order, status, channel_id,  sales_channels(name)'
    )
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .gte('sale_date', from)
    .lte('sale_date', to)
    .order('sale_date', { ascending: false })
    .limit(200)

  const sales = salesList ?? []

  const { data: prevSalesList } = await supabase
    .from('sales')
    .select(
      'id, sale_date, week_number, gross_total, discount_amount, lines_per_order, status, channel_id, sales_channels(name)'
    )
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .gte('sale_date', prevFrom)
    .lte('sale_date', prevTo)
    .order('sale_date', { ascending: false })
    .limit(200)

  const prevSales = prevSalesList ?? []

  // Cargar canales de la empresa
  const { data: channelsList } = await supabase
    .from('sales_channels')
    .select('id, name')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('name')

  const channels = channelsList ?? []

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
          padding: 20,
          height: 'calc(100vh - 52px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <SalesOverview
          sales={sales}
          prevSales={prevSales}
          channels={channels}
          from={from}
          to={to}
          prevFrom={prevFrom}
          prevTo={prevTo}
        />
      </div>
    </>
  )
}
