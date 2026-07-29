'use client'

import { useState } from 'react'
import Link from 'next/link'
import EditSupplierModal from './EditSupplierModal'
import type { SupplierRow } from './SuppliersTable'

// ── Types ──────────────────────────────────────────────────────────────────

type FullSupplier = SupplierRow & {
  bank_tax_id?: string | null
  default_lead_time_days?: number | null
  payment_terms?: string | null
}

interface Product {
  id: string
  name: string
  sku: string | null
  sale_price: number | null
  unit_cost: number | null
  current_stock: number | null
  unit_label: string | null
  product_type: string | null
  is_active: boolean | null
}

interface PurchaseRow {
  id: string
  purchase_date: string | null
  total: number | null
  status: string | null
  payment_method: string | null
  notes: string | null
}

interface SupplierDetailViewProps {
  supplier: FullSupplier
  products: Product[]
  purchases?: PurchaseRow[]
  totalPurchased?: number
  pendingPayable?: number
  lastPurchaseDate?: string | null
  userRole: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

function displayName(s: FullSupplier): string {
  if (s.is_company === false && (s.first_name || s.last_name)) {
    return [s.first_name, s.last_name].filter(Boolean).join(' ')
  }
  return s.name ?? '—'
}

function idTypeLabel(t: string | null) {
  if (t === 'cedula') return 'Cédula'
  if (t === 'ruc') return 'RUC'
  if (t === 'pasaporte') return 'Pasaporte'
  return t ?? '—'
}

function accountTypeLabel(t: string | null) {
  if (t === 'savings')  return 'Ahorros'
  if (t === 'checking') return 'Corriente'
  return t ?? '—'
}

// ── Shared styles ──────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '14px 16px',
}

