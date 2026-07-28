'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { formatBusinessDate } from '@/lib/dateUtils'

const PAGE_SIZE = 20

type SaleRow = {
  id: string
  sale_date: string
  week_number: number | null
  gross_total: number | null
  discount_amount: number | null
  lines_per_order: number | null
  status: string | null
  channel_id: string | null
  sales_channels?: { name: string } | { name: string }[] | null
}

type SortKey =
  | 'sale_date'
  | 'week_number'
  | 'channel'
  | 'lines_per_order'
  | 'gross_total'
  | 'discount_amount'
  | 'status'

const COLUMNS: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
  { key: 'sale_date', label: 'Fecha', align: 'left' },
  { key: 'week_number', label: 'Semana', align: 'left' },
  { key: 'channel', label: 'Canal', align: 'left' },
  { key: 'lines_per_order', label: 'LPP', align: 'left' },
  { key: 'gross_total', label: 'Total', align: 'right' },
  { key: 'discount_amount', label: 'Descuento', align: 'right' },
  { key: 'status', label: 'Estado', align: 'left' },
]

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
  const config: Record<string, { bg: string; color: string; label: string }> = {
    closed: { bg: 'rgba(5,150,105,0.1)', color: 'var(--green)', label: 'Cerrada' },
    review: { bg: 'rgba(217,119,6,0.1)', color: 'var(--orange)', label: 'Revisión' },
    cancelled: { bg: 'rgba(220,38,38,0.1)', color: 'var(--red)', label: 'Anulada' },
    contact: { bg: 'rgba(37,99,235,0.08)', color: 'var(--blue)', label: 'Contacto' },
  }
  const c = config[status] ?? { bg: 'var(--hover)', color: 'var(--text2)', label: status }
  return (
    <span
      style={{
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 6,
        background: c.bg,
        color: c.color,
      }}
    >
      {c.label}
    </span>
  )
}

function getChannelName(sale: SaleRow): string {
  const sc = sale.sales_channels
  return Array.isArray(sc) ? sc[0]?.name ?? '—' : (sc as { name?: string })?.name ?? '—'
}

function getSortValue(sale: SaleRow, key: SortKey): string | number {
  switch (key) {
    case 'sale_date':
      return sale.sale_date
    case 'week_number':
      return sale.week_number ?? -1
    case 'channel':
      return getChannelName(sale).toLowerCase()
    case 'lines_per_order':
      return sale.lines_per_order ?? -1
    case 'gross_total':
      return sale.gross_total ?? 0
    case 'discount_amount':
      return sale.discount_amount ?? 0
    case 'status':
      return (sale.status ?? '').toLowerCase()
    default:
      return ''
  }
}

interface SalesHistoryTableProps {
  sales: SaleRow[]
  /** Filtros controlados desde el padre (para KPIs reactivos) */
  filterWeek?: string
  filterChannel?: string
  filterStatus?: string
  onFilterChange?: (week: string, channel: string, status: string) => void
  userRole?: string
  onEdit?: (saleId: string) => void
  onCancel?: (saleId: string) => void
}

const STATUS_LABELS: Record<string, string> = {
  closed: 'Cerrada',
  review: 'Revisión',
  cancelled: 'Anulada',
  contact: 'Contacto',
}

