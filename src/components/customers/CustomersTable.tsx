'use client'

import { useState, useMemo } from 'react'

const PAGE_SIZE = 20

const typeConfig: Record<string, { bg: string; color: string; label: string }> = {
  retail: { bg: 'rgba(37,99,235,0.1)', color: 'var(--blue)', label: 'Retail' },
  wholesale: { bg: 'rgba(124,58,237,0.1)', color: '#7C3AED', label: 'Mayorista' },
  occasional: { bg: 'rgba(146,148,172,0.1)', color: 'var(--muted)', label: 'Eventual' },
  b2b: { bg: 'rgba(5,150,105,0.1)', color: 'var(--green)', label: 'B2B' },
}

const labelConfig: Record<string, { bg: string; color: string; label: string }> = {
  vip: { bg: 'var(--gold-bg)', color: 'var(--gold)', label: 'VIP' },
  frequent: { bg: 'rgba(5,150,105,0.1)', color: 'var(--green)', label: 'Frecuente' },
  new: { bg: 'rgba(37,99,235,0.1)', color: 'var(--blue)', label: 'Nuevo' },
  recovery: { bg: 'rgba(217,119,6,0.1)', color: 'var(--orange)', label: 'Recuperar' },
}

type CustomerRow = {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  customer_type: string | null
  label: string | null
  lifetime_value: number | null
  last_purchase_at: string | null
  registered_since: string | null
  created_at: string
}

type SortKey =
  | 'full_name'
  | 'phone'
  | 'customer_type'
  | 'label'
  | 'lifetime_value'
  | 'last_purchase_at'
  | 'registered_since'

const COLUMNS: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
  { key: 'full_name', label: 'Nombre', align: 'left' },
  { key: 'phone', label: 'Teléfono', align: 'left' },
  { key: 'customer_type', label: 'Tipo', align: 'left' },
  { key: 'label', label: 'Etiqueta', align: 'left' },
  { key: 'lifetime_value', label: 'LTV', align: 'right' },
  { key: 'last_purchase_at', label: 'Última compra', align: 'left' },
  { key: 'registered_since', label: 'Cliente desde', align: 'left' },
]

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function getSortValue(c: CustomerRow, key: SortKey): string | number {
  switch (key) {
    case 'full_name':
      return (c.full_name ?? '').toLowerCase()
    case 'phone':
      return (c.phone ?? '').toLowerCase()
    case 'customer_type':
      return (c.customer_type ?? '').toLowerCase()
    case 'label':
      return (c.label ?? '').toLowerCase()
    case 'lifetime_value':
      return c.lifetime_value ?? 0
    case 'last_purchase_at':
      return c.last_purchase_at ?? ''
    case 'registered_since':
      return c.registered_since ?? ''
    default:
      return ''
  }
}

interface CustomersTableProps {
  customers: CustomerRow[]
  filterName: string
  filterPhone: string
  filterType: string
  filterLabel: string
  onFilterChange: (name: string, phone: string, type: string, label: string) => void
}

