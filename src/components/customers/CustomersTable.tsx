'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatBusinessDate } from '@/lib/dateUtils'
import { useUser } from '@/lib/context/UserContext'

const PAGE_SIZE = 20

// ── Types ──────────────────────────────────────────────────────────────────

export type CustomerRow = {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  tax_id: string | null
  id_type: string | null
  customer_type: string | null
  label: string | null
  lifetime_value: number | null
  last_purchase_at: string | null
  registered_since: string | null
  is_company: boolean | null
  contact_name: string | null
  address: string | null
  created_at: string
}

export type CatalogItem = {
  id: string
  name: string
  color: string
}

type SortKey =
  | 'full_name'
  | 'tax_id'
  | 'phone'
  | 'email'
  | 'customer_type'
  | 'label'
  | 'lifetime_value'
  | 'last_purchase_at'
  | 'registered_since'

const COLUMNS: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
  { key: 'full_name',       label: 'Nombre',        align: 'left'  },
  { key: 'tax_id',          label: 'Identificación', align: 'left'  },
  { key: 'phone',           label: 'Teléfono',      align: 'left'  },
  { key: 'email',           label: 'Email',         align: 'left'  },
  { key: 'customer_type',   label: 'Tipo',          align: 'left'  },
  { key: 'label',           label: 'Etiqueta',      align: 'left'  },
  { key: 'lifetime_value',  label: 'LTV',           align: 'right' },
  { key: 'last_purchase_at',label: 'Última compra', align: 'left'  },
]

function getSortValue(c: CustomerRow, key: SortKey): string | number {
  switch (key) {
    case 'full_name':       return (c.full_name ?? '').toLowerCase()
    case 'tax_id':          return (c.tax_id ?? '').toLowerCase()
    case 'phone':           return (c.phone ?? '').toLowerCase()
    case 'email':           return (c.email ?? '').toLowerCase()
    case 'customer_type':   return (c.customer_type ?? '').toLowerCase()
    case 'label':           return (c.label ?? '').toLowerCase()
    case 'lifetime_value':  return c.lifetime_value ?? 0
    case 'last_purchase_at':return c.last_purchase_at ?? ''
    case 'registered_since':return c.registered_since ?? ''
    default:                return ''
  }
}

// ── Filter bar shared styles ───────────────────────────────────────────────

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

// ── Props ──────────────────────────────────────────────────────────────────

interface CustomersTableProps {
  customers?: CustomerRow[]
  customerTypes?: CatalogItem[]
  customerLabels?: CatalogItem[]
  filterText: string
  filterType: string
  filterLabel: string
  filterIsCompany: boolean | null
  onFilterChange: (
    text: string,
    type: string,
    label: string,
    isCompany: boolean | null
  ) => void
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CustomersTable({
  customers = [],
  customerTypes = [],
  customerLabels = [],
  filterText,
  filterType,
  filterLabel,
  filterIsCompany,
  onFilterChange,
}: CustomersTableProps) {
  const { userRole } = useUser()
  const canEdit = userRole === 'admin' || userRole === 'manager'

  const [sortBy, setSortBy] = useState<SortKey>('full_name')
  const [sortAsc, setSortAsc] = useState(false)
  const [page, setPage] = useState(0)

  // Build lookup maps from catalogs
  const typeMap = useMemo(() => {
    const m = new Map<string, CatalogItem>()
    customerTypes.forEach((t) => m.set(t.id, t))
    return m
  }, [customerTypes])

  const labelMap = useMemo(() => {
    const m = new Map<string, CatalogItem>()
    customerLabels.forEach((l) => m.set(l.id, l))
    return m
  }, [customerLabels])

  const filteredCustomers = useMemo(() => {
    const txt = filterText.toLowerCase()
    return customers.filter((c) => {
      if (txt) {
        const name  = (c.full_name ?? '').toLowerCase()
        const email = (c.email ?? '').toLowerCase()
        const taxId = (c.tax_id ?? '').toLowerCase()
        if (!name.includes(txt) && !email.includes(txt) && !taxId.includes(txt)) return false
      }
      if (filterType && (c.customer_type ?? '') !== filterType) return false
      if (filterLabel && (c.label ?? '') !== filterLabel) return false
      if (filterIsCompany !== null && (c.is_company ?? false) !== filterIsCompany) return false
      return true
    })
  }, [customers, filterText, filterType, filterLabel, filterIsCompany])

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
    if (sortBy === key) setSortAsc((p) => !p)
    else { setSortBy(key); setSortAsc(false) }
    setPage(0)
  }

  const hasActiveFilters =
    filterText || filterType || filterLabel || filterIsCompany !== null

  const idTypeLabel: Record<string, string> = {
    cedula: 'CI',
    ruc: 'RUC',
    pasaporte: 'PAS',
  }

  // ── Filter bar ──────────────────────────────────────────────────────────

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

        {/* Text search */}
        <input
          type="text"
          value={filterText}
          onChange={(e) => {
            onFilterChange(e.target.value, filterType, filterLabel, filterIsCompany)
            setPage(0)
          }}
          placeholder="Nombre, email o ID…"
          style={{ ...filterInputStyle, minWidth: 160 }}
        />

