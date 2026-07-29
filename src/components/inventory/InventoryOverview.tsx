'use client'

import { useState, useMemo, useCallback } from 'react'
import KpiCard from '@/components/ui/KpiCard'
import ModuleAiButton from '@/components/ai/ModuleAiButton'
import EmptyState from '@/components/ui/EmptyState'
import ExportButton from '@/components/ui/ExportButton'
import NewProductForm from '@/components/inventory/NewProductForm'
import InventoryTable, { type ProductRow } from '@/components/inventory/InventoryTable'
import AiInsightBox from '@/components/ui/AiInsightBox'
import type { ProductCategory, Supplier } from '@/components/inventory/EditProductModal'

type ProductWithCategory = ProductRow & { category_name?: string }
type Category = { id: string; name: string; parent_id?: string | null }

function calcDelta(current: number, previous: number, hasPrev: boolean): number | undefined {
  if (!hasPrev || previous === 0) return undefined
  return Math.round(((current - previous) / previous) * 100)
}

interface InventoryOverviewProps {
  products: ProductWithCategory[]
  categories: Category[]
  suppliers: Supplier[]
  categoriesMap: Record<string, string>
  userRole: string
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
  suppliers,
  categoriesMap,
  userRole,
  movementsIn,
  movementsOut,
  prevMovementsIn,
  prevMovementsOut,
  from,
  to,
}: InventoryOverviewProps) {
  const [filterText,       setFilterText]       = useState('')
  const [filterCategory,   setFilterCategory]   = useState('')
  const [filterType,       setFilterType]       = useState('')
  const [filterStock,      setFilterStock]      = useState('')
  const [filterPerishable, setFilterPerishable] = useState(false)

  // ── Alertas colapsables (minimizadas por defecto) ───────────────────────
  const [lowStockOpen, setLowStockOpen] = useState(false)
  const [restockOpen,  setRestockOpen]  = useState(false)

  const filteredProducts = useMemo(() => {
    const txt = filterText.toLowerCase()
    return products.filter((p) => {
      if (txt) {
        const n = p.name.toLowerCase()
        const s = (p.sku ?? '').toLowerCase()
        if (!n.includes(txt) && !s.includes(txt)) return false
      }
      if (filterCategory) {
        const cn = p.category_id ? categoriesMap[p.category_id] ?? '' : ''
        if (cn !== filterCategory) return false
      }
      if (filterType && (p.product_type ?? 'product') !== filterType) return false
      if (filterStock) {
        const stock = p.current_stock ?? 0
        const min   = p.min_stock_alert ?? 0
        if (filterStock === 'critical' && !(min > 0 && stock <= min)) return false
        if (filterStock === 'low' && !(min > 0 && stock > min && stock <= min * 2)) return false
        if (filterStock === 'ok' && !(stock > min * 2 || min === 0)) return false
      }
      if (filterPerishable && !p.is_perishable) return false
      return true
    })
  }, [products, categoriesMap, filterText, filterCategory, filterType, filterStock, filterPerishable])

  const physicalProducts = filteredProducts.filter((p) => p.product_type !== 'service')
  const serviceCount     = filteredProducts.filter((p) => p.product_type === 'service').length

  const low_stock_count = physicalProducts.filter(
    (p) => (p.current_stock ?? 0) <= (p.min_stock_alert ?? 0) && (p.min_stock_alert ?? 0) > 0
  ).length

  const frozen_capital = physicalProducts.reduce(
    (s, p) => s + (p.current_stock ?? 0) * (p.unit_cost ?? 0),
    0
  )

  const hasPrevMovements = prevMovementsIn > 0 || prevMovementsOut > 0

  // ── Restock urgency alert ─────────────────────────────────────────────────
  const restockProducts = useMemo(() => {
    return physicalProducts.filter((p) => {
      const stock    = p.current_stock ?? 0
      const minStock = p.min_stock_alert ?? 0
      const leadTime = p.lead_time_days ?? 0
      if (minStock <= 0 || leadTime <= 0) return false
      // días_disponibles = current_stock / (min_stock_alert / 30)
      const dailyUsage = Math.max(minStock / 30, 0.1)
      const daysAvailable = stock / dailyUsage
      return daysAvailable <= leadTime
    })
  }, [physicalProducts])

  const exportData = filteredProducts.map((p) => ({
    Producto:    p.name,
    SKU:         p.sku ?? '',
    Tipo:        p.product_type ?? 'product',
    Unidad:      p.unit_label ?? '',
    Categoría:   p.category_id ? categoriesMap[p.category_id] ?? '' : '',
    Precio:      p.sale_price ?? 0,
    Costo:       p.unit_cost ?? 0,
    'Valor stock': (p.current_stock ?? 0) * (p.unit_cost ?? 0),
    Stock:       p.current_stock ?? 0,
    Mín:         p.min_stock_alert ?? 0,
    'Lead time': p.lead_time_days ?? 0,
    Perecedero:  p.is_perishable ? 'Sí' : 'No',
    'Caducidad': p.expiry_date ?? '',
  }))

  function handleFilterChange(
    text: string,
    category: string,
    type: string,
    stock: string,
    perishable: boolean
  ) {
    setFilterText(text)
    setFilterCategory(category)
    setFilterType(type)
    setFilterStock(stock)
    setFilterPerishable(perishable)
  }

  // Cast categories for ProductCategory prop (same shape)
  const productCategories: ProductCategory[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    parent_id: c.parent_id,
  }))

  const getModuleData = useCallback(() => ({
    totalProductos: physicalProducts.length,
    servicios: serviceCount,
    stockBajo: low_stock_count,
    capitalEnStock: parseFloat(frozen_capital.toFixed(2)),
    entradasPeriodo: movementsIn,
    salidasPeriodo: movementsOut,
    productosRestock: restockProducts.slice(0, 10).map(p => ({
      nombre: p.name,
      stockActual: p.current_stock,
      minimo: p.min_stock_alert,
      leadTimeDias: p.lead_time_days,
    })),
    productosCriticos: physicalProducts
      .filter(p => (p.current_stock ?? 0) <= (p.min_stock_alert ?? 0) && (p.min_stock_alert ?? 0) > 0)
      .slice(0, 10)
      .map(p => ({
        nombre: p.name,
        stockActual: p.current_stock,
        minimo: p.min_stock_alert,
        capitalParalizado: parseFloat(((p.current_stock ?? 0) * (p.unit_cost ?? 0)).toFixed(2)),
      })),
  }), [physicalProducts, serviceCount, low_stock_count, frozen_capital, movementsIn, movementsOut, restockProducts])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* KPIs + botón IA en la misma fila */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: 8, alignItems: 'stretch', flexShrink: 0 }}>
        <KpiCard label="Productos activos" value={physicalProducts.length} />
        <KpiCard
          label="Entradas (período)"
          value={movementsIn}
          delta={calcDelta(movementsIn, prevMovementsIn, hasPrevMovements)}
          compare={prevMovementsIn > 0 ? `Ant: ${prevMovementsIn}` : undefined}
        />
        <KpiCard
          label="Salidas (período)"
          value={movementsOut}
          delta={calcDelta(movementsOut, prevMovementsOut, hasPrevMovements)}
          compare={prevMovementsOut > 0 ? `Ant: ${prevMovementsOut}` : undefined}
        />
        <KpiCard label="Capital en stock" prefix="$" value={Math.round(frozen_capital)} isGold />
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ModuleAiButton module="inventory" getModuleData={getModuleData} />
        </div>
      </div>

      {/* Alertas colapsables */}
      {(low_stock_count > 0 || restockProducts.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          {/* Low-stock alert (colapsable) */}
          {low_stock_count > 0 && (
            <CollapsibleAlert
              open={lowStockOpen}
              onToggle={() => setLowStockOpen((v) => !v)}
              variant="orange"
              icon="⚠"
              title={`${low_stock_count} producto${low_stock_count > 1 ? 's' : ''} con stock bajo`}
            >
              <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>
                Tienes productos por debajo del mínimo. Los marcados en rojo requieren reposición pronto.
              </p>
            </CollapsibleAlert>
          )}

          {/* Restock urgency panel (colapsable) */}
          {restockProducts.length > 0 && (
            <CollapsibleAlert
              open={restockOpen}
              onToggle={() => setRestockOpen((v) => !v)}
              variant="red"
              icon="🚨"
              title={`${restockProducts.length} producto${restockProducts.length !== 1 ? 's' : ''} necesita${restockProducts.length !== 1 ? 'n' : ''} reposición urgente`}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {restockProducts.slice(0, 8).map((p) => {
                  const stock    = p.current_stock ?? 0
                  const minStock = p.min_stock_alert ?? 0
                  const unitLbl  = p.unit_label ?? 'uds.'
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text2)', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text)', minWidth: 0, flex: '0 0 auto', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </span>
                      <span style={{ color: 'var(--red)' }}>
                        Stock: {stock.toLocaleString('es-EC', { maximumFractionDigits: 2 })} {unitLbl}
                      </span>
                      <span style={{ color: 'var(--muted)' }}>·</span>
                      <span>Mín: {minStock.toLocaleString('es-EC', { maximumFractionDigits: 2 })} {unitLbl}</span>
                      <span style={{ color: 'var(--muted)' }}>·</span>
                      <span>Reposición: {p.lead_time_days}d</span>
                    </div>
                  )
                })}
                {restockProducts.length > 8 && (
                  <p style={{ fontSize: 10, color: 'var(--muted)', margin: '4px 0 0' }}>
                    +{restockProducts.length - 8} más
                  </p>
                )}
              </div>
            </CollapsibleAlert>
          )}
        </div>
      )}

      {/* Catalog card */}
      <div style={{ borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', padding: '12px 16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexShrink: 0 }}>
          <div>
            <h2 className="font-syne font-bold" style={{ fontSize: 14, color: 'var(--text)', margin: 0 }}>
              Catálogo de productos
            </h2>
            {serviceCount > 0 && (
              <p style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 0' }}>
                {serviceCount} servicio{serviceCount !== 1 ? 's' : ''} incluido{serviceCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ExportButton data={exportData} filename={`inventario_${from}_${to}`} sheetName="Productos" />
            <NewProductForm categories={categories} suppliers={suppliers} />
          </div>
        </div>

        {products.length === 0 ? (
          <EmptyState
            icon="📦"
            title="Aún no tienes productos registrados"
            description="El inventario es el corazón del negocio — aquí controlas qué tienes, cuánto cuesta y cuándo se está agotando. Lumio te avisa cuando el stock baja del mínimo que tú defines."
            tip="Agrega tus productos con el costo y el precio de venta. Con esos datos, Lumio puede calcular tu margen real y detectar qué productos te generan más ganancia."
            action={{ label: '+ Agregar primer producto', href: '/settings/products' }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <InventoryTable
              products={products}
              categories={productCategories}
              suppliers={suppliers}
              categoriesMap={categoriesMap}
              userRole={userRole}
              filterText={filterText}
              filterCategory={filterCategory}
              filterType={filterType}
              filterStock={filterStock}
              filterPerishable={filterPerishable}
              onFilterChange={handleFilterChange}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Componente: alerta colapsable ────────────────────────────────────────────

type AlertVariant = 'red' | 'orange'

const ALERT_VARIANT_STYLES: Record<AlertVariant, { bg: string; border: string; color: string }> = {
  red:    { bg: 'rgba(220,38,38,0.05)', border: 'rgba(220,38,38,0.22)', color: 'var(--red)'    },
  orange: { bg: 'rgba(217,119,6,0.06)', border: 'rgba(217,119,6,0.25)', color: 'var(--orange)' },
}

function CollapsibleAlert({
  open,
  onToggle,
  variant,
  icon,
  title,
  children,
}: {
  open: boolean
  onToggle: () => void
  variant: AlertVariant
  icon: string
  title: string
  children: React.ReactNode
}) {
  const styles = ALERT_VARIANT_STYLES[variant]
  return (
    <div
      style={{
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '10px 14px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'var(--font-syne)',
        }}
      >
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: styles.color, flex: 1 }}>
          {title}
        </span>
        <span
          style={{
            fontSize: 11,
            color: styles.color,
            opacity: 0.75,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.18s ease',
            display: 'inline-block',
            lineHeight: 1,
          }}
          aria-hidden
        >
          ▾
        </span>
      </button>
      {open && (
        <div style={{ padding: '0 14px 12px' }}>
          {children}
        </div>
      )}
    </div>
  )
}
