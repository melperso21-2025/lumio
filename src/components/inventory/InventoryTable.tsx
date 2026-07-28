'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import AddMovementForm from '@/components/inventory/AddMovementForm'
import EditProductModal, {
  type ProductDetail,
  type ProductCategory,
  type Supplier,
} from '@/components/inventory/EditProductModal'

const PAGE_SIZE = 20

// ── Types ──────────────────────────────────────────────────────────────────

export type ProductRow = {
  id: string
  name: string
  sku: string | null
  sale_price: number | null
  unit_cost: number | null
  supplier_price: number | null
  current_stock: number | null
  min_stock_alert: number | null
  lead_time_days: number | null
  category_id: string | null
  supplier_id: string | null
  is_active: boolean
  product_type: string | null
  unit_type: string | null
  unit_label: string | null
  is_perishable: boolean | null
  shelf_life_days: number | null
  expiry_date: string | null
}

type ProductWithCategory = ProductRow & { category_name?: string }

// ── Semaphore helpers ──────────────────────────────────────────────────────

type StockLevel = 'critical' | 'low' | 'ok' | 'service'

function getStockLevel(p: ProductRow): StockLevel {
  if (p.product_type === 'service') return 'service'
  const stock = p.current_stock ?? 0
  const min   = p.min_stock_alert ?? 0
  if (min > 0 && stock <= min)       return 'critical'
  if (min > 0 && stock <= min * 2)   return 'low'
  return 'ok'
}

type ExpiryLevel = 'expired' | 'critical' | 'warn' | 'ok' | 'none'

function getExpiryLevel(p: ProductRow): ExpiryLevel {
  if (!p.is_perishable || !p.expiry_date) return 'none'
  const today = new Date(); today.setHours(0,0,0,0)
  const exp   = new Date(p.expiry_date)
  const diff  = Math.round((exp.getTime() - today.getTime()) / 86_400_000)
  if (diff < 0)   return 'expired'
  if (diff <= 7)  return 'critical'
  if (diff <= 30) return 'warn'
  return 'ok'
}

const STOCK_BADGE: Record<StockLevel, { bg: string; color: string; label: string }> = {
  critical: { bg: 'rgba(220,38,38,0.1)',   color: 'var(--red)',    label: '🔴' },
  low:      { bg: 'rgba(217,119,6,0.1)',   color: 'var(--orange)', label: '🟡' },
  ok:       { bg: 'rgba(5,150,105,0.1)',   color: 'var(--green)',  label: '🟢' },
  service:  { bg: 'var(--hover)',           color: 'var(--muted)',  label: 'N/A' },
}

const EXPIRY_BADGE: Record<ExpiryLevel, { bg: string; color: string }> = {
  expired:  { bg: 'rgba(220,38,38,0.12)',  color: 'var(--red)'    },
  critical: { bg: 'rgba(220,38,38,0.08)',  color: 'var(--red)'    },
  warn:     { bg: 'rgba(217,119,6,0.1)',   color: 'var(--orange)' },
  ok:       { bg: 'rgba(5,150,105,0.08)', color: 'var(--green)'  },
  none:     { bg: 'transparent',           color: 'var(--muted)'  },
}

// ── Sort ───────────────────────────────────────────────────────────────────

type SortKey =
  | 'name' | 'category_name' | 'product_type' | 'unit_label'
  | 'sale_price' | 'unit_cost' | 'current_stock'
  | 'min_stock_alert' | 'expiry_date'

function getSortValue(p: ProductWithCategory, key: SortKey): string | number {
  switch (key) {
    case 'name':          return (p.name ?? '').toLowerCase()
    case 'category_name': return (p.category_name ?? '').toLowerCase()
    case 'product_type':  return p.product_type ?? ''
    case 'unit_label':    return p.unit_label ?? ''
    case 'sale_price':    return p.sale_price ?? 0
    case 'unit_cost':     return p.unit_cost ?? 0
    case 'current_stock': return p.current_stock ?? -1
    case 'min_stock_alert':return p.min_stock_alert ?? -1
    case 'expiry_date':   return p.expiry_date ?? ''
    default:              return ''
  }
}