        {/* Type filter */}
        <select
          value={filterType}
          onChange={(e) => {
            onFilterChange(filterText, e.target.value, filterLabel, filterIsCompany)
            setPage(0)
          }}
          style={filterInputStyle}
        >
          <option value="">Todos los tipos</option>
          {customerTypes.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        {/* Label filter */}
        <select
          value={filterLabel}
          onChange={(e) => {
            onFilterChange(filterText, filterType, e.target.value, filterIsCompany)
            setPage(0)
          }}
          style={filterInputStyle}
        >
          <option value="">Todas las etiquetas</option>
          {customerLabels.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>

        {/* Is company toggle */}
        <select
          value={
            filterIsCompany === null ? '' : filterIsCompany ? 'true' : 'false'
          }
          onChange={(e) => {
            const v = e.target.value
            onFilterChange(
              filterText,
              filterType,
              filterLabel,
              v === '' ? null : v === 'true'
            )
            setPage(0)
          }}
          style={filterInputStyle}
        >
          <option value="">Personas y empresas</option>
          <option value="true">Solo empresas</option>
          <option value="false">Solo personas</option>
        </select>

        {/* Clear */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              onFilterChange('', '', '', null)
              setPage(0)
            }}
            style={{
              ...filterInputStyle,
              minWidth: 'auto',
              background: 'var(--hover)',
              color: 'var(--text2)',
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
    )
  }

  if (customers.length === 0) {
    return (
      <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 14, padding: 32 }}>
        No hay clientes en el directorio.
      </p>
    )
  }

  if (filteredCustomers.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <FilterBar />
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 14, padding: 32 }}>
          No hay clientes que coincidan con los filtros.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <FilterBar />

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
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
                      fontSize: 11,
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
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
              {canEdit && (
                <th
                  style={{
                    padding: '10px 12px',
                    color: 'var(--muted)',
                    fontWeight: 600,
                    fontSize: 11,
                    textAlign: 'center',
                  }}
                >
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedCustomers.map((c) => {
              const typeCfg = typeMap.get(c.customer_type ?? '')
              const labelCfg = labelMap.get(c.label ?? '')
              const ltv = c.lifetime_value ?? 0

              return (
                <tr
                  key={c.id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLTableRowElement).style.background =
                      'var(--hover)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLTableRowElement).style.background =
                      'transparent'
                  }}
                  onClick={() => {
                    window.location.href = `/customers/${c.id}`
                  }}
                >
                  {/* Nombre */}
                  <td style={{ padding: '10px 12px', color: 'var(--text)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 500 }}>{c.full_name ?? '—'}</span>
                      {c.is_company && (
                        <span
                          style={{
                            fontSize: 9,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: 'rgba(37,99,235,0.1)',
                            color: 'var(--blue)',
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          Empresa
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Identificación */}
                  <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>
                    {c.tax_id ? (
                      <span>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: 'var(--muted)',
                            textTransform: 'uppercase',
                            marginRight: 4,
                          }}
                        >
                          {idTypeLabel[c.id_type ?? ''] ?? (c.id_type ?? '')}:
                        </span>
                        {c.tax_id}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>

                  {/* Teléfono */}
                  <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>
                    {c.phone ?? '—'}
                  </td>

                  {/* Email */}
                  <td
                    style={{
                      padding: '10px 12px',
                      color: 'var(--text2)',
                      maxWidth: 180,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.email ?? '—'}
                  </td>

                  {/* Tipo */}
                  <td style={{ padding: '10px 12px' }}>
                    {typeCfg ? (
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 500,
                          background: `${typeCfg.color}22`,
                          color: typeCfg.color,
                          border: `1px solid ${typeCfg.color}44`,
                        }}
                      >
                        {typeCfg.name}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--muted)' }}>—</span>
                    )}
                  </td>

                  {/* Etiqueta */}
                  <td style={{ padding: '10px 12px' }}>
                    {labelCfg ? (
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 500,
                          background: `${labelCfg.color}22`,
                          color: labelCfg.color,
                          border: `1px solid ${labelCfg.color}44`,
                        }}
                      >
                        {labelCfg.name}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--muted)' }}>—</span>
                    )}
                  </td>

                  {/* LTV */}
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    {ltv > 0 ? (
                      <span
                        className="font-syne"
                        style={{ fontWeight: 700, color: 'var(--gold)' }}
                      >
                        ${' '}
                        {ltv.toLocaleString('es-EC', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--muted)' }}>—</span>
                    )}
                  </td>

                  {/* Última compra */}
                  <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>
                    {formatBusinessDate(c.last_purchase_at)}
                  </td>

                  {/* Acciones */}
                  {canEdit && (
                    <td
                      style={{ padding: '10px 12px', textAlign: 'center' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link
                        href={`/customers/${c.id}`}
                        style={{
                          fontSize: 11,
                          padding: '3px 10px',
                          borderRadius: 6,
                          border: '1px solid var(--border2)',
                          background: 'var(--surface)',
                          color: 'var(--text2)',
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Editar
                      </Link>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0 0',
            marginTop: 8,
            borderTop: '1px solid var(--border)',
            gap: 12,
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            Mostrando {page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, sortedCustomers.length)} de{' '}
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
                minWidth: 70,
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
