'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// ── Types ───────────────────────────────────────────────────────────────────

export interface ProductCategory {
  id: string
  name: string
  parent_id?: string | null
}

export interface Supplier {
  id: string
  name: string
}

export interface ProductDetail {
  id: string
  name: string
  sku: string | null
  sale_price: number | null
  unit_cost: number | null
  supplier_price: number | null
  current_stock: number | null
  min_stock_alert: number | null
  lead_time_days: number | null
  category_id: string | null
  supplier_id: string | null
  is_active: boolean
  product_type: string | null
  unit_type: string | null
  unit_label: string | null
  is_perishable: boolean | null
  shelf_life_days: number | null
  expiry_date: string | null
}

interface EditProductModalProps {
  product: ProductDetail | null
  categories: ProductCategory[]
  suppliers: Supplier[]
  onClose: () => void
  onSuccess: () => void
}

// ── Unit options ─────────────────────────────────────────────────────────────

type UnitType = 'unit' | 'weight' | 'volume' | 'length' | 'area'

const UNIT_LABELS: Record<UnitType, { value: string; label: string }[]> = {
  unit:   [{ value: 'unidad',    label: 'Unidad' }],
  weight: [
    { value: 'gramo',     label: 'Gramo (g)' },
    { value: 'kilogramo', label: 'Kilogramo (kg)' },
    { value: 'libra',     label: 'Libra (lb)' },
    { value: 'tonelada',  label: 'Tonelada (t)' },
  ],
  volume: [
    { value: 'ml',    label: 'Mililitro (ml)' },
    { value: 'litro', label: 'Litro (L)' },
    { value: 'galón', label: 'Galón' },
    { value: 'cc',    label: 'Centímetro cúbico (cc)' },
  ],
  length: [
    { value: 'cm',    label: 'Centímetro (cm)' },
    { value: 'metro', label: 'Metro (m)' },
  ],
  area: [
    { value: 'cm²', label: 'Centímetro cuadrado (cm²)' },
    { value: 'm²',  label: 'Metro cuadrado (m²)' },
  ],
}

const UNIT_TYPE_OPTIONS: { value: UnitType; label: string }[] = [
  { value: 'unit',   label: 'Unidad' },
  { value: 'weight', label: 'Peso' },
  { value: 'volume', label: 'Volumen' },
  { value: 'length', label: 'Longitud' },
  { value: 'area',   label: 'Área' },
]

// ── Shared styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border2)',
  color: 'var(--text)',
  fontFamily: 'var(--font-jakarta)',
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 9,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 600,
  marginBottom: 4,
}

const sectionStyle: React.CSSProperties = {
  padding: '10px 12px',
  background: 'var(--bg)',
  borderRadius: 8,
  border: '1px solid var(--border)',
  gridColumn: '1 / -1',
}

const sectionTitle: React.CSSProperties = {
  fontSize: 9,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  fontWeight: 700,
  color: 'var(--muted)',
  marginBottom: 10,
}

function onFocus(
  e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
) {
  e.target.style.borderColor = 'var(--gold)'
  e.target.style.boxShadow = '0 0 0 3px var(--gold-bg)'
}
function onBlur(
  e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
) {
  e.target.style.borderColor = 'var(--border2)'
  e.target.style.boxShadow = 'none'
}

// ── Suffix input ─────────────────────────────────────────────────────────────

