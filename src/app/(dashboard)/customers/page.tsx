import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import CustomersOverview from '@/components/customers/CustomersOverview'
import {
  getDefaultDateRange,
  getPreviousPeriodRolling,
  parseLocalDate,
  toLocalISO,
} from '@/lib/dateUtils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const TABLE_PAGE_SIZE = 50

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string; to?: string
    q?: string; ctype?: string; clabel?: string; ciscompany?: string; cpage?: string
  }>
}) {
  const params = await searchParams
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
  const defaults = getDefaultDateRange()
  const from = params.from ?? defaults.from
  const to = params.to ?? defaults.to

  const fromDate = parseLocalDate(from)
  const toDate = parseLocalDate(to)
  const isYTD = fromDate.getMonth() === 0 && fromDate.getDate() === 1

  let prevFrom: string
  let prevTo: string

  if (isYTD) {
    prevFrom = `${fromDate.getFullYear() - 1}-01-01`
    const prevToDate = new Date(toDate)
    prevToDate.setFullYear(fromDate.getFullYear() - 1)
    prevTo = toLocalISO(prevToDate)
  } else {
    const rolling = getPreviousPeriodRolling(from, to)
    prevFrom = rolling.prevFrom
    prevTo = rolling.prevTo
  }

  if (!companyId) {
    return (
      <>
        <Topbar
          pageTitle="Clientes"
          pageSubtitle={`${from} → ${to}`}
          showPeriodSelector
          showExportButton
        />
        <div style={{ padding: '14px 16px' }}>
          <p style={{ fontFamily: 'var(--font-syne)', color: 'var(--muted)', fontSize: 14 }}>
            No tienes una empresa asignada.
          </p>
        </div>
      </>
    )
  }

  const CUSTOMER_SELECT =
    'id, full_name, mobile, phone, email, tax_id, id_type, customer_type, label, lifetime_value, last_purchase_at, registered_since, is_company, contact_name, address, created_at, total_orders'

  // Table filters from URL
  const q          = params.q?.trim() ?? ''
  const ctype      = params.ctype ?? ''
  const clabel     = params.clabel ?? ''
  const ciscompany = params.ciscompany ?? ''
  const cpage      = Math.max(0, parseInt(params.cpage ?? '0', 10) || 0)
  const rangeFrom  = cpage * TABLE_PAGE_SIZE
  const rangeTo    = rangeFrom + TABLE_PAGE_SIZE - 1

  // Build paginated filtered table query
  let tableQuery = supabase
    .from('customers')
    .select(CUSTOMER_SELECT, { count: 'exact' })
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(rangeFrom, rangeTo)

  if (q) {
    tableQuery = tableQuery.or(
      `full_name.ilike.%${q}%,email.ilike.%${q}%,tax_id.ilike.%${q}%`
    )
  }
  if (ctype)      tableQuery = tableQuery.eq('customer_type', ctype)
  if (clabel)     tableQuery = tableQuery.eq('label', clabel)
  if (ciscompany === 'true')  tableQuery = tableQuery.eq('is_company', true)
  if (ciscompany === 'false') tableQuery = tableQuery.eq('is_company', false)

  const [
    { data: tableList, count: tableTotal },
    { data: customersList },
    { data: prevCustomersList },
    { data: typesList },
    { data: labelsList },
    { data: rfmList },
  ] = await Promise.all([
    tableQuery,
    // Clientes nuevos en el período — para KPIs
    supabase
      .from('customers')
      .select(CUSTOMER_SELECT)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .gte('registered_since', from)
      .lte('registered_since', to)
      .order('created_at', { ascending: false })
      .limit(2000),
    supabase
      .from('customers')
      .select(CUSTOMER_SELECT)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .gte('registered_since', prevFrom)
      .lte('registered_since', prevTo)
      .order('created_at', { ascending: false })
      .limit(2000),
    supabase
      .from('customer_types')
      .select('id, name, color')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('name', { ascending: true }),
    supabase
      .from('customer_labels')
      .select('id, name, color')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('name', { ascending: true }),
    // Todos los clientes con compras — para RFM (campos mínimos)
    supabase
      .from('customers')
      .select('id, full_name, last_purchase_at, total_orders, lifetime_value')
      .eq('company_id', companyId)
      .is('deleted_at', null),
  ])

  const tableCustomers = (tableList ?? []) as Parameters<typeof CustomersOverview>[0]['tableCustomers']
  const customers      = customersList ?? []
  const prevCustomers  = prevCustomersList ?? []
  const customerTypes  = typesList ?? []
  const customerLabels = labelsList ?? []
  const rfmCustomers   = rfmList ?? []

  return (
    <>
      <Topbar
        pageTitle="Clientes"
        pageSubtitle={`${from} → ${to}`}
        showPeriodSelector
        showExportButton
      />

      <div style={{ padding: '14px 16px' }}>
        <CustomersOverview
          tableCustomers={tableCustomers}
          tableTotal={tableTotal ?? 0}
          tablePage={cpage}
          tablePageSize={TABLE_PAGE_SIZE}
          tableQ={q}
          tableCtype={ctype}
          tableClabel={clabel}
          tableCiscompany={ciscompany}
          customers={customers}
          prevCustomers={prevCustomers}
          customerTypes={customerTypes}
          customerLabels={customerLabels}
          rfmCustomers={rfmCustomers}
          from={from}
          to={to}
          prevFrom={prevFrom}
          prevTo={prevTo}
        />
      </div>
    </>
  )
}
