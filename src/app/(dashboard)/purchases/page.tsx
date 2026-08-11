import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import PurchasesOverview from '@/components/purchases/PurchasesOverview'
import { getDefaultDateRange } from '@/lib/dateUtils'

export const dynamic   = 'force-dynamic'
export const revalidate = 0

export default async function PurchasesPage({
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

  const [{ data: purchasesData }, { data: suppliersData }, { data: apData }] = await Promise.all([
    supabase
      .from('purchases')
      .select('id, purchase_date, invoice_ref, subtotal, tax_amount, total, payment_method, credit_days, status, notes, suppliers(id,name)')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .gte('purchase_date', from)
      .lte('purchase_date', to)
      .order('purchase_date', { ascending: false }),
    supabase
      .from('suppliers')
      .select('id, name')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('accounts_payable')
      .select('id, purchase_id, amount, amount_paid, balance, status, due_date')
      .eq('company_id', companyId)
      .is('deleted_at', null),
  ])

  const purchases = purchasesData ?? []
  const suppliers = suppliersData ?? []
  const apRecords = apData ?? []

  const totalComprado     = purchases.reduce((s, p) => s + (p.total ?? 0), 0)
  const totalPendienteCxP = apRecords
    .filter(r => ['pending', 'partial', 'overdue'].includes(r.status))
    .reduce((s, r) => s + (r.balance as number ?? 0), 0)

  return (
    <>
      <Topbar pageTitle="Compras" pageSubtitle={`${from} → ${to}`} showPeriodSelector />
      <div style={{ padding: '14px 16px' }}>
        <PurchasesOverview
          key={`${from}-${to}`}
          companyId={companyId}
          userRole={userData?.role ?? 'viewer'}
          from={from}
          to={to}
          purchases={purchases as unknown as Parameters<typeof PurchasesOverview>[0]['purchases']}
          suppliers={suppliers}
          apRecords={apRecords as unknown as Parameters<typeof PurchasesOverview>[0]['apRecords']}
          kpis={{ totalComprado, totalPendienteCxP, countPurchases: purchases.length }}
        />
      </div>
    </>
  )
}
