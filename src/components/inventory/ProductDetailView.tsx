'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import EditProductModal, {
  type ProductDetail,
  type ProductCategory,
  type Supplier,
} from '@/components/inventory/EditProductModal'
import AddMovementForm from '@/components/inventory/AddMovementForm'
import PriceHistoryView, { type PriceHistoryRow } from '@/components/inventory/PriceHistoryView'

// ── Types ─────────────────────────────────────────────────────────────────

interface ProductWithMeta extends ProductDetail {
  category_name: string | null
  supplier_name: string | null
}

interface Movement {
  id: string
  type: string
  reason: string | null
  quantity: number
  movement_date: string
  notes: string | null
  batch_number: string | null
  created_at: string
}

interface ProductDetailViewProps {
  product: ProductWithMeta
  movements: Movement[]
  priceHistory: PriceHistoryRow[]
  categories: ProductCategory[]
  suppliers: Supplier[]
  userRole: string
  companyId: string
}

// ── Helpers ───────────────────────────────────────────────────────────────

type StockLevel = 'critical' | 'low' | 'ok' | 'service'

function getStockLevel(p: ProductDetail): StockLevel {
  if (p.product_type === 'service') return 'service'
  const stock = p.current_stock ?? 0
  const min   = p.min_stock_alert ?? 0
  if (min > 0 && stock <= min)     return 'critical'
  if (min > 0 && stock <= min * 2) return 'low'
  return 'ok'
}

type ExpiryLevel = 'expired' | 'critical' | 'warn' | 'ok' | 'none'

function getExpiryLevel(p: ProductDetail): ExpiryLevel {
  if (!p.is_perishable || !p.expiry_date) return 'none'
  const today = new Date(); today.setHours(0,0,0,0)
  const exp   = new Date(p.expiry_date)
  const diff  = Math.round((exp.getTime() - today.getTime()) / 86_400_000)
  if (diff < 0)   return 'expired'
  if (diff <= 7)  return 'critical'
  if (diff <= 30) return 'warn'
  return 'ok'
}

const STOCK_COLOR: Record<StockLevel, string> = {
  critical: 'var(--red)',
  low:      'var(--orange)',
  ok:       'var(--green)',
  service:  'var(--muted)',
}

const EXPIRY_COLOR: Record<ExpiryLevel, string> = {
  expired:  'var(--red)',
  critical: 'var(--red)',
  warn:     'var(--orange)',
  ok:       'var(--green)',
  none:     'var(--muted)',
}

const MOVEMENT_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  in:         { bg: 'rgba(5,150,105,0.1)',  color: 'var(--green)',  label: '📥 Entrada' },
  out:        { bg: 'rgba(220,38,38,0.08)', color: 'var(--red)',    label: '📤 Salida' },
  adjustment: { bg: 'rgba(217,119,6,0.1)',  color: 'var(--orange)', label: '⚖ Ajuste' },
}

const REASON_LABELS: Record<string, string> = {
  purchase:   'Compra',
  sale:       'Venta',
  return:     'Devolución',
  adjustment: 'Ajuste',
  damage:     'Daño / Merma',
  transfer:   'Transferencia',
  initial:    'Stock inicial',
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--text)', textAlign: 'right' }}>{children}</span>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────

