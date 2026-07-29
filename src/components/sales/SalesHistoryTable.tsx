'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { formatBusinessDate } from '@/lib/dateUtils'

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
  customers?: { full_name: string | null } | null
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
  { key: 'sale_date',       label: 'Fecha',     align: 'left' },
  { key: 'week_number',     label: 'Semana',    align: 'left' },
  { key: 'channel',         label: 'Canal',     align: 'left' },
  { key: 'lines_per_order', label: 'LPP',       align: 'left' },
  { key: 'gross_total',     label: 'Total',     align: 'right' },
  { key: 'discount_amount', label: 'Descuento', align: 'right' },
  { key: 'status',          label: 'Estado',    align: 'left' },
]

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
  const config: Record<string, { bg: string; color: string; label: string }> = {
    closed:    { bg: 'rgba(5,150,105,0.1)',   color: 'var(--green)',  label: 'Cerrada'  },
    review:    { bg: 'rgba(217,119,6,0.1)',   color: 'var(--orange)', label: 'Revisión' },
    cancelled: { bg: 'rgba(220,38,38,0.1)',   color: 'var(--red)',    label: 'Anulada'  },
    contact:   { bg: 'rgba(37,99,235,0.08)', color: 'var(--blue)',   label: 'Contacto' },
  }
  const c = config[status] ?? { bg: 'var(--hover)', color: 'var(--text2)', label: status }
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: c.bg, color: c.color }}>
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
    case 'sale_date':       return sale.sale_date
    case 'week_number':     return sale.week_number ?? -1
    case 'channel':         return getChannelName(sale).toLowerCase()
    case 'lines_per_order': return sale.lines_per_order ?? -1
    case 'gross_total':     return sale.gross_total ?? 0
    case 'discount_amount': return sale.discount_amount ?? 0
    case 'status':          return (sale.status ?? '').toLowerCase()
    default:                return ''
  }
}

interface SalesHistoryTableProps {
  sales: SaleRow[]
  userRole?: string
  onEdit?: (saleId: string) => void
  onCancel?: () => void
}

export default function SalesHistoryTable({
  sales,
  userRole,
  onEdit,
  onCancel,
}: SalesHistoryTableProps) {
  const router = useRouter()
  const canEdit   = (userRole === 'admin' || userRole === 'manager') && !!onEdit
  const canCancel = (userRole === 'admin' || userRole === 'manager')

  const [cancelTarget,  setCancelTarget]  = useState<string | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelError,   setCancelError]   = useState<string | null>(null)

  const [sortBy,  setSortBy]  = useState<SortKey>('sale_date')
  const [sortAsc, setSortAsc] = useState(false)

  async function confirmCancel() {
    if (!cancelTarget) return
    setCancelLoading(true)
    setCancelError(null)
    try {
      const res  = await fetch(`/api/sales/${cancelTarget}/cancel`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) { setCancelError(json.error ?? 'Error al anular'); setCancelLoading(false); return }
      setCancelTarget(null)
      setCancelLoading(false)
      onCancel?.()
    } catch {
      setCancelError('Error de red')
      setCancelLoading(false)
    }
  }

  const sortedSales = useMemo(() => {
    return [...sales].sort((a, b) => {
      const va = getSortValue(a, sortBy)
      const vb = getSortValue(b, sortBy)
      const cmp = typeof va === 'string' && typeof vb === 'string'
        ? va.localeCompare(vb)
        : (va as number) - (vb as number)
      return sortAsc ? cmp : -cmp
    })
  }, [sales, sortBy, sortAsc])

  function handleSort(key: SortKey) {
    if (sortBy === key) setSortAsc((p) => !p)
    else { setSortBy(key); setSortAsc(false) }
  }

  if (sales.length === 0) {
    return (
      <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 14, padding: 32 }}>
        Aún no hay ventas registradas en este período.
      </p>
    )
  }

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--card)', boxShadow: '0 1px 0 var(--border)' }}>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {COLUMNS.map(({ key, label, align }) => {
                const isActive = sortBy === key
                return (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    style={{ textAlign: align, padding: '10px 12px', color: 'var(--muted)', fontWeight: 600, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {label}
                      {isActive && <span style={{ fontSize: 10, color: 'var(--gold)' }}>{sortAsc ? '↑' : '↓'}</span>}
                    </span>
                  </th>
                )
              })}
              <th style={{ padding: '10px 12px', color: 'var(--muted)', fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap' }}>
                Cliente
              </th>
              {(canEdit || canCancel) && (
                <th style={{ padding: '10px 12px', color: 'var(--muted)', fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap' }}>
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedSales.map((sale) => (
              <tr
                key={sale.id}
                onClick={() => router.push(`/sales/${sale.id}`)}
                style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '10px 12px', color: 'var(--text)' }}>
                  {formatBusinessDate(sale.sale_date)}
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>{sale.week_number ?? '—'}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>{getChannelName(sale)}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>{sale.lines_per_order ?? '—'}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text)', textAlign: 'right' }}>
                  $ {Number(sale.gross_total).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text2)', textAlign: 'right' }}>
                  $ {(sale.discount_amount ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <StatusBadge status={sale.status} />
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text2)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {(sale.customers as { full_name?: string | null } | null)?.full_name
                    ?? <span style={{ color: 'var(--muted)' }}>—</span>}
                </td>
                {(canEdit || canCancel) && (
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {canEdit && sale.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); onEdit!(sale.id) }}
                          style={{ padding: '4px 10px', fontSize: 11, borderRadius: 6, border: '1px solid var(--border2)', background: 'var(--hover)', color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-jakarta)', whiteSpace: 'nowrap' }}
                        >
                          ✏ Editar
                        </button>
                      )}
                      {canCancel && sale.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setCancelTarget(sale.id); setCancelError(null) }}
                          style={{ padding: '4px 10px', fontSize: 11, borderRadius: 6, border: '1px solid rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.06)', color: 'var(--red)', cursor: 'pointer', fontFamily: 'var(--font-jakarta)', whiteSpace: 'nowrap' }}
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

      {/* Modal confirmación anulación */}
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