const sectionLabel: React.CSSProperties = {
  fontSize: 9,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  fontWeight: 700,
  color: 'var(--muted)',
  marginBottom: 10,
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{value ?? '—'}</span>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────

function statusLabel(s: string | null) {
  if (s === 'paid') return { text: 'Pagado', color: 'var(--green)' }
  if (s === 'pending') return { text: 'Pendiente', color: 'var(--gold)' }
  if (s === 'partial') return { text: 'Parcial', color: '#f97316' }
  if (s === 'cancelled') return { text: 'Anulado', color: 'var(--red)' }
  return { text: s ?? '—', color: 'var(--muted)' }
}

function paymentLabel(m: string | null) {
  if (m === 'cash') return 'Efectivo'
  if (m === 'transfer') return 'Transferencia'
  if (m === 'card') return 'Tarjeta'
  if (m === 'credit') return 'Crédito'
  return m ?? '—'
}

export default function SupplierDetailView({ supplier, products, purchases = [], totalPurchased = 0, pendingPayable = 0, lastPurchaseDate, userRole }: SupplierDetailViewProps) {
  const [editing, setEditing] = useState(false)

  const canEdit = userRole === 'admin' || userRole === 'manager'

  const totalInventoryValue = products.reduce((sum, p) => {
    return sum + (p.current_stock ?? 0) * (p.unit_cost ?? 0)
  }, 0)

  const activeProducts = products.filter((p) => p.is_active !== false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 900 }}>

      {/* Header card */}
      <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <h1 className="font-syne font-bold" style={{ fontSize: 20, color: 'var(--text)', margin: 0 }}>
              {displayName(supplier)}
            </h1>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: '0.06em', background: supplier.is_company === false ? 'rgba(59,130,246,0.1)' : 'rgba(217,119,6,0.08)', color: supplier.is_company === false ? '#3b82f6' : 'var(--gold)' }}>
              {supplier.is_company === false ? 'Persona natural' : 'Empresa'}
            </span>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: '0.06em', background: supplier.is_active ? 'rgba(5,150,105,0.1)' : 'rgba(220,38,38,0.07)', color: supplier.is_active ? 'var(--green)' : 'var(--red)' }}>
              {supplier.is_active ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
            {idTypeLabel(supplier.id_type)}: {supplier.tax_id ?? '—'}
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'var(--hover)', color: 'var(--text2)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'var(--font-syne)', whiteSpace: 'nowrap' }}
          >
            ✎ Editar
          </button>
        )}
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { label: 'Productos registrados', value: activeProducts.length },
          { label: 'Valor inventario', value: `$${totalInventoryValue.toLocaleString('es-EC', { minimumFractionDigits: 2 })}` },
          { label: 'Total comprado', value: `$${totalPurchased.toLocaleString('es-EC', { minimumFractionDigits: 2 })}` },
          { label: 'Días de entrega', value: supplier.default_lead_time_days ? `${supplier.default_lead_time_days} días` : '—' },
        ].map((kpi) => (
          <div key={kpi.label} style={{ ...card }}>
            <p style={{ ...sectionLabel, marginBottom: 4 }}>{kpi.label}</p>
            <p className="font-syne font-bold" style={{ fontSize: 20, color: 'var(--text)', margin: 0 }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Contacto */}
        <div style={card}>
          <p style={sectionLabel}>Contacto</p>
          <Row label="Teléfono"  value={supplier.phone} />
          <Row label="Email"     value={supplier.email} />
          <Row label="Dirección" value={supplier.address} />
          {supplier.payment_terms && <Row label="Términos de pago" value={supplier.payment_terms} />}
        </div>

        {/* Datos bancarios */}
        <div style={card}>
          <p style={sectionLabel}>Datos bancarios</p>
          {supplier.bank_name || supplier.bank_account ? (
            <>
              <Row label="Banco"          value={supplier.bank_name} />
              <Row label="Tipo de cuenta" value={accountTypeLabel(supplier.account_type ?? null)} />
              <Row label="Número"         value={supplier.bank_account} />
              <Row label="RUC/Cédula"     value={supplier.bank_tax_id} />
            </>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, textAlign: 'center', padding: '12px 0' }}>
              Sin datos bancarios registrados
            </p>
          )}
        </div>
      </div>

      {/* Productos */}
      <div style={card}>
        <p style={sectionLabel}>Productos de este proveedor ({activeProducts.length})</p>
        {activeProducts.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, textAlign: 'center', padding: '16px 0' }}>
            Sin productos asignados. Edita un producto y asigna este proveedor.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Producto', 'SKU', 'Stock actual', 'Precio venta', 'Costo unit.'].map((h) => (
                  <th key={h} style={{ padding: '6px 8px', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, color: 'var(--muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeProducts.map((p) => (
                <tr key={p.id}>
                  <td style={{ padding: '7px 8px', fontSize: 12, color: 'var(--text)', fontWeight: 500, borderBottom: '1px solid var(--border)' }}>
                    <Link href={`/inventory/${p.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {p.name}
                    </Link>
                  </td>
                  <td style={{ padding: '7px 8px', fontSize: 11, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>{p.sku ?? '—'}</td>
                  <td style={{ padding: '7px 8px', fontSize: 12, color: 'var(--text2)', borderBottom: '1px solid var(--border)' }}>
                    {p.product_type === 'service' ? '—' : `${p.current_stock ?? 0} ${p.unit_label ?? ''}`}
                  </td>
                  <td style={{ padding: '7px 8px', fontSize: 12, color: 'var(--text2)', borderBottom: '1px solid var(--border)' }}>
                    ${(p.sale_price ?? 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '7px 8px', fontSize: 12, color: 'var(--text2)', borderBottom: '1px solid var(--border)' }}>
                    ${(p.unit_cost ?? 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Historial de compras */}
      <div style={card}>
        <p style={sectionLabel}>Historial de compras ({purchases.length})</p>

        {/* Mini KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Total comprado', value: `$${totalPurchased.toLocaleString('es-EC', { minimumFractionDigits: 2 })}` },
            { label: 'CxP pendiente', value: `$${pendingPayable.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`, highlight: pendingPayable > 0 },
            { label: 'Última compra', value: lastPurchaseDate ? new Date(lastPurchaseDate + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
          ].map((kpi) => (
            <div key={kpi.label} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--surface)', border: `1px solid ${kpi.highlight ? 'rgba(245,200,66,0.3)' : 'var(--border)'}` }}>
              <p style={{ ...sectionLabel, marginBottom: 4 }}>{kpi.label}</p>
              <p className="font-syne font-bold" style={{ fontSize: 16, color: kpi.highlight ? 'var(--gold)' : 'var(--text)', margin: 0 }}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {purchases.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '20px 0', margin: 0 }}>
            Sin compras registradas a este proveedor.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Fecha', 'Total', 'Estado', 'Forma de pago', 'Notas'].map((h) => (
                    <th key={h} style={{ padding: '6px 8px', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, color: 'var(--muted)', textAlign: 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => {
                  const st = statusLabel(p.status)
                  return (
                    <tr key={p.id}>
                      <td style={{ padding: '7px 8px', fontSize: 12, color: 'var(--text2)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                        {p.purchase_date ? new Date(p.purchase_date + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '7px 8px', fontSize: 12, color: 'var(--text)', fontWeight: 600, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        ${(p.total ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.05em', background: `${st.color}18`, color: st.color }}>
                          {st.text}
                        </span>
                      </td>
                      <td style={{ padding: '7px 8px', fontSize: 12, color: 'var(--text2)', borderBottom: '1px solid var(--border)' }}>
                        {paymentLabel(p.payment_method)}
                      </td>
                      <td style={{ padding: '7px 8px', fontSize: 11, color: 'var(--muted)', borderBottom: '1px solid var(--border)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.notes ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <EditSupplierModal
          supplier={supplier}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  )
}