export default function ProductDetailView({
  product,
  movements,
  priceHistory,
  categories,
  suppliers,
  userRole,
}: ProductDetailViewProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)

  const canManage  = userRole === 'admin' || userRole === 'manager'
  const isService  = product.product_type === 'service'
  const stockLevel = getStockLevel(product)
  const expiryLevel = getExpiryLevel(product)
  const unitLbl    = product.unit_label ?? 'uds.'
  const stock      = product.current_stock ?? 0

  const salePrice  = product.sale_price  ?? 0
  const unitCost   = product.unit_cost   ?? 0
  const margin     = salePrice > 0 && unitCost > 0
    ? (((salePrice - unitCost) / salePrice) * 100).toFixed(1)
    : null

  // Expiry text
  let expiryText = '—'
  let expiryDiff: number | null = null
  if (product.is_perishable && product.expiry_date) {
    const today = new Date(); today.setHours(0,0,0,0)
    const exp = new Date(product.expiry_date)
    expiryDiff = Math.round((exp.getTime() - today.getTime()) / 86_400_000)
    if (expiryLevel === 'expired') expiryText = 'Vencido'
    else if (expiryDiff === 0)    expiryText = 'Hoy'
    else if (expiryDiff === 1)    expiryText = 'Mañana'
    else expiryText = `En ${expiryDiff} días (${product.expiry_date})`
  }

  // Movement totals
  const totalIn  = movements.filter((m) => m.type === 'in').reduce((s, m) => s + m.quantity, 0)
  const totalOut = movements.filter((m) => m.type === 'out').reduce((s, m) => s + m.quantity, 0)

  return (
    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 900 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <h1 className="font-syne font-bold" style={{ fontSize: 22, color: 'var(--text)', margin: 0 }}>
              {product.name}
            </h1>
            {product.sku && (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, background: 'var(--hover)', color: 'var(--muted)', fontFamily: 'var(--font-jakarta)' }}>
                {product.sku}
              </span>
            )}
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 5, fontWeight: 500,
              background: isService ? 'rgba(146,148,172,0.12)' : 'rgba(37,99,235,0.1)',
              color: isService ? 'var(--muted)' : 'var(--blue)',
            }}>
              {isService ? '⚙ Servicio' : '📦 Producto'}
            </span>
            {!product.is_active && (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, background: 'rgba(220,38,38,0.08)', color: 'var(--red)' }}>
                Inactivo
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {product.category_name && (
              <span style={{ fontSize: 11, color: 'var(--text2)' }}>{product.category_name}</span>
            )}
            {product.unit_label && !isService && (
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>· {product.unit_label}</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!isService && (
            <AddMovementForm
              product={{
                id: product.id,
                name: product.name,
                current_stock: stock,
                unit_label: product.unit_label,
                unit_cost: product.unit_cost,
                supplier_price: product.supplier_price,
                product_type: product.product_type,
              }}
            />
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="font-syne font-bold"
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13,
                background: 'linear-gradient(135deg, #F5C842, #F09A1A)',
                color: '#1A1B2E',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Editar producto
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>

        {/* ── KPIs ── */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
          <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 700, margin: '0 0 10px' }}>
            Métricas
          </p>

          {!isService && (
            <InfoRow label="Stock actual">
              <span style={{ fontWeight: 700, color: STOCK_COLOR[stockLevel] }}>
                {stock.toLocaleString('es-EC', { maximumFractionDigits: 3 })} {unitLbl}
              </span>
            </InfoRow>
          )}
          {!isService && (
            <InfoRow label="Stock mínimo">
              {(product.min_stock_alert ?? 0).toLocaleString('es-EC', { maximumFractionDigits: 3 })} {unitLbl}
            </InfoRow>
          )}
          <InfoRow label="Precio de venta">
            <strong>${salePrice.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</strong>
          </InfoRow>
          <InfoRow label="Costo unitario">
            ${unitCost.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
          </InfoRow>
          {margin !== null && (
            <InfoRow label="Margen bruto">
              <span style={{ color: parseFloat(margin) > 30 ? 'var(--green)' : parseFloat(margin) > 10 ? 'var(--orange)' : 'var(--red)', fontWeight: 600 }}>
                {margin}%
              </span>
            </InfoRow>
          )}
          {!isService && product.lead_time_days != null && (
            <InfoRow label="Días de reposición">
              {product.lead_time_days}d
            </InfoRow>
          )}
        </div>

        {/* ── Caducidad ── */}
        {!isService && product.is_perishable && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
            <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 700, margin: '0 0 10px' }}>
              Perecedero
            </p>
            <InfoRow label="Caducidad del lote">
              <span style={{ fontWeight: 600, color: EXPIRY_COLOR[expiryLevel] }}>
                {expiryText}
              </span>
            </InfoRow>
            {product.shelf_life_days != null && (
              <InfoRow label="Vida útil">
                {product.shelf_life_days} días
              </InfoRow>
            )}
            {product.expiry_date && (
              <InfoRow label="Fecha exacta">
                {product.expiry_date}
              </InfoRow>
            )}
          </div>
        )}

        {/* ── Proveedor ── */}
        {(product.supplier_name || product.supplier_price) && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
            <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 700, margin: '0 0 10px' }}>
              Proveedor
            </p>
            {product.supplier_name && (
              <InfoRow label="Nombre">{product.supplier_name}</InfoRow>
            )}
            {product.supplier_price != null && (
              <InfoRow label="Precio proveedor">
                ${product.supplier_price.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
              </InfoRow>
            )}
            {product.unit_cost != null && product.supplier_price != null && product.supplier_price > 0 && (
              <InfoRow label="Diferencia costo/proveedor">
                <span style={{ color: product.unit_cost > product.supplier_price ? 'var(--orange)' : 'var(--green)' }}>
                  {product.unit_cost > product.supplier_price
                    ? `+$${(product.unit_cost - product.supplier_price).toFixed(2)}`
                    : `-$${(product.supplier_price - product.unit_cost).toFixed(2)}`}
                </span>
              </InfoRow>
            )}
          </div>
        )}

        {/* ── Movement totals ── */}
        {!isService && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
            <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 700, margin: '0 0 10px' }}>
              Resumen de movimientos
            </p>
            <InfoRow label="Total entradas">
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                +{totalIn.toLocaleString('es-EC', { maximumFractionDigits: 3 })} {unitLbl}
              </span>
            </InfoRow>
            <InfoRow label="Total salidas">
              <span style={{ color: 'var(--red)', fontWeight: 600 }}>
                -{totalOut.toLocaleString('es-EC', { maximumFractionDigits: 3 })} {unitLbl}
              </span>
            </InfoRow>
            <InfoRow label="Capital en stock">
              ${(stock * unitCost).toLocaleString('es-EC', { minimumFractionDigits: 2 })}
            </InfoRow>
          </div>
        )}
      </div>

      {/* ── Historial de precios ── */}
      <PriceHistoryView
        history={priceHistory}
        currentSalePrice={product.sale_price}
        currentUnitCost={product.unit_cost}
        currentSupplierPrice={product.supplier_price}
      />

      {/* ── Historial de movimientos ── */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
        <h2 className="font-syne font-bold" style={{ fontSize: 15, color: 'var(--text)', margin: '0 0 12px' }}>
          Historial de movimientos
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400, marginLeft: 8 }}>
            ({movements.length} registros)
          </span>
        </h2>

        {movements.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            Sin movimientos registrados.
          </p>
        ) : (
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Fecha', 'Tipo', 'Razón', 'Cantidad', 'Lote', 'Notas'].map((h) => (
                    <th key={h} scope="col" style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => {
                  const badge = MOVEMENT_BADGE[m.type] ?? MOVEMENT_BADGE.adjustment
                  const qtyColor = m.type === 'in' ? 'var(--green)' : m.type === 'out' ? 'var(--red)' : 'var(--orange)'
                  const qtySign  = m.type === 'in' ? '+' : m.type === 'out' ? '-' : '±'
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '9px 10px', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                        {m.movement_date}
                      </td>
                      <td style={{ padding: '9px 10px' }}>
                        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, fontWeight: 500, background: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '9px 10px', color: 'var(--text2)' }}>
                        {m.reason ? (REASON_LABELS[m.reason] ?? m.reason) : '—'}
                      </td>
                      <td style={{ padding: '9px 10px', fontWeight: 700, color: qtyColor, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {qtySign}{m.quantity.toLocaleString('es-EC', { maximumFractionDigits: 3 })} {unitLbl}
                      </td>
                      <td style={{ padding: '9px 10px', color: 'var(--text2)', fontFamily: 'var(--font-jakarta)', fontSize: 11 }}>
                        {m.batch_number ?? <span style={{ color: 'var(--muted)' }}>—</span>}
                      </td>
                      <td style={{ padding: '9px 10px', color: 'var(--text2)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.notes ?? <span style={{ color: 'var(--muted)' }}>—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Back */}
      <div>
        <button
          type="button"
          onClick={() => router.push('/inventory')}
          style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
        >
          ← Volver al inventario
        </button>
      </div>

      {/* Edit modal */}
      {editing && (
        <EditProductModal
          product={product}
          categories={categories}
          suppliers={suppliers}
          onClose={() => setEditing(false)}
          onSuccess={() => { setEditing(false); router.refresh() }}
        />
      )}
    </div>
  )
}
