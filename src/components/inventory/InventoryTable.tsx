'use client'

import { useState, useMemo } from 'react'
import AddMovementForm from '@/components/inventory/AddMovementForm'

const PAGE_SIZE = 20

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

type SortKey =
  | 'name'
  | 'sku'
  | 'category_name'
  | 'sale_price'
  | 'unit_cost'
  | 'current_stock'
  | 'min_stock_alert'
  | 'lead_time_days'
  | '_action'

const COLUMNS: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
  { key: 'name', label: 'Producto', align: 'left' },
  { key: 'sku', label: 'SKU', align: 'left' },
  { key: 'category_name', label: 'Categoría', align: 'left' },
  { key: 'sale_price', label: 'Precio', align: 'right' },
  { key: 'unit_cost', label: 'Costo', align: 'right' },
  { key: 'current_stock', label: 'Stock', align: 'right' },
  { key: 'min_stock_alert', label: 'Mín.', align: 'right' },
  { key: 'lead_time_days', label: 'Lead time', align: 'right' },
  { key: '_action', label: 'Acción', align: 'left' },
]

const STOCK_STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'ok', label: 'OK' },
  { value: 'low', label: 'Stock bajo' },
  { value: 'out', label: 'Sin stock' },
]

type ProductWithCategory = ProductRow & { category_name?: string }

function getSortValue(p: ProductWithCategory, key: SortKey): string | number {
  switch (key) {
    case 'name':
      return (p.name ?? '').toLowerCase()
    case 'sku':
      return (p.sku ?? '').toLowerCase()
    case 'category_name':
      return (p.category_name ?? '').toLowerCase()
    case 'sale_price':
      return p.sale_price ?? 0
    case 'unit_cost':
      return p.unit_cost ?? 0
    case 'current_stock':
      return p.current_stock ?? -1
    case 'min_stock_alert':
      return p.min_stock_alert ?? -1
    case 'lead_time_days':
      return p.lead_time_days ?? -1
    case '_action':
      return ''
    default:
      return ''
  }
}

function getAccion(product: ProductRow): string {
  const stock = product.current_stock ?? 0
  const minAlert = product.min_stock_alert ?? 0
  if (stock === 0) return 'out'
  if (minAlert > 0 && stock <= minAlert) return 'low'
  return 'ok'
}

interface InventoryTableProps {
  products: ProductWithCategory[]
  categoriesMap: Record<string, string>
  filterProduct: string
  filterSku: string
  filterCategory: string
  filterAccion: string
  onFilterChange: (
    product: string,
    sku: string,
    category: string,
    accion: string
  ) => void
}

