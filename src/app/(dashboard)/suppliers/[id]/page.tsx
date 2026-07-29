import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import Topbar from '@/components/layout/Topbar'
import SupplierDetailView from '@/components/suppliers/SupplierDetailView'

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  const companyId = userData?.company_id
  if (!companyId) redirect('/suppliers')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: supplier } = await (supabaseAdmin as any)
    .from('suppliers')
    .select(
      'id, name, first_name, last_name, is_company, id_type, tax_id, phone, email, address, bank_name, bank_account, account_type, bank_tax_id, is_active, created_at, default_lead_time_days, payment_terms'
    )
    .eq('id', id)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .single()

  if (!supplier) notFound()

  // Products + purchases + payables in parallel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: products }, { data: purchasesData }, { data: payablesData }] = await Promise.all([
    (supabaseAdmin as any)
      .from('products')
      .select('id, name, sku, sale_price, unit_cost, current_stock, unit_label, product_type, is_active')
      .eq('supplier_id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name', { ascending: true })
      .limit(100),
    (supabaseAdmin as any)
      .from('purchases')
      .select('id, purchase_date, total, status, payment_method, notes')
      .eq('supplier_id', id)
      .eq('company_id', companyId)
      .order('purchase_date', { ascending: false })
      .limit(50),
    (supabaseAdmin as any)
      .from('accounts_payable')
      .select('id, amount_due, amount_paid, due_date, status')
      .eq('supplier_id', id)
      .eq('company_id', companyId)
      .in('status', ['pending', 'partial']),
  ])

  const purchases = purchasesData ?? []
  const payables = payablesData ?? []

  const totalPurchased = purchases.reduce((s: number, p: { total: number | null }) => s + (p.total ?? 0), 0)
  const pendingPayable = payables.reduce((s: number, p: { amount_due: number | null; amount_paid: number | null }) => s + ((p.amount_due ?? 0) - (p.amount_paid ?? 0)), 0)
  const lastPurchaseDate = purchases[0]?.purchase_date ?? null

  return (
    <>
      <Topbar
        pageTitle={supplier.name ?? [supplier.first_name, supplier.last_name].filter(Boolean).join(' ')}
        pageSubtitle="Proveedor"
      />
      <div style={{ padding: '14px 16px', overflowY: 'auto', height: 'calc(100vh - 52px)' }}>
        <SupplierDetailView
          supplier={supplier}
          products={products ?? []}
          purchases={purchases}
          totalPurchased={totalPurchased}
          pendingPayable={pendingPayable}
          lastPurchaseDate={lastPurchaseDate}
          userRole={userData?.role ?? 'operator'}
        />
      </div>
    </>
  )
}
