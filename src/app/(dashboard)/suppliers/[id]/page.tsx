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

  // Products associated with this supplier
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: products } = await (supabaseAdmin as any)
    .from('products')
    .select('id, name, sku, sale_price, unit_cost, current_stock, unit_label, product_type, is_active')
    .eq('supplier_id', id)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('name', { ascending: true })
    .limit(100)

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
          userRole={userData?.role ?? 'operator'}
        />
      </div>
    </>
  )
}
