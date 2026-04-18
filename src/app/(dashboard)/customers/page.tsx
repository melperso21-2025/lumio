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

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
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

  const CUSTOMER_SELECT =
    'id, full_name, phone, email, tax_id, id_type, customer_type, label, lifetime_value, last_purchase_at, registered_since, is_company, contact_name, address, created_at'

  const [
    { data: customersList },
    { data: prevCustomersList },
    { data: typesList },
    { data: labelsList },
  ] = await Promise.all([
    supabase
      .from('customers')
      .select(CUSTOMER_SELECT)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .gte('registered_since', from)
      .lte('registered_since', to)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('customers')
      .select(CUSTOMER_SELECT)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .gte('registered_since', prevFrom)
      .lte('registered_since', prevTo)
      .order('created_at', { ascending: false })
      .limit(500),
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
  ])

  const customers = (customersList ?? []) as Parameters<
    typeof CustomersOverview
  >[0]['customers']
  const prevCustomers = (prevCustomersList ?? []) as typeof customers
  const customerTypes = (typesList ?? []) as { id: string; name: string; color: string }[]
  const customerLabels = (labelsList ?? []) as { id: string; name: string; color: string }[]

  return (
    <>
      <Topbar
        pageTitle="Clientes"
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
        <CustomersOverview
          customers={customers}
          prevCustomers={prevCustomers}
          customerTypes={customerTypes}
          customerLabels={customerLabels}
          from={from}
          to={to}
          prevFrom={prevFrom}
          prevTo={prevTo}
        />
      </div>
    </>
  )
}