export default function SalesHistoryTable({
  sales,
  filterWeek: controlledWeek = '',
  filterChannel: controlledChannel = '',
  filterStatus: controlledStatus = '',
  onFilterChange,
  userRole,
  onEdit,
  onCancel,
}: SalesHistoryTableProps) {
  const router  = useRouter()
  const canEdit = (userRole === 'admin' || userRole === 'manager') && !!onEdit
  const canCancel = (userRole === 'admin' || userRole === 'manager') && !!onCancel

  // Modal de confirmación de anulación
  const [cancelTarget, setCancelTarget] = useState<string | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  async function confirmCancel() {
    if (!cancelTarget || !onCancel) return
    setCancelLoading(true)
    setCancelError(null)
    try {
      const res = await fetch(`/api/sales/${cancelTarget}/cancel`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) { setCancelError(json.error ?? 'Error al anular'); setCancelLoading(false); return }
      setCancelTarget(null)
      setCancelLoading(false)
      onCancel(cancelTarget)
    } catch {
      setCancelError('Error de red'); setCancelLoading(false)
    }
  }

  const [sortBy, setSortBy] = useState<SortKey>('sale_date')
  const [sortAsc, setSortAsc] = useState(false)
  const [page, setPage] = useState(0)
  const [internalWeek, setInternalWeek] = useState<string>('')
  const [internalChannel, setInternalChannel] = useState<string>('')
  const [internalStatus, setInternalStatus] = useState<string>('')

  const isControlled = onFilterChange != null
  const filterWeek = isControlled ? controlledWeek : internalWeek
  const filterChannel = isControlled ? controlledChannel : internalChannel
  const filterStatus = isControlled ? controlledStatus : internalStatus

  function setFilterWeek(v: string) {
    if (isControlled) onFilterChange!(v, filterChannel, filterStatus)
    else setInternalWeek(v)
    setPage(0)
  }
  function setFilterChannel(v: string) {
    if (isControlled) onFilterChange!(filterWeek, v, filterStatus)
    else setInternalChannel(v)
    setPage(0)
  }
  function setFilterStatus(v: string) {
    if (isControlled) onFilterChange!(filterWeek, filterChannel, v)
    else setInternalStatus(v)
    setPage(0)
  }

  const uniqueWeeks = useMemo(() => {
    const set = new Set<number>()
    sales.forEach((s) => {
      if (s.week_number != null) set.add(s.week_number)
    })
    return Array.from(set).sort((a, b) => a - b)
  }, [sales])

  const uniqueChannels = useMemo(() => {
    const set = new Set<string>()
    sales.forEach((s) => {
      const name = getChannelName(s)
      if (name && name !== '—') set.add(name)
    })
    return Array.from(set).sort()
  }, [sales])

  const uniqueStatuses = useMemo(() => {
    const set = new Set<string>()
    sales.forEach((s) => {
      if (s.status) set.add(s.status)
    })
    return Array.from(set)
  }, [sales])

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (filterWeek && String(s.week_number ?? '') !== filterWeek) return false
      if (filterChannel && getChannelName(s) !== filterChannel) return false
      if (filterStatus && (s.status ?? '') !== filterStatus) return false
      return true
    })
  }, [sales, filterWeek, filterChannel, filterStatus])

  const sortedSales = useMemo(() => {
    return [...filteredSales].sort((a, b) => {
      const va = getSortValue(a, sortBy)
      const vb = getSortValue(b, sortBy)
      const cmp =
        typeof va === 'string' && typeof vb === 'string'
          ? va.localeCompare(vb)
          : (va as number) - (vb as number)
      return sortAsc ? cmp : -cmp
    })
  }, [filteredSales, sortBy, sortAsc])

  const totalPages = Math.ceil(sortedSales.length / PAGE_SIZE)
  const paginatedSales = sortedSales.slice(
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

  const hasActiveFilters = filterWeek || filterChannel || filterStatus

  if (sales.length === 0) {
    return (
      <p
        style={{
          textAlign: 'center',
          color: 'var(--muted)',
          fontSize: 14,
          padding: 32,
        }}
      >
        Aún no hay ventas registradas
      </p>
    )
  }

  if (filteredSales.length === 0) {
    return (
      <div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
            padding: '10px 0 12px',
            borderBottom: '1px solid var(--border)',
            marginBottom: 12,
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
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Semana</span>
            <select
              value={filterWeek}
              onChange={(e) => setFilterWeek(e.target.value)}
              style={{
                padding: '5px 10px',
                fontSize: 11,
                borderRadius: 6,
                border: '1px solid var(--border2)',
                background: 'var(--surface)',
                fontFamily: 'var(--font-jakarta)',
                minWidth: 80,
              }}
            >
              <option value="">Todas</option>
              {uniqueWeeks.map((w) => (
                <option key={w} value={String(w)}>S{w}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Canal</span>
            <select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              style={{
                padding: '5px 10px',
                fontSize: 11,
                borderRadius: 6,
                border: '1px solid var(--border2)',
                background: 'var(--surface)',
                fontFamily: 'var(--font-jakarta)',
                minWidth: 120,
              }}
            >
              <option value="">Todos</option>
              {uniqueChannels.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Estado</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: '5px 10px',
                fontSize: 11,
                borderRadius: 6,
                border: '1px solid var(--border2)',
                background: 'var(--surface)',
                fontFamily: 'var(--font-jakarta)',
                minWidth: 110,
              }}
            >
              <option value="">Todos</option>
              {uniqueStatuses.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              setFilterWeek('')
              setFilterChannel('')
              setFilterStatus('')
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
          No hay ventas que coincidan con los filtros seleccionados.
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
      {/* Segmento de filtros (estático) */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
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
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>Semana</span>
          <select
            value={filterWeek}
            onChange={(e) => setFilterWeek(e.target.value)}
            style={{
              padding: '5px 10px',
              fontSize: 11,
              borderRadius: 6,
              border: '1px solid var(--border2)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontFamily: 'var(--font-jakarta)',
              cursor: 'pointer',
              minWidth: 80,
            }}
          >
            <option value="">Todas</option>
            {uniqueWeeks.map((w) => (
              <option key={w} value={String(w)}>
                S{w}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>Canal</span>
          <select
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value)}
            style={{
              padding: '5px 10px',
              fontSize: 11,
              borderRadius: 6,
              border: '1px solid var(--border2)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontFamily: 'var(--font-jakarta)',
              cursor: 'pointer',
              minWidth: 120,
            }}
          >
            <option value="">Todos</option>
            {uniqueChannels.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>Estado</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '5px 10px',
              fontSize: 11,
              borderRadius: 6,
              border: '1px solid var(--border2)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontFamily: 'var(--font-jakarta)',
              cursor: 'pointer',
              minWidth: 110,
            }}
          >
            <option value="">Todos</option>
            {uniqueStatuses.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s] ?? s}
              </option>
            ))}
          </select>
        </label>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setFilterWeek('')
              setFilterChannel('')
              setFilterStatus('')
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
          {filteredSales.length} resultado{filteredSales.length !== 1 ? 's' : ''}
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
          style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}
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
              {canEdit && (
                <th
                  style={{
                    padding: '10px 12px',
                    color: 'var(--muted)',
                    fontWeight: 600,
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedSales.map((sale) => (
              <tr
                key={sale.id}
                onClick={() => router.push(`/sales/${sale.id}`)}
                style={{
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '10px 12px', color: 'var(--text)' }}>
                  {formatBusinessDate(sale.sale_date)}
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>
                  {sale.week_number ?? '—'}
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>
                  {getChannelName(sale)}
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>
                  {sale.lines_per_order ?? '—'}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    color: 'var(--text)',
                    textAlign: 'right',
                  }}
                >
                  $ {Number(sale.gross_total).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    color: 'var(--text2)',
                    textAlign: 'right',
                  }}
                >
                  $ {(sale.discount_amount ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <StatusBadge status={sale.status} />
                </td>
                {(canEdit || canCancel) && (
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {canEdit && sale.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); onEdit!(sale.id) }}
                          style={{
                            padding: '4px 10px',
                            fontSize: 11,
                            borderRadius: 6,
                            border: '1px solid var(--border2)',
                            background: 'var(--hover)',
                            color: 'var(--text2)',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-jakarta)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ✏ Editar
                        </button>
                      )}
                      {canCancel && sale.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setCancelTarget(sale.id); setCancelError(null) }}
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
                          ✕ Anular
                        </button>
                      )}
                      {sale.status === 'cancelled' && (
                        <span style={{ fontSize: 11, color: 'var(--muted)', padding: '4px 0' }}>—</span>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
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
            marginTop: 8,
            borderTop: '1px solid var(--border)',
            gap: 12,
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sortedSales.length)} de{' '}
            {sortedSales.length}
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

      {/* ── Modal confirmación anulación ─────────────────────── */}
      {cancelTarget && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
          onClick={() => { if (!cancelLoading) { setCancelTarget(null); setCancelError(null) } }}
        >
          <div
            style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px', width: '100%', maxWidth: 400, boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-syne font-bold" style={{ fontSize: 15, color: 'var(--text)', marginBottom: 10 }}>
              Anular venta
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.5 }}>
              Esta acción es irreversible. Se revertirá el inventario de todos los productos de esta venta y el estado cambiará a <strong>Anulada</strong>.
            </p>
            {cancelError && (
              <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--red)', marginBottom: 12 }}>
                {cancelError}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => { setCancelTarget(null); setCancelError(null) }}
                disabled={cancelLoading}
                style={{ flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 500, background: 'var(--hover)', color: 'var(--text2)', border: '1px solid var(--border)', cursor: cancelLoading ? 'not-allowed' : 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                disabled={cancelLoading}
                className="font-syne font-bold"
                style={{ flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, background: cancelLoading ? 'rgba(220,38,38,0.4)' : 'rgba(220,38,38,0.85)', color: '#fff', border: 'none', cursor: cancelLoading ? 'not-allowed' : 'pointer' }}
              >
                {cancelLoading ? 'Anulando…' : 'Sí, anular venta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
