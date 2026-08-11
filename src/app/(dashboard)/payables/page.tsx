import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import PayablesOverview from '@/components/payables/PayablesOverview'
import { getDefaultDateRange } from '@/lib/dateUtils'

export const dynamic    = 'force-dynamic'
export const revalidate = 0

export default async function PayablesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const params   = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('company_id, role').eq('id', user.id).single()
  const companyId = userData?.company_id
  if (!companyId) redirect('/dashboard')

  const defaults = getDefaultDateRange()
  const from = params.from ?? defaults.from
  const to   = params.to   ?? defaults.to

  const { data: apData } = await supabase
    .from('accounts_payable')
    .select('id, purchase_id, supplier_id, amount, amount_paid, balance, issue_date, due_date, status, notes, suppliers(name)')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('due_date', { ascending: true })
    .limit(500)

  const records = apData ?? []
  const today   = new Date().toISOString().slice(0, 10)

  const pending = records.filter(r => r.status !== 'paid')
  const paid    = records.filter(r => r.status === 'paid' && r.due_date >= from && r.due_date <= to)

  const totalPendiente = pending.reduce((s, r) => s + (r.balance as number ?? 0), 0)
  const totalVencido   = pending.filter(r => r.due_date < today).reduce((s, r) => s + (r.balance as number ?? 0), 0)
  const totalPagado    = paid.reduce((s, r) => s + (r.amount ?? 0), 0)

  return (
    <>
      <Topbar pageTitle="CxP — Cuentas por Pagar" pageSubtitle={`${from} → ${to}`} showPeriodSelector />
      <div style={{ padding: '14px 16px' }}>
        <PayablesOverview
          records={records as unknown as Parameters<typeof PayablesOverview>[0]['records']}
          userRole={userData?.role ?? 'viewer'}
          kpis={{
            totalPendiente,
            totalVencido,
            totalPagado,
            countPendiente: pending.length,
          }}
        />
      </div>
    </>
  )
}
