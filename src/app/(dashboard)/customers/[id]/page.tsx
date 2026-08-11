import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserData } from '@/lib/queries/getUser'
import Topbar from '@/components/layout/Topbar'
import CustomerDetailView from '@/components/customers/CustomerDetailView'

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const userData = await getUserData()
  if (!userData?.company_id) redirect('/login')

  const companyId = userData.company_id
  const userRole = userData.role ?? 'operator'
  const supabase = await createClient()

  // ── Customer ──────────────────────────────────────────────────────────────
  const { data: customer, error } = await supabase
    .from('customers')
    .select(
      'id, full_name, mobile, phone, email, tax_id, id_type, customer_type, label, lifetime_value, last_purchase_at, registered_since, is_company, contact_name, contact_phone, contact_email, address, created_at'
    )
    .eq('id', id)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .single()

  if (error || !customer) notFound()

  // ── Sales history ─────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: salesData } = await (supabase as any)
    .from('sales')
    .select(
      `id, sale_date, status, gross_total, discount_amount, lines_per_order,
       branches(name), sales_channels(name),
       sale_items(id, quantity, unit_price, subtotal, deleted_at, products(name, sku))`
    )
    .eq('customer_id', id)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('sale_date', { ascending: false })
    .limit(50)

  const sales = (salesData ?? []).map(
    (s: { sale_items: { deleted_at: string | null }[] }) => ({
      ...s,
      sale_items: (s.sale_items ?? []).filter(
        (item: { deleted_at: string | null }) => !item.deleted_at
      ),
    })
  )

  // ── Catalogs ──────────────────────────────────────────────────────────────
  const [{ data: typesList }, { data: labelsList }] = await Promise.all([
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

  const customerTypes = (typesList ?? []) as { id: string; name: string; color: string }[]
  const customerLabels = (labelsList ?? []) as { id: string; name: string; color: string }[]

  return (
    <>
      <Topbar pageTitle={customer.full_name ?? 'Cliente'} pageSubtitle="Ficha de cliente" />
      <CustomerDetailView
        customer={customer}
        sales={sales}
        customerTypes={customerTypes}
        customerLabels={customerLabels}
        userRole={userRole}
        companyId={companyId}
      />
    </>
  )
}