export default function CustomersTable({
  customers,
  filterName,
  filterPhone,
  filterType,
  filterLabel,
  onFilterChange,
}: CustomersTableProps) {
  const [sortBy, setSortBy] = useState<SortKey>('full_name')
  const [sortAsc, setSortAsc] = useState(false)
  const [page, setPage] = useState(0)

  const uniqueTypes = useMemo(() => {
    const set = new Set<string>()
    customers.forEach((c) => {
      if (c.customer_type) set.add(c.customer_type)
    })
    return Array.from(set).sort()
  }, [customers])

  const uniqueLabels = useMemo(() => {
    const set = new Set<string>()
    customers.forEach((c) => {
      if (c.label) set.add(c.label)
    })
    return Array.from(set).sort()
  }, [customers])

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const name = (c.full_name ?? '').toLowerCase()
      const phoneStr = (c.phone ?? '').toLowerCase()
      if (filterName && !name.includes(filterName.toLowerCase())) return false
      if (filterPhone && !phoneStr.includes(filterPhone.toLowerCase())) return false
      if (filterType && (c.customer_type ?? '') !== filterType) return false
      if (filterLabel && (c.label ?? '') !== filterLabel) return false
      return true
    })
  }, [customers, filterName, filterPhone, filterType, filterLabel])

  const sortedCustomers = useMemo(() => {
    return [...filteredCustomers].sort((a, b) => {
      const va = getSortValue(a, sortBy)
      const vb = getSortValue(b, sortBy)
      const cmp =
        typeof va === 'string' && typeof vb === 'string'
          ? va.localeCompare(vb)
          : (va as number) - (vb as number)
      return sortAsc ? cmp : -cmp
    })
  }, [filteredCustomers, sortBy, sortAsc])

  const totalPages = Math.ceil(sortedCustomers.length / PAGE_SIZE)
  const paginatedCustomers = sortedCustomers.slice(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE
  )

  function handleSort(key: SortKey) {
    if (sortBy === key) {
      setSortAsc((prev) => !prev)
    } else {
      setSortBy(key)
      setSortAsc(false)
    }
    setPage(0)
  }

  const hasActiveFilters = filterName || filterPhone || filterType || filterLabel

  if (customers.length === 0) {
    return (
      <p
        style={{
          textAlign: 'center',
          color: 'var(--muted)',
          fontSize: 14,
          padding: 32,
        }}
      >
        No hay clientes en el directorio.
      </p>
    )
  }

  if (filteredCustomers.length === 0) {
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
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Nombre</span>
            <input
              type="text"
              value={filterName}
              onChange={(e) => onFilterChange(e.target.value, filterPhone, filterType, filterLabel)}
              placeholder="Buscar..."
              style={{
                padding: '5px 10px',
                fontSize: 11,
                borderRadius: 6,
                border: '1px solid var(--border2)',
                background: 'var(--surface)',
                fontFamily: 'var(--font-jakarta)',
                minWidth: 100,
              }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Teléfono</span>
            <input
              type="text"
              value={filterPhone}
              onChange={(e) => onFilterChange(filterName, e.target.value, filterType, filterLabel)}
              placeholder="Buscar..."
              style={{
                padding: '5px 10px',
                fontSize: 11,
                borderRadius: 6,
                border: '1px solid var(--border2)',
                background: 'var(--surface)',
                fontFamily: 'var(--font-jakarta)',
                minWidth: 100,
              }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Tipo</span>
            <select
              value={filterType}
              onChange={(e) => onFilterChange(filterName, filterPhone, e.target.value, filterLabel)}
              style={{
                padding: '5px 10px',
                fontSize: 11,
                borderRadius: 6,
                border: '1px solid var(--border2)',
                background: 'var(--surface)',
                fontFamily: 'var(--font-jakarta)',
                minWidth: 100,
              }}
            >
              <option value="">Todos</option>
              {uniqueTypes.map((t) => (
                <option key={t} value={t}>{typeConfig[t]?.label ?? t}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Etiqueta</span>
            <select
              value={filterLabel}
              onChange={(e) => onFilterChange(filterName, filterPhone, filterType, e.target.value)}
              style={{
                padding: '5px 10px',
                fontSize: 11,
                borderRadius: 6,
                border: '1px solid var(--border2)',
                background: 'var(--surface)',
                fontFamily: 'var(--font-jakarta)',
                minWidth: 100,
              }}
            >
              <option value="">Todas</option>
              {uniqueLabels.map((l) => (
                <option key={l} value={l}>{labelConfig[l]?.label ?? l}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              onFilterChange('', '', '', '')
              setPage(0)
            }}
            style={{
              padding: '5px 10px',
              fontSize: 11,
              borderRadius: 6,
              border: '1px solid var(--border2)',
              background: 'var(--hover)',
              color: 'var(--text2)',
              fontFamily: 'var(--font-jakarta)',
              cursor: 'pointer',
            }}
          >
            Limpiar
          </button>
        </div>
        <p
          style={{
            textAlign: 'center',
            color: 'var(--muted)',
            fontSize: 14,
            padding: 32,
          }}
        >
          No hay clientes que coincidan con los filtros.
        </p>
      </div>
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
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>Nombre</span>
          <input
            type="text"
            value={filterName}
            onChange={(e) => {
              onFilterChange(e.target.value, filterPhone, filterType, filterLabel)
              setPage(0)
            }}
            placeholder="Buscar..."
            style={{
              padding: '5px 10px',
              fontSize: 11,
              borderRadius: 6,
              border: '1px solid var(--border2)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontFamily: 'var(--font-jakarta)',
              minWidth: 100,
            }}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>Teléfono</span>
          <input
            type="text"
            value={filterPhone}
            onChange={(e) => {
              onFilterChange(filterName, e.target.value, filterType, filterLabel)
              setPage(0)
            }}
            placeholder="Buscar..."
            style={{
              padding: '5px 10px',
              fontSize: 11,
              borderRadius: 6,
              border: '1px solid var(--border2)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontFamily: 'var(--font-jakarta)',
              minWidth: 100,
            }}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>Tipo</span>
          <select
            value={filterType}
            onChange={(e) => {
              onFilterChange(filterName, filterPhone, e.target.value, filterLabel)
              setPage(0)
            }}
            style={{
              padding: '5px 10px',
              fontSize: 11,
              borderRadius: 6,
              border: '1px solid var(--border2)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontFamily: 'var(--font-jakarta)',
              cursor: 'pointer',
              minWidth: 100,
            }}
          >
            <option value="">Todos</option>
            {uniqueTypes.map((t) => (
              <option key={t} value={t}>{typeConfig[t]?.label ?? t}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>Etiqueta</span>
          <select
            value={filterLabel}
            onChange={(e) => {
              onFilterChange(filterName, filterPhone, filterType, e.target.value)
              setPage(0)
            }}
            style={{
              padding: '5px 10px',
              fontSize: 11,
              borderRadius: 6,
              border: '1px solid var(--border2)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontFamily: 'var(--font-jakarta)',
              cursor: 'pointer',
              minWidth: 100,
            }}
          >
            <option value="">Todas</option>
            {uniqueLabels.map((l) => (
              <option key={l} value={l}>{labelConfig[l]?.label ?? l}</option>
            ))}
          </select>
        </label>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              onFilterChange('', '', '', '')
              setPage(0)
            }}
            style={{
              padding: '5px 10px',
              fontSize: 11,
              borderRadius: 6,
              border: '1px solid var(--border2)',
              background: 'var(--hover)',
              color: 'var(--text2)',
              fontFamily: 'var(--font-jakarta)',
              cursor: 'pointer',
            }}
          >
            Limpiar
          </button>
        )}
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>
          {filteredCustomers.length} resultado{filteredCustomers.length !== 1 ? 's' : ''}
        </span>
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
          <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--card)', boxShadow: '0 1px 0 var(--border)' }}>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {COLUMNS.map(({ key, label, align }) => {
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
            </tr>
          </thead>
          <tbody>
            {paginatedCustomers.map((c) => {
              const typeCfg = typeConfig[c.customer_type ?? ''] ?? {
                bg: 'var(--hover)',
                color: 'var(--text2)',
                label: c.customer_type ?? '—',
              }
              const labelCfg = labelConfig[c.label ?? ''] ?? {
                bg: 'var(--hover)',
                color: 'var(--text2)',
                label: c.label ?? '—',
              }
              const ltv = c.lifetime_value ?? 0
              return (
                <tr
                  key={c.id}
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <td style={{ fontSize: 12, padding: '10px 12px', color: 'var(--text)' }}>
                    {c.full_name ?? '—'}
                  </td>
                  <td style={{ fontSize: 12, padding: '10px 12px', color: 'var(--text2)' }}>
                    {c.phone ?? '—'}
                  </td>
                  <td style={{ fontSize: 12, padding: '10px 12px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 500,
                        background: typeCfg.bg,
                        color: typeCfg.color,
                      }}
                    >
                      {typeCfg.label}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, padding: '10px 12px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 500,
                        background: labelCfg.bg,
                        color: labelCfg.color,
                      }}
                    >
                      {labelCfg.label}
                    </span>
                  </td>
                  <td
                    style={{
                      fontSize: 12,
                      padding: '10px 12px',
                      textAlign: 'right',
                    }}
                  >
                    {ltv > 0 ? (
                      <span
                        className="font-syne"
                        style={{ fontWeight: 700, color: 'var(--gold)' }}
                      >
                        $ {ltv.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--muted)' }}>—</span>
                    )}
                  </td>
                  <td style={{ fontSize: 12, padding: '10px 12px', color: 'var(--text2)' }}>
                    {formatDate(c.last_purchase_at)}
                  </td>
                  <td style={{ fontSize: 12, padding: '10px 12px', color: 'var(--text2)' }}>
                    {formatDate(c.registered_since)}
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
            Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sortedCustomers.length)} de{' '}
            {sortedCustomers.length}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{
                padding: '5px 10px',
                fontSize: 11,
                borderRadius: 6,
                border: '1px solid var(--border2)',
                background: 'var(--surface)',
                color: page === 0 ? 'var(--muted)' : 'var(--text2)',
                cursor: page === 0 ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-jakarta)',
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
                padding: '5px 10px',
                fontSize: 11,
                borderRadius: 6,
                border: '1px solid var(--border2)',
                background: 'var(--surface)',
                color: page >= totalPages - 1 ? 'var(--muted)' : 'var(--text2)',
                cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-jakarta)',
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