const COLUMNS: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
  { key: 'name',          label: 'Producto',     align: 'left'  },
  { key: 'product_type',  label: 'Tipo',         align: 'left'  },
  { key: 'unit_label',    label: 'Unidad',       align: 'left'  },
  { key: 'current_stock', label: 'Stock',        align: 'right' },
  { key: 'min_stock_alert',label: 'Mín.',        align: 'right' },
  { key: 'expiry_date',   label: 'Caducidad',    align: 'left'  },
  { key: 'sale_price',    label: 'Precio',       align: 'right' },
  { key: 'unit_cost',     label: 'Costo',        align: 'right' },
  { key: 'category_name', label: 'Categoría',    align: 'left'  },
]

// ── Filter styles ──────────────────────────────────────────────────────────

const fStyle: React.CSSProperties = {
  padding: '5px 10px',
  fontSize: 11,
  borderRadius: 6,
  border: '1px solid var(--border2)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontFamily: 'var(--font-jakarta)',
  minWidth: 100,
}

// ── Props ──────────────────────────────────────────────────────────────────

interface InventoryTableProps {
  products: ProductWithCategory[]
  categories: ProductCategory[]
  suppliers: Supplier[]
  categoriesMap: Record<string, string>
  userRole: string
  filterText: string
  filterCategory: string
  filterType: string
  filterStock: string
  filterPerishable: boolean
  onFilterChange: (
    text: string,
    category: string,
    type: string,
    stock: string,
    perishable: boolean
  ) => void
}

// ── Component ──────────────────────────────────────────────────────────────

