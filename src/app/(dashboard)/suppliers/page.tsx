import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import SuppliersOverview from '@/components/suppliers/SuppliersOverview'
import { getDefaultDateRange } from '@/lib/dateUtils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  const companyId = userData?.company_id
  const defaults = getDefaultDateRange()
  const from = params.from ?? defaults.from
  const to = params.to ?? defaults.to

  if (!companyId) {
    return (
      <>
        <Topbar pageTitle="Proveedores" pageSubtitle="Directorio" showPeriodSelector />
        <div style={{ padding: '14px 16px' }}>
          <p style={{ fontFamily: 'var(--font-syne)', color: 'var(--muted)', fontSize: 14 }}>
            No tienes una empresa asignada.
          </p>
        </div>
      </>
    )
  }

  const [{ data: movData }, { data: suppliersData }] = await Promise.all([
    supabase
      .from('inventory_movements')
      .select('id, quantity, movement_date, product_id, products(supplier_id)')
      .eq('company_id', companyId)
      .eq('type', 'in')
      .gte('movement_date', from)
      .lte('movement_date', to)
      .limit(2000),
    supabase
      .from('suppliers')
      .select('id, name, products(id)')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('is_active', true),
  ])

  const movements = movData ?? []

  const suppliersWithProducts = suppliersData ?? []
  const suppliersWithActivity = new Set(
    movements
      .map((m) => {
        const p = m.products as unknown as { supplier_id: string | null } | null
        return p?.supplier_id
      })
      .filter(Boolean)
  ).size

  const totalUnitsIn = movements.reduce((s, m) => s + (m.quantity ?? 0), 0)

  return (
    <>
      <Topbar
        pageTitle="Proveedores"
        pageSubtitle={`${from} → ${to}`}
        showPeriodSelector
      />
      <div style={{ padding: '14px 16px', height: 'calc(100vh - 52px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <SuppliersOverview
          companyId={companyId}
          from={from}
          to={to}
          suppliersWithActivity={suppliersWithActivity}
          totalUnitsIn={totalUnitsIn}
          movementsCount={movements.length}
          totalSuppliersWithProducts={suppliersWithProducts.filter(s => (s.products as unknown[]).length > 0).length}
        />
      </div>
    </>
  )
}
