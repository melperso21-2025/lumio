import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import Topbar from '@/components/layout/Topbar'
import ProductDetailView from '@/components/inventory/ProductDetailView'

export default async function ProductDetailPage({
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

  if (!userData?.company_id) redirect('/login')

  const companyId = userData.company_id
  const userRole  = userData.role ?? 'operator'

  // ── Product ───────────────────────────────────────────────────────────────
  const { data: product, error } = await supabaseAdmin
    .from('products')
    .select(
      `id, name, sku, sale_price, unit_cost, supplier_price,
       current_stock, min_stock_alert, lead_time_days,
       category_id, supplier_id, is_active,
       product_type, unit_type, unit_label,
       is_perishable, shelf_life_days, expiry_date,
       product_categories(id, name),
       suppliers(id, name)`
    )
    .eq('id', id)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .single()

  if (error || !product) notFound()

  // ── Movements ─────────────────────────────────────────────────────────────
  const { data: movementsList } = await supabaseAdmin
    .from('inventory_movements')
    .select('id, type, reason, quantity, movement_date, notes, batch_number, created_at')
    .eq('product_id', id)
    .eq('company_id', companyId)
    .order('movement_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100)

  // ── Catalogs for edit modal ───────────────────────────────────────────────
  const [{ data: categoriesList }, { data: suppliersList }] = await Promise.all([
    supabaseAdmin
      .from('product_categories')
      .select('id, name, parent_id')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name'),
    supabaseAdmin
      .from('suppliers')
      .select('id, name')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name'),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prod = product as any

  const categoryName =
    prod.product_categories?.name ??
    (categoriesList ?? []).find((c: { id: string }) => c.id === prod.category_id)?.name ??
    null

  const supplierName = prod.suppliers?.name ?? null

  const productDetail = {
    id:              prod.id,
    name:            prod.name,
    sku:             prod.sku,
    sale_price:      prod.sale_price,
    unit_cost:       prod.unit_cost,
    supplier_price:  prod.supplier_price,
    current_stock:   prod.current_stock,
    min_stock_alert: prod.min_stock_alert,
    lead_time_days:  prod.lead_time_days,
    category_id:     prod.category_id,
    supplier_id:     prod.supplier_id,
    is_active:       prod.is_active,
    product_type:    prod.product_type,
    unit_type:       prod.unit_type,
    unit_label:      prod.unit_label,
    is_perishable:   prod.is_perishable,
    shelf_life_days: prod.shelf_life_days,
    expiry_date:     prod.expiry_date,
    category_name:   categoryName,
    supplier_name:   supplierName,
  }

  return (
    <>
      <Topbar pageTitle={product.name} pageSubtitle="Ficha de producto" />
      <ProductDetailView
        product={productDetail}
        movements={movementsList ?? []}
        categories={categoriesList ?? []}
        suppliers={suppliersList ?? []}
        userRole={userRole}
        companyId={companyId}
      />
    </>
  )
}
