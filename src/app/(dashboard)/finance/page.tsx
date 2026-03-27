import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import FinanceOverview from '@/components/finance/FinanceOverview'
import { getDefaultDateRange } from '@/lib/dateUtils'

export default async function FinancePage({
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

  // Período anterior: YTD si from es 1 ene, sino rolling
  const fromDate = new Date(from + 'T12:00:00')
  const toDate = new Date(to + 'T12:00:00')
  const isYTD = fromDate.getMonth() === 0 && fromDate.getDate() === 1

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
          pageTitle="Bancos & Finanzas"
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

  const { data: accountsList } = await supabase
    .from('bank_accounts')
    .select(
      'id, bank_name, account_type, account_number, initial_balance, current_balance, is_active'
    )
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('bank_name')

  const { data: txList } = await supabase
    .from('bank_transactions')
    .select('id, account_id, type, amount, category, concept, tx_date, is_fixed')
    .eq('company_id', companyId)
    .gte('tx_date', from)
    .lte('tx_date', to)
    .order('tx_date', { ascending: false })
    .limit(200)

  const { data: prevTxList } = await supabase
    .from('bank_transactions')
    .select('id, account_id, type, amount, category, concept, tx_date, is_fixed')
    .eq('company_id', companyId)
    .gte('tx_date', prevFrom)
    .lte('tx_date', prevTo)
    .order('tx_date', { ascending: false })
    .limit(200)

  const accounts = accountsList ?? []
  const transactions = txList ?? []
  const prevTransactions = prevTxList ?? []

  return (
    <>
      <Topbar
        pageTitle="Bancos & Finanzas"
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
        <FinanceOverview
          accounts={accounts}
          transactions={transactions}
          prevTransactions={prevTransactions}
          from={from}
          to={to}
          prevFrom={prevFrom}
          prevTo={prevTo}
        />
      </div>
    </>
  )
}