export default function InventoryTable({
  products,
  categoriesMap,
  filterProduct,
  filterSku,
  filterCategory,
  filterAccion,
  onFilterChange,
}: InventoryTableProps) {
  const [sortBy, setSortBy] = useState<SortKey>('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [page, setPage] = useState(0)

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>()
    products.forEach((p) => {
      const name = p.category_id ? categoriesMap[p.category_id] : null
      if (name) set.add(name)
    })
    return Array.from(set).sort()
  }, [products, categoriesMap])

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const name = (p.name ?? '').toLowerCase()
      const skuStr = (p.sku ?? '').toLowerCase()
      const catName = p.category_id ? categoriesMap[p.category_id] ?? '' : ''
      const accion = getAccion(p)
      if (filterProduct && !name.includes(filterProduct.toLowerCase()))
        return false
      if (filterSku && !skuStr.includes(filterSku.toLowerCase())) return false
      if (filterCategory && catName !== filterCategory) return false
      if (filterAccion && accion !== filterAccion) return false
      return true
    })
  }, [products, categoriesMap, filterProduct, filterSku, filterCategory, filterAccion])

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
  const paginatedProducts = sortedProducts.slice(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE
  )

  function handleSort(key: SortKey) {
    if (sortBy === key) {
      setSortAsc((prev) => !prev)
    } else {
      setSortBy(key)
      setSortAsc(true)
    }
    setPage(0)
  }

  const hasActiveFilters =
    filterProduct || filterSku || filterCategory || filterAccion

  const filterInputStyle: React.CSSProperties = {
    padding: '5px 10px',
    fontSize: 11,
    borderRadius: 6,
    border: '1px solid var(--border2)',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontFamily: 'var(--font-jakarta)',
    minWidth: 100,
  }
  const filterSelectStyle: React.CSSProperties = {
    padding: '5px 10px',
    fontSize: 11,
    borderRadius: 6,
    border: '1px solid var(--border2)',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontFamily: 'var(--font-jakarta)',
    cursor: 'pointer',
    minWidth: 100,
  }
  const filterButtonStyle: React.CSSProperties = {
    padding: '5px 10px',
    fontSize: 11,
    borderRadius: 6,
    border: '1px solid var(--border2)',
    background: 'var(--hover)',
    color: 'var(--text2)',
    fontFamily: 'var(--font-jakarta)',
    cursor: 'pointer',
  }

  if (products.length === 0) {
    return (
      <p
        style={{
          textAlign: 'center',
          color: 'var(--muted)',
          fontSize: 14,
          padding: 32,
        }}
      >
        No hay productos en el catálogo.
      </p>
    )
  }

  if (filteredProducts.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
            padding: '12px 0 16px',
            borderBottom: '1px solid var(--border)',
            marginBottom: 12,
            flexShrink: 0,
          }}
        >
          {renderFilters(true)}
        </div>
        <p
          style={{
            textAlign: 'center',
            color: 'var(--muted)',
            fontSize: 14,
            padding: 32,
          }}
        >
          No hay productos que coincidan con los filtros.
        </p>
      </div>
    )
  }

  function renderFilters(isEmptyState?: boolean) {
    const setPage0 = () => {
      if (!isEmptyState) setPage(0)
    }
    return (
      <>
        <span
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--muted)',
            fontWeight: 600,
          }}
        >
          Filtros
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>Producto</span>
          <input
            type="text"
            value={filterProduct}
            onChange={(e) => {
              onFilterChange(
                e.target.value,
                filterSku,
                filterCategory,
                filterAccion
              )
              setPage0()
            }}
            placeholder="Buscar..."
            style={filterInputStyle}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>SKU</span>
          <input
            type="text"
            value={filterSku}
            onChange={(e) => {
              onFilterChange(
                filterProduct,
                e.target.value,
                filterCategory,
                filterAccion
              )
              setPage0()
            }}
            placeholder="Buscar..."
            style={filterInputStyle}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>Categoría</span>
          <select
            value={filterCategory}
            onChange={(e) => {
              onFilterChange(
                filterProduct,
                filterSku,
                e.target.value,
                filterAccion
              )
              setPage0()
            }}
            style={filterSelectStyle}
          >
            <option value="">Todas</option>
            {uniqueCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>Estado stock</span>
          <select
            value={filterAccion}
            onChange={(e) => {
              onFilterChange(
                filterProduct,
                filterSku,
                filterCategory,
                e.target.value
              )
              setPage0()
            }}
            style={filterSelectStyle}
          >
            {STOCK_STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {(hasActiveFilters || isEmptyState) && (
          <button
            type="button"
            onClick={() => {
              onFilterChange('', '', '', '')
              setPage(0)
            }}
            style={filterButtonStyle}
          >
            Limpiar
          </button>
        )}
        {!isEmptyState && (
          <span
            style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}
          >
            {filteredProducts.length} resultado
            {filteredProducts.length !== 1 ? 's' : ''}
          </span>
        )}
      </>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          padding: '12px 0 16px',
          borderBottom: '1px solid var(--border)',
          marginBottom: 12,
          flexShrink: 0,
        }}
      >
        {renderFilters()}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 12,
          }}
        >
          <thead
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 1,
              background: 'var(--card)',
              boxShadow: '0 1px 0 var(--border)',
            }}
          >
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {COLUMNS.filter((c) => c.key !== '_action').map(({ key, label, align }) => {
                const isActive = sortBy === key
                return (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    style={{
                      textAlign: align,
                      padding: '10px 12px',
                      color: 'var(--muted)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {label}
                      {isActive && (
                        <span style={{ fontSize: 10, color: 'var(--gold)' }}>
                          {sortAsc ? '↑' : '↓'}
                        </span>
                      )}
                    </span>
                  </th>
                )
              })}
              <th
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  color: 'var(--muted)',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                Acción
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedProducts.map((p) => {
              const stock = p.current_stock ?? 0
              const minAlert = p.min_stock_alert ?? 0
              const isLowStock = stock <= minAlert && minAlert > 0
              const isOutOfStock = stock === 0
              const leadDays = p.lead_time_days ?? 0
              return (
                <tr
                  key={p.id}
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <td
                    style={{
                      fontSize: 12,
                      padding: '10px 12px',
                      color: 'var(--text)',
                    }}
                  >
                    {p.name}
                  </td>
                  <td
                    style={{
                      fontSize: 12,
                      padding: '10px 12px',
                      color: 'var(--text2)',
                    }}
                  >
                    {p.sku ?? '—'}
                  </td>
                  <td
                    style={{
                      fontSize: 12,
                      padding: '10px 12px',
                      color: 'var(--text2)',
                    }}
                  >
                    {p.category_id ? categoriesMap[p.category_id] ?? '—' : '—'}
                  </td>
                  <td
                    style={{
                      fontSize: 12,
                      padding: '10px 12px',
                      color: 'var(--text2)',
                      textAlign: 'right',
                    }}
                  >
                    ${(p.sale_price ?? 0).toLocaleString('es-EC', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td
                    style={{
                      fontSize: 12,
                      padding: '10px 12px',
                      color: 'var(--text2)',
                      textAlign: 'right',
                    }}
                  >
                    ${(p.unit_cost ?? 0).toLocaleString('es-EC', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td style={{ fontSize: 12, padding: '10px 12px', textAlign: 'right' }}>
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
                  <td
                    style={{
                      fontSize: 12,
                      padding: '10px 12px',
                      color: 'var(--text2)',
                      textAlign: 'right',
                    }}
                  >
                    {minAlert}
                  </td>
                  <td
                    style={{
                      fontSize: 12,
                      padding: '10px 12px',
                      color: 'var(--text2)',
                      textAlign: 'right',
                    }}
                  >
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

      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0 0',
            marginTop: 12,
            borderTop: '1px solid var(--border)',
            gap: 12,
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            Mostrando {page * PAGE_SIZE + 1}–
            {Math.min(
              (page + 1) * PAGE_SIZE,
              sortedProducts.length
            )}{' '}
            de {sortedProducts.length}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{
                ...filterButtonStyle,
                color: page === 0 ? 'var(--muted)' : 'var(--text2)',
                cursor: page === 0 ? 'not-allowed' : 'pointer',
                opacity: page === 0 ? 0.5 : 1,
              }}
            >
              ← Anterior
            </button>
            <span
              style={{
                fontSize: 11,
                color: 'var(--text2)',
                minWidth: 60,
                textAlign: 'center',
              }}
            >
              Página {page + 1} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={{
                ...filterButtonStyle,
                color: page >= totalPages - 1 ? 'var(--muted)' : 'var(--text2)',
                cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages - 1 ? 0.5 : 1,
              }}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
