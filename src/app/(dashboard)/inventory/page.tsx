import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import KpiCard from '@/components/ui/KpiCard'
import AiInsightBox from '@/components/ui/AiInsightBox'
import NewProductForm from '@/components/inventory/NewProductForm'
import AddMovementForm from '@/components/inventory/AddMovementForm'

export default async function InventoryPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const companyId = userData?.company_id

  if (!companyId) {
    return (
      <>
        <Topbar pageTitle="Inventario" pageSubtitle="Productos y stock" />
        <div style={{ padding: 20 }}>
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

  const { data: productsList } = await supabase
    .from('products')
    .select('id, name, sku, sale_price, unit_cost, current_stock, min_stock_alert, lead_time_days, category_id, is_active')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('name', { ascending: true })
    .limit(100)

  const { data: categoriesList } = await supabase
    .from('product_categories')
    .select('id, name')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('name')

  const products = productsList ?? []
  const categories = categoriesList ?? []
  const categoriesMap = Object.fromEntries(categories.map((c) => [c.id, c.name]))

  const total_products = products.length
  const low_stock_count = products.filter(
    (p) =>
      (p.current_stock ?? 0) <= (p.min_stock_alert ?? 0) &&
      (p.min_stock_alert ?? 0) > 0
  ).length
  const frozen_capital = products.reduce(
    (sum, p) => sum + (p.current_stock ?? 0) * (p.unit_cost ?? 0),
    0
  )
  const out_of_stock = products.filter((p) => (p.current_stock ?? 0) === 0).length

  return (
    <>
      <Topbar pageTitle="Inventario" pageSubtitle="Productos y stock" />

      <div
        style={{
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Grid 4 KpiCards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
          }}
        >
          <KpiCard label="Productos activos" value={total_products} />
          <KpiCard label="Stock bajo" value={low_stock_count} />
          <KpiCard label="Sin stock" value={out_of_stock} />
          <KpiCard
            label="Capital en stock"
            prefix="$"
            value={frozen_capital.toFixed(2)}
            isGold
          />
        </div>

        {/* AiInsightBox si hay productos con stock bajo */}
        {low_stock_count > 0 && (
          <AiInsightBox
            variant="red"
            title={`⚠ ${low_stock_count} producto${low_stock_count > 1 ? 's' : ''} con stock bajo`}
            text="Tienes productos por debajo del mínimo. Revisa la columna Stock — los marcados en rojo requieren reposición pronto."
          />
        )}

        {/* Card tabla de productos */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <h2
              className="font-syne font-bold"
              style={{ fontSize: 16, color: 'var(--text)' }}
            >
              Catálogo de productos
            </h2>
            <NewProductForm categories={categories} />
          </div>

          {products.length === 0 ? (
            <AiInsightBox
              variant="blue"
              title="Sin productos registrados"
              text="Agrega tu primer producto usando el botón '+ Nuevo producto'."
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                }}
              >
                <thead>
                  <tr>
                    {['Producto', 'SKU', 'Categoría', 'Precio', 'Costo', 'Stock', 'Mín.', 'Lead time', 'Acción'].map((h) => (
                      <th
                        key={h}
                        style={{
                          fontSize: 11,
                          color: 'var(--muted)',
                          fontWeight: 600,
                          padding: '10px 12px',
                          textAlign: 'left',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const stock = p.current_stock ?? 0
                    const minAlert = p.min_stock_alert ?? 0
                    const isLowStock = stock <= minAlert && minAlert > 0
                    const isOutOfStock = stock === 0
                    const leadDays = p.lead_time_days ?? 0
                    return (
                      <tr
                        key={p.id}
                        style={{
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        <td style={{ fontSize: 12, padding: '10px 12px', color: 'var(--text)' }}>
                          {p.name}
                        </td>
                        <td style={{ fontSize: 12, padding: '10px 12px', color: 'var(--text2)' }}>
                          {p.sku ?? '—'}
                        </td>
                        <td style={{ fontSize: 12, padding: '10px 12px', color: 'var(--text2)' }}>
                          {p.category_id ? categoriesMap[p.category_id] ?? '—' : '—'}
                        </td>
                        <td style={{ fontSize: 12, padding: '10px 12px', color: 'var(--text2)' }}>
                          $ {(p.sale_price ?? 0).toLocaleString('es-EC')}
                        </td>
                        <td style={{ fontSize: 12, padding: '10px 12px', color: 'var(--text2)' }}>
                          $ {(p.unit_cost ?? 0).toLocaleString('es-EC')}
                        </td>
                        <td style={{ fontSize: 12, padding: '10px 12px' }}>
                          {isOutOfStock ? (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 500,
                                background: 'rgba(220,38,38,0.1)',
                                color: 'var(--red)',
                              }}
                            >
                              Sin stock
                            </span>
                          ) : (
                            <span
                              style={{
                                fontWeight: isLowStock ? 700 : 400,
                                color: isLowStock ? 'var(--red)' : 'var(--text)',
                              }}
                            >
                              {stock}
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: 12, padding: '10px 12px', color: 'var(--text2)' }}>
                          {minAlert}
                        </td>
                        <td style={{ fontSize: 12, padding: '10px 12px', color: 'var(--text2)' }}>
                          {leadDays} día{leadDays !== 1 ? 's' : ''}
                        </td>
                        <td style={{ fontSize: 12, padding: '10px 12px' }}>
                          <AddMovementForm
                            product={{
                              id: p.id,
                              name: p.name,
                              current_stock: stock,
                            }}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
