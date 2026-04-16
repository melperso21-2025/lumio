'use client'

import { useState, useMemo } from 'react'
import KpiCard from '@/components/ui/KpiCard'
import ExportButton from '@/components/ui/ExportButton'
import NewProductForm from '@/components/inventory/NewProductForm'
import InventoryTable from '@/components/inventory/InventoryTable'
import AiInsightBox from '@/components/ui/AiInsightBox'

type ProductRow = {
  id: string
  name: string
  sku: string | null
  sale_price: number | null
  unit_cost: number | null
  current_stock: number | null
  min_stock_alert: number | null
  lead_time_days: number | null
  category_id: string | null
  is_active: boolean
}

type ProductWithCategory = ProductRow & { category_name?: string }

type Category = { id: string; name: string }

function calcDelta(
  current: number,
  previous: number,
  hasPrevData: boolean
): number | undefined {
  if (!hasPrevData || previous === 0) return undefined
  return Math.round(((current - previous) / previous) * 100)
}

interface InventoryOverviewProps {
  products: ProductWithCategory[]
  categories: Category[]
  categoriesMap: Record<string, string>
  movementsIn: number
  movementsOut: number
  prevMovementsIn: number
  prevMovementsOut: number
  from: string
  to: string
  prevFrom: string
  prevTo: string
}

export default function InventoryOverview({
  products,
  categories,
  categoriesMap,
  movementsIn,
  movementsOut,
  prevMovementsIn,
  prevMovementsOut,
  from,
  to,
  prevFrom,
  prevTo,
}: InventoryOverviewProps) {
  const [filterProduct, setFilterProduct] = useState<string>('')
  const [filterSku, setFilterSku] = useState<string>('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterAccion, setFilterAccion] = useState<string>('')

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const name = (p.name ?? '').toLowerCase()
      const skuStr = (p.sku ?? '').toLowerCase()
      const catName = p.category_id ? categoriesMap[p.category_id] ?? '' : ''
      const stock = p.current_stock ?? 0
      const minAlert = p.min_stock_alert ?? 0
      let accion = 'ok'
      if (stock === 0) accion = 'out'
      else if (minAlert > 0 && stock <= minAlert) accion = 'low'
      if (filterProduct && !name.includes(filterProduct.toLowerCase()))
        return false
      if (filterSku && !skuStr.includes(filterSku.toLowerCase())) return false
      if (filterCategory) {
        if (filterCategory === 'Sin categoría') {
          if (p.category_id && categoriesMap[p.category_id]) return false
        } else {
          if (catName !== filterCategory) return false
        }
      }
      if (filterAccion && accion !== filterAccion) return false
      return true
    })
  }, [products, categoriesMap, filterProduct, filterSku, filterCategory, filterAccion])

  const total_products = filteredProducts.length
  const low_stock_count = filteredProducts.filter(
    (p) =>
      (p.current_stock ?? 0) <= (p.min_stock_alert ?? 0) &&
      (p.min_stock_alert ?? 0) > 0
  ).length
  const frozen_capital = filteredProducts.reduce(
    (s, p) => s + (p.current_stock ?? 0) * (p.unit_cost ?? 0),
    0
  )

  const hasPrevMovements = prevMovementsIn > 0 || prevMovementsOut > 0

  const exportData = filteredProducts.map((p) => ({
    Producto: p.name,
    SKU: p.sku ?? '',
    Categoría: p.category_id ? categoriesMap[p.category_id] ?? '' : '',
    Precio: p.sale_price ?? 0,
    Costo: p.unit_cost ?? 0,
    'Valor stock': (p.current_stock ?? 0) * (p.unit_cost ?? 0),
    Stock: p.current_stock ?? 0,
    Mín: p.min_stock_alert ?? 0,
    'Lead time': p.lead_time_days ?? 0,
  }))

  function handleFilterChange(
    product: string,
    sku: string,
    category: string,
    accion: string
  ) {
    setFilterProduct(product)
    setFilterSku(sku)
    setFilterCategory(category)
    setFilterAccion(accion)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        flex: 1,
        minHeight: 0,
      }}
    >
      {/* KPIs con deltas (entradas/salidas) y estáticos */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <KpiCard label="Productos activos" value={total_products} />
        <KpiCard
          label="Entradas (período)"
          value={movementsIn}
          delta={calcDelta(movementsIn, prevMovementsIn, hasPrevMovements)}
          compare={
            prevMovementsIn > 0 ? `Ant: ${prevMovementsIn}` : undefined
          }
        />
        <KpiCard
          label="Salidas (período)"
          value={movementsOut}
          delta={calcDelta(movementsOut, prevMovementsOut, hasPrevMovements)}
          compare={
            prevMovementsOut > 0 ? `Ant: ${prevMovementsOut}` : undefined
          }
        />
        <KpiCard
          label="Capital en stock"
          prefix="$"
          value={Math.round(frozen_capital)}
          isGold
        />
      </div>

      {/* Alerta stock bajo */}
      {low_stock_count > 0 && (
        <div style={{ flexShrink: 0 }}>
          <AiInsightBox
            variant="red"
            title={`⚠ ${low_stock_count} producto${
              low_stock_count > 1 ? 's' : ''
            } con stock bajo`}
            text="Tienes productos por debajo del mínimo. Revisa la columna Stock — los marcados en rojo requieren reposición pronto."
          />
        </div>
      )}

      {/* Card catálogo */}
      <div
        style={{
          borderRadius: 12,
          background: 'var(--card)',
          border: '1px solid var(--border)',
          padding: '14px 16px',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
            flexShrink: 0,
          }}
        >
          <h2
            className="font-syne font-bold"
            style={{ fontSize: 16, color: 'var(--text)' }}
          >
            Catálogo de productos
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ExportButton
              data={exportData}
              filename={`inventario_${from}_${to}`}
              sheetName="Productos"
            />
            <NewProductForm categories={categories} />
          </div>
        </div>

        {products.length === 0 ? (
          <AiInsightBox
            variant="blue"
            title="Sin productos registrados"
            text="Agrega tu primer producto usando el botón '+ Nuevo producto'."
          />
        ) : (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <InventoryTable
              products={products}
              categoriesMap={categoriesMap}
              filterProduct={filterProduct}
              filterSku={filterSku}
              filterCategory={filterCategory}
              filterAccion={filterAccion}
              onFilterChange={handleFilterChange}
            />
          </div>
        )}
      </div>
    </div>
  )
}
