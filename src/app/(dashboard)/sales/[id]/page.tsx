import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserData } from '@/lib/queries/getUser'
import Topbar from '@/components/layout/Topbar'
import SaleDetailView, {
  type SaleForDetail,
  type MovementDetail,
} from './SaleDetailView'

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const userData = await getUserData()
  if (!userData?.company_id) redirect('/login')

  const companyId = userData.company_id
  const userRole = userData.role ?? 'seller'
  const supabase = await createClient()

  // ── Main sale query (sales + joins typed; sale_items via as-any) ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawSale, error } = await (supabase as any)
    .from('sales')
    .select(`
      id, sale_date, week_number, year, status,
      gross_total, discount_amount, production_cost, lines_per_order,
      customer_id, branch_id, channel_id,
      customers(full_name),
      branches(name),
      sales_channels(name),
      sale_items(
        id, quantity, unit_price, unit_cost,
        discount_amount, subtotal, deleted_at,
        products(name, sku)
      )
    `)
    .eq('id', id)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .single()

  if (error || !rawSale) notFound()

  // Filter soft-deleted lines (PostgREST can't filter embedded IS NULL inline)
  const sale: SaleForDetail = {
    ...rawSale,
    sale_items: (rawSale.sale_items ?? []).filter(
      (item: { deleted_at: string | null }) => !item.deleted_at
    ),
  }

  // ── Inventory movements ──────────────────────────────────────────
  const { data: movementsData } = await supabase
    .from('inventory_movements')
    .select('type, quantity, movement_date, notes, reason, products(sku)')
    .like('notes', `%${id}%`)
    .eq('company_id', companyId)
    .order('movement_date', { ascending: false })

  const movements = (movementsData ?? []) as unknown as MovementDetail[]

  // ── Lists needed by EditSaleModal ────────────────────────────────
  const [{ data: customersList }, { data: branchesList }, { data: channelsList }] =
    await Promise.all([
      supabase
        .from('customers')
        .select('id, full_name')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('full_name', { ascending: true })
        .limit(300),
      supabase
        .from('branches')
        .select('id, name')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('name', { ascending: true }),
      supabase
        .from('sales_channels')
        .select('id, name')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('name', { ascending: true }),
    ])

  return (
    <>
      <Topbar pageTitle={`Venta #${id.slice(0, 8).toUpperCase()}`} />
      <SaleDetailView
        sale={sale}
        movements={movements}
        userRole={userRole}
        companyId={companyId}
        customers={(customersList ?? []) as { id: string; full_name: string | null }[]}
        branches={(branchesList ?? []) as { id: string; name: string }[]}
        channels={(channelsList ?? []) as { id: string; name: string }[]}
      />
    </>
  )
}
