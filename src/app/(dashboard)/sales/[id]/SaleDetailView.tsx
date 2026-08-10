'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import EditSaleModal, { type SaleWithItems, type SaleStatus } from '@/components/sales/EditSaleModal'

// ── Types ────────────────────────────────────────────────────

export interface SaleItemDetail {
  id: string
  quantity: number
  unit_price: number
  unit_cost: number
  discount_amount: number
  subtotal: number | null
  products: { name: string; sku: string | null } | null
}

export interface SaleForDetail {
  id: string
  sale_date: string
  week_number: number | null
  year: number | null
  status: string | null
  gross_total: number
  discount_amount: number | null
  production_cost: number | null
  lines_per_order: number | null
  customer_id: string | null
  branch_id: string | null
  channel_id: string | null
  customers: { full_name: string | null } | null
  branches: { name: string } | null
  sales_channels: { name: string } | null
  sale_items: SaleItemDetail[]
}

export interface MovementDetail {
  type: string
  quantity: number
  movement_date: string
  notes: string | null
  reason: string | null
  products: { sku: string | null } | null
}

interface SaleDetailViewProps {
  sale: SaleForDetail
  movements: MovementDetail[]
  userRole: string
  companyId: string
  customers: { id: string; full_name: string | null }[]
  branches: { id: string; name: string }[]
  channels: { id: string; name: string }[]
  saleStatuses: SaleStatus[]
}

// ── Helpers ──────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatLongDate(iso: string): string {
  try {
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('es-EC', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function formatShortDate(iso: string): string {
  try {
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

// ── Status badge ─────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  closed:    { bg: 'rgba(5,150,105,0.1)',  color: 'var(--green)',  label: 'Cerrada'  },
  review:    { bg: 'rgba(217,119,6,0.1)', color: 'var(--orange)', label: 'Revisión' },
  cancelled: { bg: 'rgba(220,38,38,0.1)', color: 'var(--red)',    label: 'Anulada'  },
  contact:   { bg: 'rgba(37,99,235,0.08)', color: 'var(--blue)',  label: 'Contacto' },
}

function StatusBadge({ status }: { status: string | null }) {
  const c =
    STATUS_CONFIG[status ?? ''] ?? {
      bg: 'var(--hover)',
      color: 'var(--text2)',
      label: status ?? '—',
    }
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: 6,
        background: c.bg,
        color: c.color,
      }}
    >
      {c.label}
    </span>
  )
}

// ── Movement type label ──────────────────────────────────────

const MOVEMENT_TYPE: Record<string, { label: string; color: string }> = {
  out: { label: '↓ Salida',  color: 'var(--red)'   },
  in:  { label: '↑ Entrada', color: 'var(--green)' },
}

// ── Shared card style ────────────────────────────────────────

const card: React.CSSProperties = {
  background:   'var(--card)',
  border:       '1px solid var(--border)',
  borderRadius: 12,
  padding:      '16px 18px',
}

const sectionTitle: React.CSSProperties = {
  fontFamily:    'var(--font-syne)',
  fontWeight:    700,
  fontSize:      14,
  color:         'var(--text)',
  marginBottom:  12,
}

const metaLabel: React.CSSProperties = {
  fontSize:      10,
  fontWeight:    600,
  color:         'var(--muted)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  marginBottom:  2,
}

const metaValue: React.CSSProperties = {
  fontSize: 13,
  color:    'var(--text)',
}

// ── Table helpers ────────────────────────────────────────────

const th: React.CSSProperties = {
  padding:       '8px 12px',
  fontSize:      10,
  fontWeight:    600,
  color:         'var(--muted)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  whiteSpace:    'nowrap' as const,
  borderBottom:  '1px solid var(--border)',
}

const td: React.CSSProperties = {
  padding:      '10px 12px',
  fontSize:     13,
  color:        'var(--text)',
  borderBottom: '1px solid var(--border)',
}

// ── Component ────────────────────────────────────────────────