function SuffixInput({
  value,
  onChange,
  suffix,
  step = '1',
  min = '0',
}: {
  value: string
  onChange: (v: string) => void
  suffix: string
  step?: string
  min?: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        border: '1px solid var(--border2)',
        borderRadius: 8,
        background: 'var(--surface)',
        overflow: 'hidden',
      }}
    >
      <input
        type="number"
        step={step}
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1,
          padding: '8px 10px',
          fontSize: 14,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'var(--text)',
          fontFamily: 'var(--font-jakarta)',
        }}
        onFocus={(e) => {
          const p = e.currentTarget.parentElement as HTMLElement
          p.style.borderColor = 'var(--gold)'
          p.style.boxShadow = '0 0 0 3px var(--gold-bg)'
        }}
        onBlur={(e) => {
          const p = e.currentTarget.parentElement as HTMLElement
          p.style.borderColor = 'var(--border2)'
          p.style.boxShadow = 'none'
        }}
      />
      {suffix && (
        <span
          style={{
            padding: '8px 10px',
            fontSize: 12,
            color: 'var(--muted)',
            fontFamily: 'var(--font-jakarta)',
            borderLeft: '1px solid var(--border2)',
            background: 'var(--bg)',
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
        >
          {suffix}
        </span>
      )}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EditProductModal({
  product,
  categories,
  suppliers,
  onClose,
  onSuccess,
}: EditProductModalProps) {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fields
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [category_id, setCategoryId] = useState('')
  const [supplier_id, setSupplierId] = useState('')
  const [product_type, setProductType] = useState<'product' | 'service'>('product')
  const [unit_type, setUnitType] = useState<UnitType>('unit')
  const [unit_label, setUnitLabel] = useState('unidad')
  const [is_perishable, setIsPerishable] = useState(false)
  const [shelf_life_days, setShelfLifeDays] = useState('')
  const [expiry_date, setExpiryDate] = useState('')
  const [sale_price, setSalePrice] = useState('')
  const [unit_cost, setUnitCost] = useState('')
  const [supplier_price, setSupplierPrice] = useState('')
  const [min_stock_alert, setMinStockAlert] = useState('0')
  const [lead_time_days, setLeadTimeDays] = useState('1')
  const [is_active, setIsActive] = useState(true)

  const isService = product_type === 'service'

  // Populate from product prop
  useEffect(() => {
    if (!product) return
    setName(product.name)
    setSku(product.sku ?? '')
    setCategoryId(product.category_id ?? '')
    setSupplierId(product.supplier_id ?? '')
    setProductType((product.product_type as 'product' | 'service') ?? 'product')
    setUnitType((product.unit_type as UnitType) ?? 'unit')
    setUnitLabel(product.unit_label ?? 'unidad')
    setIsPerishable(product.is_perishable ?? false)
    setShelfLifeDays(product.shelf_life_days?.toString() ?? '')
    setExpiryDate(product.expiry_date ?? '')
    setSalePrice(product.sale_price?.toString() ?? '')
    setUnitCost(product.unit_cost?.toString() ?? '')
    setSupplierPrice(product.supplier_price?.toString() ?? '')
    setMinStockAlert(product.min_stock_alert?.toString() ?? '0')
    setLeadTimeDays(product.lead_time_days?.toString() ?? '1')
    setIsActive(product.is_active)
  }, [product])

  // Keep unit_label in sync with unit_type only if changed by user (not on init)
  const [unitTypeUserChanged, setUnitTypeUserChanged] = useState(false)
  useEffect(() => {
    if (!unitTypeUserChanged) return
    const opts = UNIT_LABELS[unit_type]
    if (opts.length > 0) setUnitLabel(opts[0].value)
  }, [unit_type, unitTypeUserChanged])

  // Esc to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!product) return null

  const parsedSalePrice = parseFloat(sale_price) || 0
  const parsedUnitCost  = parseFloat(unit_cost) || 0
  const marginPct =
    parsedSalePrice > 0 && parsedUnitCost > 0
      ? (((parsedSalePrice - parsedUnitCost) / parsedSalePrice) * 100).toFixed(1) + '%'
      : '—'

  const unitLabelOptions = UNIT_LABELS[unit_type] ?? []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setSuccess(false)
    if (!name.trim()) { setError('El nombre es obligatorio.'); return }
    if (parsedSalePrice <= 0) { setError('El precio de venta debe ser mayor a 0.'); return }

    setLoading(true)
    try {
      const res = await fetch(`/api/products/${product!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          sku: sku.trim() || null,
          category_id: category_id || null,
          supplier_id: supplier_id || null,
          product_type,
          unit_type: isService ? null : unit_type,
          unit_label: isService ? null : unit_label,
          is_perishable: isService ? false : is_perishable,
          shelf_life_days: !isService && is_perishable && shelf_life_days
            ? parseInt(shelf_life_days, 10)
            : null,
          expiry_date: !isService && is_perishable && expiry_date ? expiry_date : null,
          sale_price: parsedSalePrice,
          unit_cost: parsedUnitCost || null,
          supplier_price: parseFloat(supplier_price) || null,
          min_stock_alert: isService ? 0 : (parseFloat(min_stock_alert) || 0),
          lead_time_days: isService ? null : (parseInt(lead_time_days, 10) || 1),
          is_active,
        }),
      })

      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Error al guardar.'); setLoading(false); return }

      setSuccess(true); setLoading(false)
      router.refresh()
      setTimeout(() => { onSuccess() }, 900)
    } catch {
      setError('Error de red.')
      setLoading(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Editar producto"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)',
        overflowY: 'auto',
        padding: '16px 0',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 24,
          width: '100%',
          maxWidth: 580,
          boxShadow: '0 20px 40px rgba(0,0,0,0.14)',
          margin: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 className="font-syne font-bold" style={{ fontSize: 16, color: 'var(--text)', margin: 0 }}>
              Editar producto
            </h3>
            <p style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 0' }}>
              {product.name}
            </p>
          </div>
          <button type="button" onClick={onClose}
            style={{ color: 'var(--muted)', fontSize: 18, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}>
            ×
          </button>
        </div>

        {/* Stock note */}
        <div style={{ background: 'rgba(245,200,66,0.07)', border: '1px solid rgba(245,200,66,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 11, color: 'var(--gold)' }}>
          Stock actual: <strong>{product.current_stock?.toLocaleString() ?? 0} {product.unit_label ?? 'uds.'}</strong> — el stock solo se modifica mediante movimientos de inventario.
        </div>

        {success && (
          <div style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>
            ✓ Producto actualizado correctamente
          </div>
        )}
        {error && (
          <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: 'var(--red)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>

          {/* ── Tipo ── */}
          <div style={sectionStyle}>
            <p style={sectionTitle}>Tipo de producto</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['product', 'service'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setProductType(t)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 500,
                    border: product_type === t ? '1px solid var(--gold-bdr)' : '1px solid var(--border)',
                    background: product_type === t ? 'var(--gold-bg)' : 'var(--hover)',
                    color: product_type === t ? 'var(--gold)' : 'var(--text2)',
                    cursor: 'pointer',
                  }}>
                  {t === 'product' ? '📦 Producto físico' : '⚙ Servicio'}
                </button>
              ))}
            </div>
          </div>

          {/* ── Identificación ── */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Nombre *</label>
            <input type="text" required value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del producto o servicio"
              style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
          </div>

          <div>
            <label style={labelStyle}>SKU</label>
            <input type="text" value={sku} onChange={(e) => setSku(e.target.value)}
              placeholder="SKU-001" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
          </div>

          {categories.length > 0 && (
            <div>
              <label style={labelStyle}>Categoría</label>
              <select value={category_id} onChange={(e) => setCategoryId(e.target.value)}
                style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {suppliers.length > 0 && (
            <div>
              <label style={labelStyle}>Proveedor</label>
              <select value={supplier_id} onChange={(e) => setSupplierId(e.target.value)}
                style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                <option value="">Sin proveedor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* ── Precios ── */}
          <div>
            <label style={labelStyle}>Precio de venta $ *</label>
            <input type="number" step="0.01" min="0" required
              value={sale_price} onChange={(e) => setSalePrice(e.target.value)}
              placeholder="0.00" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
          </div>

          <div>
            <label style={labelStyle}>Costo unitario $</label>
            <input type="number" step="0.01" min="0"
              value={unit_cost} onChange={(e) => setUnitCost(e.target.value)}
              placeholder="0.00" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
          </div>

          <div>
            <label style={labelStyle}>Precio proveedor $</label>
            <input type="number" step="0.01" min="0"
              value={supplier_price} onChange={(e) => setSupplierPrice(e.target.value)}
              placeholder="0.00" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
          </div>

          {/* margin info */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-syne)' }}>
              Margen: {marginPct}
            </span>
          </div>

          {/* ── Unidad de medida ── */}
          {!isService && (
            <div style={sectionStyle}>
              <p style={sectionTitle}>Unidad de medida</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Tipo de unidad</label>
                  <select value={unit_type}
                    onChange={(e) => {
                      setUnitTypeUserChanged(true)
                      setUnitType(e.target.value as UnitType)
                    }}
                    style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                    {UNIT_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Unidad específica</label>
                  {unitLabelOptions.length > 1 ? (
                    <select value={unit_label} onChange={(e) => setUnitLabel(e.target.value)}
                      style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                      {unitLabelOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" value={unit_label} readOnly
                      style={{ ...inputStyle, background: 'var(--hover)', color: 'var(--muted)' }} />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Stock alerts ── */}
          {!isService && (
            <>
              <div>
                <label style={labelStyle}>Alerta mínima ({unit_label})</label>
                <SuffixInput value={min_stock_alert} onChange={setMinStockAlert}
                  suffix={unit_label} step="0.01" />
              </div>

              <div>
                <label style={labelStyle}>Días de reposición</label>
                <SuffixInput value={lead_time_days} onChange={setLeadTimeDays}
                  suffix="días" step="1" min="1" />
              </div>
            </>
          )}

          {/* ── Caducidad ── */}
          {!isService && (
            <div style={sectionStyle}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={is_perishable}
                  onChange={(e) => setIsPerishable(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--orange)', cursor: 'pointer' }} />
                <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>¿Es perecedero?</span>
              </label>

              {is_perishable && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                  <div>
                    <label style={labelStyle}>Vida útil (días)</label>
                    <SuffixInput value={shelf_life_days} onChange={setShelfLifeDays}
                      suffix="días" step="1" min="1" />
                  </div>
                  <div>
                    <label style={labelStyle}>Caducidad del lote</label>
                    <input type="date" value={expiry_date}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Estado ── */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={is_active}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--gold)', cursor: 'pointer' }} />
              <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>Producto activo</span>
            </label>
          </div>

          {/* ── Buttons ── */}
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} disabled={loading}
              style={{ flex: 1, padding: '10px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500, background: 'var(--hover)', color: 'var(--text2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="font-syne font-bold"
              style={{ flex: 2, padding: '10px 16px', borderRadius: 8, fontSize: 14, background: loading ? 'rgba(232,165,0,0.5)' : 'linear-gradient(135deg, #F5C842, #F09A1A)', color: '#1A1B2E', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
