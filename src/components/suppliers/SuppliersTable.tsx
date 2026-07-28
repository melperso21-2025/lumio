'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useUser } from '@/lib/context/UserContext'

// ── Types ──────────────────────────────────────────────────────────────────

export type SupplierRow = {
  id: string
  name: string | null
  first_name: string | null
  last_name: string | null
  is_company: boolean | null
  id_type: string | null
  tax_id: string | null
  phone: string | null
  email: string | null
  address: string | null
  bank_name: string | null
  bank_account: string | null
  account_type: string | null
  is_active: boolean | null
  created_at: string
}

// ── Styles ─────────────────────────────────────────────────────────────────

const filterInputStyle: React.CSSProperties = {
  padding: '5px 10px',
  fontSize: 11,
  borderRadius: 6,
  border: '1px solid var(--border2)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontFamily: 'var(--font-jakarta)',
  outline: 'none',
}

const PAGE_SIZE = 20

// ── Helpers ────────────────────────────────────────────────────────────────

function displayName(s: SupplierRow): string {
  if (s.is_company === false && (s.first_name || s.last_name)) {
    return [s.first_name, s.last_name].filter(Boolean).join(' ')
  }
  return s.name ?? '—'
}

function idTypeLabel(t: string | null) {
  if (t === 'cedula') return 'Cédula'
  if (t === 'ruc') return 'RUC'
  if (t === 'pasaporte') return 'Pasaporte'
  return t ?? ''
}

// ── Component ──────────────────────────────────────────────────────────────

interface SuppliersTableProps {
  suppliers: SupplierRow[]
  onEdit: (supplier: SupplierRow) => void
  onDelete: (id: string) => void
}

export default function SuppliersTable({ suppliers, onEdit, onDelete }: SuppliersTableProps) {
  const { userRole } = useUser()
  const canDelete = userRole === 'admin' || userRole === 'manager'

  const [filterText, setFilterText]       = useState('')
  const [filterType, setFilterType]       = useState<'all' | 'company' | 'person'>('all')
  const [filterActive, setFilterActive]   = useState<'all' | 'active' | 'inactive'>('active')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const txt = filterText.toLowerCase()
    return suppliers.filter((s) => {
      if (txt) {
        const n = displayName(s).toLowerCase()
        const e = (s.email ?? '').toLowerCase()
        const t = (s.tax_id ?? '').toLowerCase()
        if (!n.includes(txt) && !e.includes(txt) && !t.includes(txt)) return false
      }
      if (filterType === 'company' && s.is_company === false) return false
      if (filterType === 'person' && s.is_company !== false) return false
      if (filterActive === 'active'   && !s.is_active) return false
      if (filterActive === 'inactive' && s.is_active)  return false
      return true
    })
  }, [suppliers, filterText, filterType, filterActive])

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE)
  const pageRows  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const thStyle: React.CSSProperties = {
    padding: '8px 10px',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    fontWeight: 700,
    color: 'var(--muted)',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid var(--border)',
    background: 'var(--surface)',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  }
  const tdStyle: React.CSSProperties = {
    padding: '9px 10px',
    fontSize: 12,
    color: 'var(--text2)',
    borderBottom: '1px solid var(--border)',
    verticalAlign: 'middle',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Buscar por nombre, email, RUC…"
          value={filterText}
          onChange={(e) => { setFilterText(e.target.value); setPage(0) }}
          style={{ ...filterInputStyle, minWidth: 200 }}
        />
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value as typeof filterType); setPage(0) }}
          style={filterInputStyle}
        >
          <option value="all">Todos los tipos</option>
          <option value="company">Empresa</option>
          <option value="person">Persona natural</option>
        </select>
        <select
          value={filterActive}
          onChange={(e) => { setFilterActive(e.target.value as typeof filterActive); setPage(0) }}
          style={filterInputStyle}
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>
          {filtered.length} proveedor{filtered.length !== 1 ? 'es' : ''}
        </span>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Nombre</th>
              <th style={thStyle}>Tipo</th>
              <th style={thStyle}>Identificación</th>
              <th style={thStyle}>Teléfono</th>
              <th style={thStyle}>Email</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Bancarios</th>
              <th style={thStyle}>Estado</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: 'var(--muted)', padding: '24px 10px' }}>
                  Sin resultados
                </td>
              </tr>
            ) : pageRows.map((s) => (
              <tr
                key={s.id}
                style={{ cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Nombre */}
                <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text)' }}>
                  <Link
                    href={`/suppliers/${s.id}`}
                    style={{ color: 'inherit', textDecoration: 'none' }}
                  >
                    {displayName(s)}
                  </Link>
                </td>

                {/* Tipo badge */}
                <td style={tdStyle}>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 5,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    background: s.is_company === false
                      ? 'rgba(59,130,246,0.1)' : 'rgba(217,119,6,0.08)',
                    color: s.is_company === false ? '#3b82f6' : 'var(--gold)',
                  }}>
                    {s.is_company === false ? 'Persona' : 'Empresa'}
                  </span>
                </td>

                {/* Identificación */}
                <td style={tdStyle}>
                  {s.id_type || s.tax_id ? (
                    <span>
                      <span style={{ fontSize: 10, color: 'var(--muted)' }}>{idTypeLabel(s.id_type)} </span>
                      {s.tax_id ?? '—'}
                    </span>
                  ) : '—'}
                </td>

                {/* Teléfono */}
                <td style={tdStyle}>{s.phone ?? '—'}</td>

                {/* Email */}
                <td style={{ ...tdStyle, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.email ?? '—'}
                </td>

                {/* Datos bancarios */}
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  {s.bank_account ? (
                    <span title={`${s.bank_name ?? ''} · ${s.bank_account}`} style={{ color: 'var(--green)', fontSize: 14 }}>✓</span>
                  ) : (
                    <span style={{ color: 'var(--border2)', fontSize: 12 }}>—</span>
                  )}
                </td>

                {/* Estado */}
                <td style={tdStyle}>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 5,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    background: s.is_active
                      ? 'rgba(5,150,105,0.1)' : 'rgba(220,38,38,0.07)',
                    color: s.is_active ? 'var(--green)' : 'var(--red)',
                  }}>
                    {s.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>

                {/* Acciones */}
                <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEdit(s) }}
                    style={{
                      padding: '3px 9px',
                      borderRadius: 5,
                      fontSize: 11,
                      background: 'var(--hover)',
                      color: 'var(--text2)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      marginRight: 4,
                    }}
                  >
                    Editar
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDelete(s.id) }}
                      style={{
                        padding: '3px 9px',
                        borderRadius: 5,
                        fontSize: 11,
                        background: 'rgba(220,38,38,0.07)',
                        color: 'var(--red)',
                        border: '1px solid rgba(220,38,38,0.2)',
                        cursor: 'pointer',
                      }}
                    >
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{ padding: '4px 10px', borderRadius: 5, fontSize: 11, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text2)', cursor: page === 0 ? 'default' : 'pointer', opacity: page === 0 ? 0.4 : 1 }}
          >← Anterior</button>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{page + 1} / {pageCount}</span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={page >= pageCount - 1}
            style={{ padding: '4px 10px', borderRadius: 5, fontSize: 11, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text2)', cursor: page >= pageCount - 1 ? 'default' : 'pointer', opacity: page >= pageCount - 1 ? 0.4 : 1 }}
          >Siguiente →</button>
        </div>
      )}
    </div>
  )
}
