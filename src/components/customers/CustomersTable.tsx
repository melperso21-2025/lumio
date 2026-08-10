'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { formatBusinessDate } from '@/lib/dateUtils'
import { useUser } from '@/lib/context/UserContext'

// ── Types ──────────────────────────────────────────────────────────────────

export type CustomerRow = {
  id: string
  full_name: string | null
  mobile: string | null
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
  total_orders: number | null
}

export type CatalogItem = {
  id: string
  name: string
  color: string
}

type SortKey =
  | 'full_name'
  | 'tax_id'
  | 'mobile'
  | 'email'
  | 'customer_type'
  | 'label'
  | 'lifetime_value'
  | 'total_orders'
  | 'last_purchase_at'
  | 'registered_since'

const COLUMNS: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
  { key: 'full_name',       label: 'Nombre',        align: 'left'  },
  { key: 'tax_id',          label: 'Identificación', align: 'left'  },
  { key: 'mobile',          label: 'Celular',       align: 'left'  },
  { key: 'email',           label: 'Email',         align: 'left'  },
  { key: 'customer_type',   label: 'Tipo',          align: 'left'  },
  { key: 'label',           label: 'Etiqueta',      align: 'left'  },
  { key: 'total_orders',    label: 'Ventas',        align: 'right' },
  { key: 'lifetime_value',  label: 'LTV',           align: 'right' },
  { key: 'last_purchase_at',label: 'Última compra', align: 'left'  },
]

function getSortValue(c: CustomerRow, key: SortKey): string | number {
  switch (key) {
    case 'full_name':       return (c.full_name ?? '').toLowerCase()
    case 'tax_id':          return (c.tax_id ?? '').toLowerCase()
    case 'mobile':          return (c.mobile ?? '').toLowerCase()
    case 'email':           return (c.email ?? '').toLowerCase()
    case 'customer_type':   return (c.customer_type ?? '').toLowerCase()
    case 'label':           return (c.label ?? '').toLowerCase()
    case 'total_orders':    return c.total_orders ?? 0
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

// ── FilterBar — componente externo para evitar remount en cada render ──────

interface FilterBarProps {
  localText: string
  onLocalTextChange: (v: string) => void
  filterType: string
  filterLabel: string
  filterIsCompany: boolean | null
  customerTypes: CatalogItem[]
  customerLabels: CatalogItem[]
  resultCount: number
  hasActiveFilters: boolean
  onSelectChange: (type: string, label: string, isCompany: boolean | null) => void
  onClear: () => void
}

function CustomerFilterBar({
  localText,
  onLocalTextChange,
  filterType,
  filterLabel,
  filterIsCompany,
  customerTypes,
  customerLabels,
  resultCount,
  hasActiveFilters,
  onSelectChange,
  onClear,
}: FilterBarProps) {
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

      {/* Text search — estado local, no viene de URL directamente */}
      <input
        type="text"
        value={localText}
        onChange={(e) => onLocalTextChange(e.target.value)}
        placeholder="Nombre, email o ID…"
        style={{ ...filterInputStyle, minWidth: 160 }}
        autoComplete="off"
        spellCheck={false}
      />

      <select
        value={filterType}
        onChange={(e) => onSelectChange(e.target.value, filterLabel, filterIsCompany)}
        style={filterInputStyle}
      >
        <option value="">Todos los tipos</option>
        {customerTypes.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>

      <select
        value={filterLabel}
        onChange={(e) => onSelectChange(filterType, e.target.value, filterIsCompany)}
        style={filterInputStyle}
      >
        <option value="">Todas las etiquetas</option>
        {customerLabels.map((l) => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
      </select>

      <select
        value={filterIsCompany === null ? '' : filterIsCompany ? 'true' : 'false'}
        onChange={(e) => {
          const v = e.target.value
          onSelectChange(filterType, filterLabel, v === '' ? null : v === 'true')
        }}
        style={filterInputStyle}
      >
        <option value="">Personas y empresas</option>
        <option value="true">Solo empresas</option>
        <option value="false">Solo personas</option>
      </select>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
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
        {resultCount} resultado{resultCount !== 1 ? 's' : ''}
      </span>
    </div>
  )
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
  onFilterChange: (text: string, type: string, label: string, isCompany: boolean | null) => void
  initialSortBy?: string
  initialSortAsc?: boolean
  onSortChange?: (key: string, asc: boolean) => void
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
  initialSortBy = 'lifetime_value',
  initialSortAsc = false,
  onSortChange,
}: CustomersTableProps) {
  const { userRole } = useUser()
  const canEdit = userRole === 'admin' || userRole === 'manager'

  const [sortBy, setSortBy] = useState<SortKey>(initialSortBy as SortKey)
  const [sortAsc, setSortAsc] = useState(initialSortAsc)

  // Estado local para el input de texto — desacoplado de la URL.
  // El debounce evita un router.replace por cada keystroke.
  // isTypingRef bloquea la re-sincronización desde la URL mientras el
  // usuario sigue escribiendo (evita el reset al dispararse el debounce).
  const [localText, setLocalText] = useState(filterText)
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef  = useRef(false)

  // Solo sincroniza hacia atrás (URL → input) cuando el usuario NO está
  // escribiendo activamente; p.ej. al navegar con URL pre-cargada o
  // al hacer "Limpiar" desde el componente padre.
  useEffect(() => {
    if (!isTypingRef.current) {
      setLocalText(filterText)
    }
  }, [filterText])

  function handleLocalTextChange(value: string) {
    setLocalText(value)
    isTypingRef.current = true
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      isTypingRef.current = false
      onFilterChange(value, filterType, filterLabel, filterIsCompany)
    }, 400)
  }

  function handleSelectChange(type: string, label: string, isCompany: boolean | null) {
    // Los selects responden de inmediato; cancelamos cualquier debounce pendiente
    // pero propagamos el texto local actual (no el de la URL)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    isTypingRef.current = false
    onFilterChange(localText, type, label, isCompany)
  }

  function handleClear() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    isTypingRef.current = false
    setLocalText('')
    onFilterChange('', '', '', null)
  }

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

  // Data is sorted server-side; render as-is
  const sortedCustomers = customers

  function handleSort(key: SortKey) {
    const newAsc = sortBy === key ? !sortAsc : false
    setSortBy(key)
    setSortAsc(newAsc)
    onSortChange?.(key, newAsc)
  }

  const hasActiveFilters =
    filterText || filterType || filterLabel || filterIsCompany !== null

  const idTypeLabel: Record<string, string> = {
    cedula: 'CI',
    ruc: 'RUC',
    pasaporte: 'PAS',
  }

  if (customers.length === 0 && !hasActiveFilters) {
    return (
      <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 14, padding: 32 }}>
        No hay clientes en el directorio.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <CustomerFilterBar
        localText={localText}
        onLocalTextChange={handleLocalTextChange}
        filterType={filterType}
        filterLabel={filterLabel}
        filterIsCompany={filterIsCompany}
        customerTypes={customerTypes}
        customerLabels={customerLabels}
        resultCount={customers.length}
        hasActiveFilters={!!hasActiveFilters}
        onSelectChange={handleSelectChange}
        onClear={handleClear}
      />

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
            {sortedCustomers.map((c) => {
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
                    {c.mobile ?? c.phone ?? '—'}
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

                  {/* Ventas */}
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    {(c.total_orders ?? 0) > 0 ? (
                      <span style={{ fontWeight: 500, color: 'var(--text2)' }}>
                        {c.total_orders}
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

    </div>
  )
}
