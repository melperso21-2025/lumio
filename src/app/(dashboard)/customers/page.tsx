import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import CustomersOverview from '@/components/customers/CustomersOverview'
import { getDefaultDateRange } from '@/lib/dateUtils'

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

  // Período anterior para deltas:
  // - Si from es 1 de enero → YTD: comparar con mismo período año anterior
  // - Si no → rolling: período de igual duración inmediatamente anterior
  const fromDate = new Date(from + 'T12:00:00')
  const toDate = new Date(to + 'T12:00:00')
  const isYTD =
    fromDate.getMonth() === 0 && fromDate.getDate() === 1

  let prevFrom: string
  let prevTo: string

  if (isYTD) {
    prevFrom = `${fromDate.getFullYear() - 1}-01-01`
    const prevToDate = new Date(toDate)
    prevToDate.setFullYear(fromDate.getFullYear() - 1)
    prevTo = prevToDate.toISOString().slice(0, 10)
  } else {
    const daysDiff =
      Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1
    const prevToDate = new Date(fromDate)
    prevToDate.setDate(prevToDate.getDate() - 1)
    const prevFromDate = new Date(prevToDate)
    prevFromDate.setDate(prevFromDate.getDate() - daysDiff + 1)
    prevFrom = prevFromDate.toISOString().slice(0, 10)
    prevTo = prevToDate.toISOString().slice(0, 10)
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

  const { data: customersList } = await supabase
    .from('customers')
    .select(
      'id, full_name, phone, email, customer_type, label, lifetime_value, last_purchase_at, registered_since, created_at'
    )
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .gte('registered_since', from)
    .lte('registered_since', to)
    .order('created_at', { ascending: false })
    .limit(200)

  const customers = customersList ?? []

  const { data: prevCustomersList } = await supabase
    .from('customers')
    .select(
      'id, full_name, phone, email, customer_type, label, lifetime_value, last_purchase_at, registered_since, created_at'
    )
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .gte('registered_since', prevFrom)
    .lte('registered_since', prevTo)
    .order('created_at', { ascending: false })
    .limit(200)

  const prevCustomers = prevCustomersList ?? []

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
          padding: 20,
          height: 'calc(100vh - 52px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <CustomersOverview
          customers={customers}
          prevCustomers={prevCustomers}
          from={from}
          to={to}
          prevFrom={prevFrom}
          prevTo={prevTo}
        />
      </div>
    </>
  )
}
