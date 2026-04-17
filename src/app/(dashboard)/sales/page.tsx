import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserData } from '@/lib/queries/getUser'
import Topbar from '@/components/layout/Topbar'
import SalesOverview from '@/components/sales/SalesOverview'
import { getDefaultDateRange, getPreviousPeriodRolling } from '@/lib/dateUtils'

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const params   = await searchParams
  const userData = await getUserData()
  if (!userData?.company_id) redirect('/login')

  const companyId = userData.company_id
  const userRole  = userData.role ?? 'operator'
  const supabase  = await createClient()
  const defaults = getDefaultDateRange()
  const from = params.from ?? defaults.from
  const to = params.to ?? defaults.to

  const { prevFrom, prevTo } = getPreviousPeriodRolling(from, to)

  if (!companyId) {
    return (
      <>
        <Topbar
          pageTitle="Ventas"
          pageSubtitle={`${from} → ${to}`}
          showPeriodSelector
          showExportButton
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

  const { data: salesList } = await supabase
    .from('sales')
    .select(
      'id, sale_date, week_number, gross_total, discount_amount, production_cost, lines_per_order, status, channel_id,  sales_channels(name)'
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
      'id, sale_date, week_number, gross_total, discount_amount, production_cost, lines_per_order, status, channel_id, sales_channels(name)'
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

  const { data: customersList } = await supabase
    .from('customers')
    .select('id, full_name, customer_type, label')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('full_name', { ascending: true })
    .limit(300)

  const { data: branchesList } = await supabase
    .from('branches')
    .select('id, name, type')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('name', { ascending: true })

  const customers = customersList ?? []
  const branches = branchesList ?? []

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
          sales={sales}
          prevSales={prevSales}
          channels={channels}
          customers={customers}
          branches={branches}
          from={from}
          to={to}
          prevFrom={prevFrom}
          prevTo={prevTo}
          companyId={companyId}
          userRole={userRole}
        />
      </div>
    </>
  )
}