export default function InventoryTable({
  products,
  categories,
  suppliers,
  categoriesMap,
  userRole,
  filterText,
  filterCategory,
  filterType,
  filterStock,
  filterPerishable,
  onFilterChange,
}: InventoryTableProps) {
  const router = useRouter()
  const [sortBy, setSortBy]   = useState<SortKey>('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [page, setPage]       = useState(0)

  // Edit modal
  const [editingProduct, setEditingProduct] = useState<ProductDetail | null>(null)

  // Delete confirmation
  const [deletingProduct, setDeletingProduct] = useState<ProductRow | null>(null)
  const [deleteLoading,   setDeleteLoading]   = useState(false)
  const [deleteError,     setDeleteError]     = useState<string | null>(null)

  const canManage = userRole === 'admin' || userRole === 'manager'

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>()
    products.forEach((p) => {
      const n = p.category_id ? categoriesMap[p.category_id] : null
      if (n) set.add(n)
    })
    return Array.from(set).sort()
  }, [products, categoriesMap])

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
        const lvl = getStockLevel(p)
        if (filterStock === 'critical' && lvl !== 'critical') return false
        if (filterStock === 'low' && lvl !== 'low') return false
        if (filterStock === 'ok' && lvl !== 'ok') return false
      }
      if (filterPerishable && !p.is_perishable) return false
      return true
    })
  }, [products, categoriesMap, filterText, filterCategory, filterType, filterStock, filterPerishable])

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      const va = getSortValue(a, sortBy)
      const vb = getSortValue(b, sortBy)
      const cmp =
        typeof va === 'string' && typeof vb === 'string'
          ? va.localeCompare(vb)
          : (va as number) - (vb as number)
      return sortAsc ? cmp : -cmp
    })
  }, [filteredProducts, sortBy, sortAsc])

  const totalPages = Math.ceil(sortedProducts.length / PAGE_SIZE)
  const paginated  = sortedProducts.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  function handleSort(key: SortKey) {
    if (sortBy === key) setSortAsc((p) => !p)
    else { setSortBy(key); setSortAsc(true) }
    setPage(0)
  }

  // ── Alert counts ──────────────────────────────────────────────────────────
  const criticalCount = useMemo(
    () => filteredProducts.filter((p) => getStockLevel(p) === 'critical').length,
    [filteredProducts]
  )
  const expiryAlertCount = useMemo(
    () => filteredProducts.filter((p) => {
      const lvl = getExpiryLevel(p)
      return lvl === 'critical' || lvl === 'expired' || lvl === 'warn'
    }).length,
    [filteredProducts]
  )

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deletingProduct) return
    setDeleteLoading(true); setDeleteError(null)
    try {
      const res = await fetch(`/api/products/${deletingProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleted_at: new Date().toISOString() }),
      })
      const json = await res.json()
      if (!res.ok) { setDeleteError(json.error ?? 'Error al eliminar.'); setDeleteLoading(false); return }
      setDeletingProduct(null)
      router.refresh()
    } catch {
      setDeleteError('Error de red.')
    }
    setDeleteLoading(false)
  }

  const hasActiveFilters = filterText || filterCategory || filterType || filterStock || filterPerishable

  // ── Filter bar ────────────────────────────────────────────────────────────
  function FilterBar() {
    return (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
          padding: '10px 0 12px',
          borderBottom: '1px solid var(--border)',
          marginBottom: 12,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 600 }}>
          Filtros
        </span>

        <input
          type="text"
          value={filterText}
          onChange={(e) => { onFilterChange(e.target.value, filterCategory, filterType, filterStock, filterPerishable); setPage(0) }}
          placeholder="Nombre o SKU…"
          style={{ ...fStyle, minWidth: 140 }}
        />

        <select value={filterCategory}
          onChange={(e) => { onFilterChange(filterText, e.target.value, filterType, filterStock, filterPerishable); setPage(0) }}
          style={fStyle}>
          <option value="">Todas las categorías</option>
          {uniqueCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={filterType}
          onChange={(e) => { onFilterChange(filterText, filterCategory, e.target.value, filterStock, filterPerishable); setPage(0) }}
          style={fStyle}>
          <option value="">Todos los tipos</option>
          <option value="product">Producto</option>
          <option value="service">Servicio</option>
        </select>

        <select value={filterStock}
          onChange={(e) => { onFilterChange(filterText, filterCategory, filterType, e.target.value, filterPerishable); setPage(0) }}
          style={fStyle}>
          <option value="">Stock: todos</option>
          <option value="critical">🔴 Crítico</option>
          <option value="low">🟡 Bajo</option>
          <option value="ok">🟢 Normal</option>
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={filterPerishable}
            onChange={(e) => { onFilterChange(filterText, filterCategory, filterType, filterStock, e.target.checked); setPage(0) }}
            style={{ width: 14, height: 14, accentColor: 'var(--orange)' }}
          />
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>Perecederos</span>
        </label>

        {hasActiveFilters && (
          <button type="button"
            onClick={() => { onFilterChange('', '', '', '', false); setPage(0) }}
            style={{ ...fStyle, minWidth: 'auto', background: 'var(--hover)', color: 'var(--text2)', cursor: 'pointer' }}>
            Limpiar
          </button>
        )}

        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>
          {filteredProducts.length} resultado{filteredProducts.length !== 1 ? 's' : ''}
        </span>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 14, padding: 32 }}>
        No hay productos en el catálogo.
      </p>
    )
  }

  if (filteredProducts.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <FilterBar />
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 14, padding: 32 }}>
          No hay productos que coincidan con los filtros.
        </p>
      </div>
    )
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <FilterBar />

        {/* ── Alert banner ── */}
        {(criticalCount > 0 || expiryAlertCount > 0) && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(220,38,38,0.06)',
              border: '1px solid rgba(220,38,38,0.2)',
              fontSize: 12,
              color: 'var(--red)',
              fontWeight: 500,
              marginBottom: 10,
              flexShrink: 0,
              flexWrap: 'wrap',
            } as React.CSSProperties}
          >
            <span>⚠️</span>
            {criticalCount > 0 && (
              <span>{criticalCount} producto{criticalCount !== 1 ? 's' : ''} con stock crítico</span>
            )}
            {criticalCount > 0 && expiryAlertCount > 0 && <span style={{ color: 'rgba(220,38,38,0.4)' }}>·</span>}
            {expiryAlertCount > 0 && (
              <span>{expiryAlertCount} próximo{expiryAlertCount !== 1 ? 's' : ''} a vencer</span>
            )}
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead style={{ background: 'var(--card)', boxShadow: '0 1px 0 var(--border)' }}>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {COLUMNS.map(({ key, label, align }) => {
                  const isActive = sortBy === key
                  return (
                    <th key={key} onClick={() => handleSort(key)}
                      style={{ textAlign: align, padding: '10px 12px', color: 'var(--muted)', fontWeight: 600, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', fontSize: 11 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {label}
                        {isActive && <span style={{ fontSize: 10, color: 'var(--gold)' }}>{sortAsc ? '↑' : '↓'}</span>}
                      </span>
                    </th>
                  )
                })}
                <th style={{ padding: '10px 12px', color: 'var(--muted)', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap', textAlign: 'center' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((p) => {
                const stockLvl    = getStockLevel(p)
                const expiryLvl   = getExpiryLevel(p)
                const stockBadge  = STOCK_BADGE[stockLvl]
                const expiryBadge = EXPIRY_BADGE[expiryLvl]
                const stock    = p.current_stock ?? 0
                const isService = p.product_type === 'service'
                const unitLbl  = p.unit_label ?? 'unid.'

                let expiryText = '—'
                if (p.is_perishable && p.expiry_date) {
                  const today = new Date(); today.setHours(0,0,0,0)
                  const exp  = new Date(p.expiry_date)
                  const diff = Math.round((exp.getTime() - today.getTime()) / 86_400_000)
                  if (expiryLvl === 'expired') expiryText = 'Vencido'
                  else if (diff === 0) expiryText = 'Hoy'
                  else if (diff === 1) expiryText = 'Mañana'
                  else expiryText = `${diff}d`
                } else if (p.is_perishable) {
                  expiryText = 'Sin fecha'
                }

                return (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/inventory/${p.id}`)}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    {/* Producto */}
                    <td style={{ padding: '10px 12px', color: 'var(--text)' }}>
                      <div style={{ fontWeight: 500 }}>{p.name}</div>
                      {p.sku && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{p.sku}</div>}
                    </td>

                    {/* Tipo */}
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        fontSize: 11, padding: '2px 7px', borderRadius: 5, fontWeight: 500,
                        background: isService ? 'rgba(146,148,172,0.12)' : 'rgba(37,99,235,0.1)',
                        color: isService ? 'var(--muted)' : 'var(--blue)',
                      }}>
                        {isService ? 'Servicio' : 'Producto'}
                      </span>
                    </td>

                    {/* Unidad */}
                    <td style={{ padding: '10px 12px', color: 'var(--text2)', fontSize: 12 }}>
                      {isService ? <span style={{ color: 'var(--muted)' }}>—</span> : (p.unit_label ?? '—')}
                    </td>

                    {/* Stock */}
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      {isService ? (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: stockBadge.bg, color: stockBadge.color, fontWeight: 500 }}>
                          N/A
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: stockLvl !== 'ok' ? 700 : 400, color: stockLvl === 'critical' ? 'var(--red)' : stockLvl === 'low' ? 'var(--orange)' : 'var(--text)' }}>
                          {stockBadge.label} {stock.toLocaleString('es-EC', { maximumFractionDigits: 3 })} {unitLbl}
                        </span>
                      )}
                    </td>

                    {/* Mín */}
                    <td style={{ padding: '10px 12px', color: 'var(--text2)', textAlign: 'right' }}>
                      {isService ? '—' : (p.min_stock_alert ?? 0).toLocaleString('es-EC', { maximumFractionDigits: 3 })}
                    </td>

                    {/* Caducidad */}
                    <td style={{ padding: '10px 12px' }}>
                      {p.is_perishable ? (
                        <span style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 5, fontWeight: 500,
                          background: expiryBadge.bg, color: expiryBadge.color,
                        }}>
                          {expiryText}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--muted)' }}>—</span>
                      )}
                    </td>

                    {/* Precio */}
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text2)' }}>
                      ${(p.sale_price ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Costo */}
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text2)' }}>
                      ${(p.unit_cost ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Categoría */}
                    <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>
                      {p.category_id && categoriesMap[p.category_id]
                        ? categoriesMap[p.category_id]
                        : <span style={{ color: 'var(--muted)', fontStyle: 'italic', fontSize: 11 }}>Sin categoría</span>}
                    </td>

                    {/* Acciones */}
                    <td
                      style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
                        {/* Columna 1: Movimiento (vacío para servicios) */}
                        <div>
                          {!isService && (
                            <AddMovementForm
                              product={{
                                id: p.id,
                                name: p.name,
                                current_stock: stock,
                                unit_label: p.unit_label,
                                unit_cost: p.unit_cost,
                                supplier_price: p.supplier_price,
                                product_type: p.product_type,
                              }}
                            />
                          )}
                        </div>

                        {/* Columna 2: Editar */}
                        <div>
                          {canManage && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingProduct(p as ProductDetail)
                              }}
                              style={{
                                padding: '4px 10px',
                                fontSize: 11,
                                borderRadius: 6,
                                border: '1px solid var(--border)',
                                background: 'var(--hover)',
                                color: 'var(--text2)',
                                cursor: 'pointer',
                                fontFamily: 'var(--font-jakarta)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Editar
                            </button>
                          )}
                        </div>

                        {/* Columna 3: Eliminar */}
                        <div>
                          {userRole === 'admin' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteError(null)
                                setDeletingProduct(p)
                              }}
                              style={{
                                padding: '4px 10px',
                                fontSize: 11,
                                borderRadius: 6,
                                border: '1px solid rgba(220,38,38,0.3)',
                                background: 'rgba(220,38,38,0.06)',
                                color: 'var(--red)',
                                cursor: 'pointer',
                                fontFamily: 'var(--font-jakarta)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0 0', marginTop: 8, borderTop: '1px solid var(--border)', gap: 12, flexWrap: 'wrap', flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sortedProducts.length)} de {sortedProducts.length}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                style={{ ...fStyle, minWidth: 'auto', background: 'var(--hover)', color: page === 0 ? 'var(--muted)' : 'var(--text2)', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.5 : 1 }}>
                ← Anterior
              </button>
              <span style={{ fontSize: 11, color: 'var(--text2)', minWidth: 70, textAlign: 'center' }}>
                Página {page + 1} de {totalPages}
              </span>
              <button type="button" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                style={{ ...fStyle, minWidth: 'auto', background: 'var(--hover)', color: page >= totalPages - 1 ? 'var(--muted)' : 'var(--text2)', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.5 : 1 }}>
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Edit modal ── */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          categories={categories}
          suppliers={suppliers}
          onClose={() => setEditingProduct(null)}
          onSuccess={() => setEditingProduct(null)}
        />
      )}

      {/* ── Delete confirmation ── */}
      {deletingProduct && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)',
          }}
          onClick={() => { if (!deleteLoading) setDeletingProduct(null) }}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 24,
              width: '100%',
              maxWidth: 380,
              boxShadow: '0 20px 40px rgba(0,0,0,0.14)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-syne font-bold" style={{ fontSize: 15, color: 'var(--text)', marginBottom: 10 }}>
              ¿Eliminar producto?
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>
              <strong>{deletingProduct.name}</strong>
            </p>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
              Esta acción no se puede deshacer.
            </p>

            {deleteError && (
              <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: 'var(--red)' }}>
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button"
                onClick={() => setDeletingProduct(null)}
                disabled={deleteLoading}
                style={{ flex: 1, padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: 'var(--hover)', color: 'var(--text2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
                style={{ flex: 1, padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'rgba(220,38,38,0.1)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.25)', cursor: deleteLoading ? 'not-allowed' : 'pointer', opacity: deleteLoading ? 0.7 : 1 }}>
                {deleteLoading ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
