import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import ReceivablesOverview from '@/components/receivables/ReceivablesOverview'
import { getDefaultDateRange } from '@/lib/dateUtils'

export const dynamic    = 'force-dynamic'
export const revalidate = 0

export default async function ReceivablesPage({
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

  // Todos los AR del período + los pendientes fuera del período
  const { data: arData } = await supabase
    .from('accounts_receivable')
    .select('id, sale_id, customer_id, amount, amount_paid, balance, issue_date, due_date, status, invoice_ref, notes, customers(full_name)')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('due_date', { ascending: true })

  const records = arData ?? []
  const today   = new Date().toISOString().slice(0, 10)

  const pending    = records.filter(r => !['paid','cancelled'].includes(r.status))
  const paid       = records.filter(r => r.status === 'paid' && r.due_date >= from && r.due_date <= to)

  const totalPendiente = pending.reduce((s, r) => s + (r.balance as number ?? 0), 0)
  const totalVencido   = pending.filter(r => r.due_date < today).reduce((s, r) => s + (r.balance as number ?? 0), 0)
  const totalCobrado   = paid.reduce((s, r) => s + (r.amount_paid ?? 0), 0)

  return (
    <>
      <Topbar pageTitle="CxC — Cuentas por Cobrar" pageSubtitle={`${from} → ${to}`} showPeriodSelector />
      <div style={{ padding: '14px 16px' }}>
        <ReceivablesOverview
          records={records as unknown as Parameters<typeof ReceivablesOverview>[0]['records']}
          userRole={userData?.role ?? 'viewer'}
          kpis={{
            totalPendiente,
            totalVencido,
            totalCobrado,
            countPendiente: pending.length,
          }}
        />
      </div>
    </>
  )
}