export default function SaleDetailView({
  sale,
  movements,
  userRole,
  companyId,
  customers,
  branches,
  channels,
  saleStatuses,
}: SaleDetailViewProps) {
  const router = useRouter()
  const canEdit      = userRole === 'admin' || userRole === 'manager'
  const canSeeMargin = userRole === 'admin' || userRole === 'manager'

  const [editSale, setEditSale]         = useState<SaleWithItems | null>(null)
  const [editOpen, setEditOpen]         = useState(false)
  const [fetchingEdit, setFetchingEdit] = useState(false)

  const [cancelOpen, setCancelOpen]       = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelError, setCancelError]     = useState<string | null>(null)

  const isCancelled = sale.status === 'cancelled'

  async function handleEdit() {
    setFetchingEdit(true)
    try {
      const res = await fetch(`/api/sales/${sale.id}`)
      if (!res.ok) return
      const { sale: fullSale } = await res.json()
      setEditSale(fullSale)
      setEditOpen(true)
    } finally {
      setFetchingEdit(false)
    }
  }

  function handleEditClose() {
    setEditOpen(false)
    setEditSale(null)
  }

  function handleEditSuccess() {
    setEditOpen(false)
    setEditSale(null)
    router.refresh()
  }

  async function handleCancel() {
    setCancelLoading(true)
    setCancelError(null)
    try {
      const res = await fetch(`/api/sales/${sale.id}/cancel`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) { setCancelError(json.error ?? 'Error al anular'); setCancelLoading(false); return }
      setCancelOpen(false)
      router.refresh()
    } catch {
      setCancelError('Error de conexión')
    }
    setCancelLoading(false)
  }

  // ── Derived totals ───────────────────────────────────────
  const subtotalBruto = sale.sale_items.reduce(
    (s, l) => s + Number(l.quantity) * Number(l.unit_price),
    0
  )
  const totalDescuentos = Number(sale.discount_amount ?? 0)
  const totalVenta      = Number(sale.gross_total)
  const costoTotal      = Number(sale.production_cost ?? 0)
  const margenBruto     =
    totalVenta > 0 ? ((totalVenta - costoTotal) / totalVenta) * 100 : 0

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Navigation bar ──────────────────────────────── */}
      <div
        style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
        }}
      >
        <Link
          href="/sales"
          style={{
            display:    'inline-flex',
            alignItems: 'center',
            gap:        6,
            fontSize:   13,
            color:      'var(--text2)',
            textDecoration: 'none',
            padding:    '6px 12px',
            borderRadius: 8,
            border:     '1px solid var(--border)',
            background: 'var(--hover)',
          }}
        >
          ← Volver a ventas
        </Link>

        {canEdit && (
          <div style={{ display: 'flex', gap: 8 }}>
            {!isCancelled && (
              <button
                type="button"
                onClick={() => { setCancelOpen(true); setCancelError(null) }}
                className="font-syne font-bold"
                style={{
                  fontSize: 13, padding: '7px 16px', borderRadius: 8,
                  border: '1px solid rgba(220,38,38,0.3)',
                  background: 'rgba(220,38,38,0.06)',
                  color: 'var(--red)', cursor: 'pointer',
                }}
              >
                Anular
              </button>
            )}
            {!isCancelled && (
              <button
                type="button"
                onClick={handleEdit}
                disabled={fetchingEdit}
                className="font-syne font-bold"
                style={{
                  background: fetchingEdit
                    ? 'rgba(232,165,0,0.45)'
                    : 'linear-gradient(135deg, #F5C842, #F09A1A)',
                  color: '#1A1B2E', fontSize: 13, padding: '7px 18px',
                  borderRadius: 8, border: 'none',
                  cursor: fetchingEdit ? 'not-allowed' : 'pointer',
                  opacity: fetchingEdit ? 0.7 : 1,
                }}
              >
                {fetchingEdit ? 'Cargando…' : '✏ Editar venta'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Header card ─────────────────────────────────── */}
      <div style={card}>
        <div
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        12,
            marginBottom: 14,
            flexWrap:   'wrap',
          }}
        >
          <span
            className="font-syne font-bold"
            style={{ fontSize: 18, color: 'var(--text)', letterSpacing: '0.04em' }}
          >
            #{sale.id.slice(0, 8).toUpperCase()}
          </span>
          <StatusBadge status={sale.status} />
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            {formatLongDate(sale.sale_date)}
          </span>
          {sale.week_number != null && (
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              · Semana {sale.week_number}, {sale.year}
            </span>
          )}
        </div>

        <div
          style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap:                 16,
          }}
        >
          <div>
            <div style={metaLabel}>Cliente</div>
            <div style={metaValue}>
              {sale.customers?.full_name ?? <span style={{ color: 'var(--muted)' }}>—</span>}
            </div>
          </div>
          <div>
            <div style={metaLabel}>Sucursal</div>
            <div style={metaValue}>
              {sale.branches?.name ?? <span style={{ color: 'var(--muted)' }}>—</span>}
            </div>
          </div>
          <div>
            <div style={metaLabel}>Canal de venta</div>
            <div style={metaValue}>
              {sale.sales_channels?.name ?? <span style={{ color: 'var(--muted)' }}>—</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Items + Totals ──────────────────────────────── */}
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: '1fr 280px',
          gap:                 16,
          alignItems:          'start',
        }}
      >
        {/* Items table */}
        <div style={card}>
          <div style={sectionTitle}>Líneas de productos</div>

          {sale.sale_items.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>
              Sin líneas de productos
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...th, textAlign: 'left'  }}>Producto</th>
                    <th style={{ ...th, textAlign: 'right' }}>Cant.</th>
                    <th style={{ ...th, textAlign: 'right' }}>P. Unit.</th>
                    <th style={{ ...th, textAlign: 'right' }}>Descuento</th>
                    <th style={{ ...th, textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.sale_items.map((item) => {
                    const gross    = Number(item.quantity) * Number(item.unit_price)
                    const discount = Number(item.discount_amount)
                    const subtotal = item.subtotal != null
                      ? Number(item.subtotal)
                      : gross - discount
                    return (
                      <tr key={item.id}>
                        <td style={{ ...td, textAlign: 'left' }}>
                          <div style={{ fontWeight: 500 }}>
                            {item.products?.name ?? (
                              <span style={{ color: 'var(--muted)' }}>
                                (producto eliminado)
                              </span>
                            )}
                          </div>
                          {item.products?.sku && (
                            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                              SKU: {item.products.sku}
                            </div>
                          )}
                        </td>
                        <td style={{ ...td, textAlign: 'right', color: 'var(--text2)' }}>
                          {Number(item.quantity)}
                        </td>
                        <td style={{ ...td, textAlign: 'right', color: 'var(--text2)' }}>
                          ${fmt(Number(item.unit_price))}
                        </td>
                        <td style={{ ...td, textAlign: 'right', color: discount > 0 ? 'var(--red)' : 'var(--muted)' }}>
                          {discount > 0 ? `-$${fmt(discount)}` : '—'}
                        </td>
                        <td style={{ ...td, textAlign: 'right', fontWeight: 600, color: 'var(--gold)' }}>
                          ${fmt(subtotal)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Totals panel */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={sectionTitle}>Totales</div>

          <TotalRow label="Subtotal bruto" value={`$${fmt(subtotalBruto)}`} />
          <TotalRow
            label="(-) Descuentos"
            value={totalDescuentos > 0 ? `-$${fmt(totalDescuentos)}` : '—'}
            valueColor={totalDescuentos > 0 ? 'var(--red)' : undefined}
          />

          <div style={{ borderTop: '1px solid var(--border)', margin: '6px 0' }} />

          <TotalRow
            label="Total venta"
            value={`$${fmt(totalVenta)}`}
            bold
            valueColor="var(--gold)"
          />

          {canSeeMargin && (
            <>
              <div style={{ borderTop: '1px solid var(--border)', margin: '6px 0' }} />
              <TotalRow
                label="Costo total"
                value={`-$${fmt(costoTotal)}`}
                valueColor="var(--text2)"
              />
              <TotalRow
                label="Margen bruto"
                value={`${margenBruto.toFixed(1)}%`}
                valueColor={
                  margenBruto >= 30
                    ? 'var(--green)'
                    : margenBruto >= 0
                      ? 'var(--gold)'
                      : 'var(--red)'
                }
                bold
              />
            </>
          )}
        </div>
      </div>

      {/* ── Inventory movements ─────────────────────────── */}
      <div style={card}>
        <div style={sectionTitle}>Movimientos de inventario</div>

        {movements.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '16px 0' }}>
            Sin movimientos registrados para esta venta
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: 'left'  }}>Producto (SKU)</th>
                  <th style={{ ...th, textAlign: 'left'  }}>Tipo</th>
                  <th style={{ ...th, textAlign: 'right' }}>Cantidad</th>
                  <th style={{ ...th, textAlign: 'left'  }}>Fecha</th>
                  <th style={{ ...th, textAlign: 'left'  }}>Notas</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m, i) => {
                  const mvType = MOVEMENT_TYPE[m.type] ?? { label: m.type, color: 'var(--text2)' }
                  return (
                    <tr key={i}>
                      <td style={{ ...td, textAlign: 'left', color: 'var(--text2)' }}>
                        {m.products?.sku ?? '—'}
                      </td>
                      <td style={{ ...td, textAlign: 'left' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: mvType.color }}>
                          {mvType.label}
                        </span>
                      </td>
                      <td style={{ ...td, textAlign: 'right', color: 'var(--text2)' }}>
                        {Number(m.quantity)}
                      </td>
                      <td style={{ ...td, textAlign: 'left', color: 'var(--text2)' }}>
                        {formatShortDate(m.movement_date)}
                      </td>
                      <td
                        style={{
                          ...td,
                          textAlign: 'left',
                          color:     'var(--muted)',
                          fontSize:  11,
                          maxWidth:  260,
                          overflow:  'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={m.notes ?? undefined}
                      >
                        {m.notes ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Cancel confirmation modal ────────────────────── */}
      {cancelOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }}
          onClick={() => { if (!cancelLoading) setCancelOpen(false) }}
        >
          <div
            style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 400, boxShadow: '0 20px 40px rgba(0,0,0,0.14)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-syne font-bold" style={{ fontSize: 15, color: 'var(--text)', marginBottom: 10 }}>
              ¿Anular esta venta?
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
              Se anularán todas las líneas de productos y se revertirán los movimientos de inventario. Esta acción no se puede deshacer.
            </p>
            {cancelError && (
              <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: 'var(--red)' }}>
                {cancelError}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setCancelOpen(false)} disabled={cancelLoading}
                style={{ flex: 1, padding: '9px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: 'var(--hover)', color: 'var(--text2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="button" onClick={handleCancel} disabled={cancelLoading}
                style={{ flex: 1, padding: '9px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'rgba(220,38,38,0.1)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.25)', cursor: cancelLoading ? 'not-allowed' : 'pointer', opacity: cancelLoading ? 0.7 : 1 }}>
                {cancelLoading ? 'Anulando…' : 'Confirmar anulación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit modal ──────────────────────────────────── */}
      {editOpen && editSale && (
        <EditSaleModal
          sale={editSale}
          customers={customers}
          branches={branches}
          channels={channels}
          saleStatuses={saleStatuses}
          companyId={companyId}
          userRole={userRole}
          onClose={handleEditClose}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  )
}

// ── TotalRow helper ──────────────────────────────────────────

function TotalRow({
  label,
  value,
  bold,
  valueColor,
}: {
  label: string
  value: string
  bold?: boolean
  valueColor?: string
}) {
  return (
    <div
      style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        padding:        '7px 0',
        borderBottom:   '1px solid var(--border)',
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--text2)' }}>{label}</span>
      <span
        style={{
          fontSize:    bold ? 14 : 13,
          fontWeight:  bold ? 700 : 500,
          fontFamily:  bold ? 'var(--font-syne)' : 'var(--font-jakarta)',
          color:       valueColor ?? 'var(--text)',
        }}
      >
        {value}
      </span>
    </div>
  )
}
