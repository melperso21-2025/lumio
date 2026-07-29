import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import InventoryOverview from '@/components/inventory/InventoryOverview'
import {
  getDefaultDateRange,
  getPreviousPeriodRolling,
  parseLocalDate,
  toLocalISO,
} from '@/lib/dateUtils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function InventoryPage({
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
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  const companyId = userData?.company_id
  const userRole  = userData?.role ?? 'operator'
  const defaults = getDefaultDateRange()
  const from = params.from ?? defaults.from
  const to = params.to ?? defaults.to

  const fromDate = parseLocalDate(from)
  const toDate = parseLocalDate(to)
  const isYTD = fromDate.getMonth() === 0 && fromDate.getDate() === 1

  let prevFrom: string
  let prevTo: string

  if (isYTD) {
    prevFrom = `${fromDate.getFullYear() - 1}-01-01`
    const prevToDate = new Date(toDate)
    prevToDate.setFullYear(fromDate.getFullYear() - 1)
    prevTo = toLocalISO(prevToDate)
  } else {
    const rolling = getPreviousPeriodRolling(from, to)
    prevFrom = rolling.prevFrom
    prevTo = rolling.prevTo
  }

  if (!companyId) {
    return (
      <>
        <Topbar
          pageTitle="Inventario"
          pageSubtitle={`${from} → ${to}`}
          showPeriodSelector
          showExportButton
        />
        <div style={{ padding: '14px 16px' }}>
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

  const [
    { data: productsList },
    { data: categoriesList },
    { data: suppliersList },
    { data: movementsList },
    { data: prevMovementsList },
  ] = await Promise.all([
    supabase
      .from('products')
      .select(
        'id, name, sku, sale_price, unit_cost, supplier_price, current_stock, min_stock_alert, lead_time_days, category_id, supplier_id, is_active, product_type, unit_type, unit_label, is_perishable, shelf_life_days, expiry_date'
      )
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('name', { ascending: true })
      .limit(500),
    supabase
      .from('product_categories')
      .select('id, name, parent_id')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name'),
    supabase
      .from('suppliers')
      .select('id, name')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('name'),
    supabase
      .from('inventory_movements')
      .select('type, quantity')
      .eq('company_id', companyId)
      .gte('movement_date', from)
      .lte('movement_date', to)
      .limit(2000),
    supabase
      .from('inventory_movements')
      .select('type, quantity')
      .eq('company_id', companyId)
      .gte('movement_date', prevFrom)
      .lte('movement_date', prevTo)
      .limit(2000),
  ])

  const products  = productsList ?? []
  const categories = categoriesList ?? []
  const suppliers  = suppliersList ?? []
  const categoriesMap = Object.fromEntries(
    categories.map((c) => [c.id, c.name])
  ) as Record<string, string>

  const movements = movementsList ?? []
  const movementsIn = movements
    .filter((m) => m.type === 'in')
    .reduce((s, m) => s + (m.quantity ?? 0), 0)
  const movementsOut = movements
    .filter((m) => m.type === 'out')
    .reduce((s, m) => s + (m.quantity ?? 0), 0)

  const prevMovements = prevMovementsList ?? []
  const prevMovementsIn = prevMovements
    .filter((m) => m.type === 'in')
    .reduce((s, m) => s + (m.quantity ?? 0), 0)
  const prevMovementsOut = prevMovements
    .filter((m) => m.type === 'out')
    .reduce((s, m) => s + (m.quantity ?? 0), 0)

  return (
    <>
      <Topbar
        pageTitle="Inventario"
        pageSubtitle={`${from} → ${to}`}
        showPeriodSelector
        showExportButton
      />

      <div
        style={{
          height: 'calc(100vh - 52px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <InventoryOverview
          products={products}
          categories={categories}
          suppliers={suppliers}
          categoriesMap={categoriesMap}
          userRole={userRole}
          movementsIn={movementsIn}
          movementsOut={movementsOut}
          prevMovementsIn={prevMovementsIn}
          prevMovementsOut={prevMovementsOut}
          from={from}
          to={to}
          prevFrom={prevFrom}
          prevTo={prevTo}
        />
      </div>
    </>
  )
}
