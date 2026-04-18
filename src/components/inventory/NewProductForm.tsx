'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toLocalISO } from '@/lib/dateUtils'

// ── Types ──────────────────────────────────────────────────────────────────

interface Category {
  id: string
  name: string
  parent_id?: string | null
}

interface NewProductFormProps {
  categories?: Category[]
}

type UnitType = 'unit' | 'weight' | 'volume' | 'length' | 'area'

// ── Unit label options per type ────────────────────────────────────────────

const UNIT_LABELS: Record<UnitType, { value: string; label: string }[]> = {
  unit:   [{ value: 'unidad', label: 'Unidad' }],
  weight: [
    { value: 'gramo',      label: 'Gramo (g)' },
    { value: 'kilogramo',  label: 'Kilogramo (kg)' },
    { value: 'libra',      label: 'Libra (lb)' },
    { value: 'tonelada',   label: 'Tonelada (t)' },
  ],
  volume: [
    { value: 'ml',    label: 'Mililitro (ml)' },
    { value: 'litro', label: 'Litro (L)' },
    { value: 'galón', label: 'Galón' },
    { value: 'cc',    label: 'Centímetro cúbico (cc)' },
  ],
  length: [
    { value: 'cm',   label: 'Centímetro (cm)' },
    { value: 'metro',label: 'Metro (m)' },
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

// ── Shared styles ──────────────────────────────────────────────────────────

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

// ── Suffix input wrapper ───────────────────────────────────────────────────

function SuffixInput({
  id,
  value,
  onChange,
  suffix,
  step = '1',
  min = '0',
  required,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  suffix: string
  step?: string
  min?: string
  required?: boolean
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
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      <input
        id={id}
        type="number"
        step={step}
        min={min}
        required={required}
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
          const parent = e.currentTarget.parentElement as HTMLElement
          parent.style.borderColor = 'var(--gold)'
          parent.style.boxShadow = '0 0 0 3px var(--gold-bg)'
        }}
        onBlur={(e) => {
          const parent = e.currentTarget.parentElement as HTMLElement
          parent.style.borderColor = 'var(--border2)'
          parent.style.boxShadow = 'none'
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

// ── Component ──────────────────────────────────────────────────────────────

export default function NewProductForm({ categories = [] }: NewProductFormProps) {
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Identity
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [category_id, setCategoryId] = useState('')

  // Type
  const [product_type, setProductType] = useState<'product' | 'service'>('product')
  const isService = product_type === 'service'

  // Unit
  const [unit_type, setUnitType] = useState<UnitType>('unit')
  const [unit_label, setUnitLabel] = useState('unidad')

  // Perishable
  const [is_perishable, setIsPerishable] = useState(false)
  const [shelf_life_days, setShelfLifeDays] = useState('')
  const [expiry_date, setExpiryDate] = useState('')

  // Pricing
  const [sale_price, setSalePrice] = useState('')
  const [unit_cost, setUnitCost] = useState('')

  // Stock (only for product)
  const [current_stock, setCurrentStock] = useState('0')
  const [min_stock_alert, setMinStockAlert] = useState('0')
  const [lead_time_days, setLeadTimeDays] = useState('1')

  // When unit_type changes, reset unit_label to first option
  useEffect(() => {
    const opts = UNIT_LABELS[unit_type]
    if (opts.length > 0) setUnitLabel(opts[0].value)
  }, [unit_type])

  const parsedSalePrice = parseFloat(sale_price) || 0
  const parsedUnitCost  = parseFloat(unit_cost) || 0
  const parsedStock     = parseFloat(current_stock) || 0

  const marginPct =
    parsedSalePrice > 0 && parsedUnitCost > 0
      ? (((parsedSalePrice - parsedUnitCost) / parsedSalePrice) * 100).toFixed(1) + '%'
      : '—'

  const capitalToEnter = isService
    ? '—'
    : (parsedStock * parsedUnitCost).toFixed(2)

  function resetForm() {
    setName(''); setSku(''); setCategoryId('')
    setProductType('product')
    setUnitType('unit'); setUnitLabel('unidad')
    setIsPerishable(false); setShelfLifeDays(''); setExpiryDate('')
    setSalePrice(''); setUnitCost('')
    setCurrentStock('0'); setMinStockAlert('0'); setLeadTimeDays('1')
    setError(null); setSuccess(false)
  }

  function handleClose() {
    if (loading) return
    setOpen(false)
    resetForm()
  }

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loading])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setSuccess(false)

    if (!name.trim()) { setError('El nombre del producto es obligatorio.'); return }
    if (parsedSalePrice <= 0) { setError('El precio de venta debe ser mayor a 0.'); return }

    setLoading(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Sesión expirada.'); setLoading(false); return }

    const { data: userRow } = await supabase
      .from('users').select('company_id').eq('id', user.id).single()

    const company_id = userRow?.company_id
    if (!company_id) { setError('Sin empresa asignada.'); setLoading(false); return }

    const today = toLocalISO(new Date())
    const stockVal = isService ? 0 : (parseFloat(current_stock) || 0)

    const { data: inserted, error: insertError } = await supabase
      .from('products')
      .insert({
        company_id,
        name: name.trim(),
        sku: sku.trim() || null,
        category_id: category_id || null,
        product_type,
        unit_type: isService ? null : unit_type,
        unit_label: isService ? null : unit_label,
        is_perishable: isService ? false : is_perishable,
        shelf_life_days: (!isService && is_perishable && shelf_life_days)
          ? parseInt(shelf_life_days, 10)
          : null,
        expiry_date: (!isService && is_perishable && expiry_date) ? expiry_date : null,
        sale_price: parsedSalePrice,
        unit_cost: parsedUnitCost,
        current_stock: stockVal,
        min_stock_alert: isService ? 0 : (parseFloat(min_stock_alert) || 0),
        lead_time_days: isService ? null : (parseInt(lead_time_days, 10) || 1),
        is_active: true,
      })
      .select('id')
      .single()

    if (insertError) { setError(insertError.message); setLoading(false); return }

    // Initial stock movement only for physical products
    if (inserted && !isService && stockVal > 0) {
      const { error: movErr } = await supabase
        .from('inventory_movements')
        .insert({
          company_id,
          product_id: inserted.id,
          type: 'in',
          quantity: stockVal,
          reason: 'initial',
          movement_date: today,
          notes: 'Stock inicial al crear producto',
        })
      if (movErr) { setError(movErr.message); setLoading(false); return }
    }

    setSuccess(true); setLoading(false); resetForm()
    router.refresh()
    setTimeout(() => { setOpen(false); setSuccess(false) }, 1200)
  }

  const unitLabelOptions = UNIT_LABELS[unit_type] ?? []

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-syne font-bold text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #F5C842, #F09A1A)', color: '#1A1B2E' }}
      >
        + Nuevo producto
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Nuevo producto"
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
          onClick={handleClose}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 24,
              width: '100%',
              maxWidth: 560,
              boxShadow: '0 20px 40px rgba(0,0,0,0.14)',
              margin: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 className="font-syne font-bold" style={{ fontSize: 16, color: 'var(--text)' }}>
                Nuevo producto
              </h3>
              <button type="button" onClick={handleClose}
                style={{ color: 'var(--muted)', fontSize: 18, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}>
                ×
              </button>
            </div>

            {success && (
              <div style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>
                ✓ Producto registrado correctamente
              </div>
            )}
            {error && (
              <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: 'var(--red)' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>

              {/* ── Tipo de producto ── */}
              <div style={sectionStyle}>
                <p style={sectionTitle}>Tipo de producto</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['product', 'service'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setProductType(t)}
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
                      }}
                    >
                      {t === 'product' ? '📦 Producto físico' : '⚙ Servicio'}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Identificación ── */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="np-name" style={labelStyle}>Nombre *</label>
                <input id="np-name" type="text" required value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre del producto o servicio"
                  style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>

              <div>
                <label htmlFor="np-sku" style={labelStyle}>SKU</label>
                <input id="np-sku" type="text" value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="SKU-001" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>

              {categories.length > 0 && (
                <div>
                  <label htmlFor="np-category" style={labelStyle}>Categoría</label>
                  <select id="np-category" value={category_id}
                    onChange={(e) => setCategoryId(e.target.value)}
                    style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                    <option value="">Sin categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* ── Precios ── */}
              <div>
                <label htmlFor="np-sale_price" style={labelStyle}>Precio de venta $ *</label>
                <input id="np-sale_price" type="number" step="0.01" min="0" required
                  value={sale_price} onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="0.00" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>

              <div>
                <label htmlFor="np-unit_cost" style={labelStyle}>Costo unitario $</label>
                <input id="np-unit_cost" type="number" step="0.01" min="0"
                  value={unit_cost} onChange={(e) => setUnitCost(e.target.value)}
                  placeholder="0.00" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>

              {/* ── Unidad de medida (solo productos) ── */}
              {!isService && (
                <div style={sectionStyle}>
                  <p style={sectionTitle}>Unidad de medida</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={labelStyle}>Tipo de unidad</label>
                      <select value={unit_type}
                        onChange={(e) => setUnitType(e.target.value as UnitType)}
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
                        <input type="text" value={unit_label} readOnly style={{ ...inputStyle, background: 'var(--hover)', color: 'var(--muted)' }} />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Inventario (solo productos) ── */}
              {!isService && (
                <>
                  <div>
                    <label htmlFor="np-current_stock" style={labelStyle}>
                      Stock inicial ({unit_label})
                    </label>
                    <SuffixInput
                      id="np-current_stock"
                      value={current_stock}
                      onChange={setCurrentStock}
                      suffix={unit_label}
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label htmlFor="np-min_stock_alert" style={labelStyle}>
                      Alerta mínima ({unit_label})
                    </label>
                    <SuffixInput
                      id="np-min_stock_alert"
                      value={min_stock_alert}
                      onChange={setMinStockAlert}
                      suffix={unit_label}
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label htmlFor="np-lead_time_days" style={labelStyle}>
                      Días de reposición
                    </label>
                    <SuffixInput
                      id="np-lead_time_days"
                      value={lead_time_days}
                      onChange={setLeadTimeDays}
                      suffix="días"
                      step="1"
                      min="1"
                    />
                  </div>
                </>
              )}

              {/* ── Caducidad (solo productos) ── */}
              {!isService && (
                <div style={sectionStyle}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={is_perishable}
                      onChange={(e) => setIsPerishable(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: 'var(--orange)', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                      ¿Es perecedero?
                    </span>
                  </label>

                  {is_perishable && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                      <div>
                        <label style={labelStyle}>Vida útil (días)</label>
                        <SuffixInput
                          value={shelf_life_days}
                          onChange={setShelfLifeDays}
                          suffix="días"
                          step="1"
                          min="1"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Caducidad del lote</label>
                        <input
                          type="date"
                          value={expiry_date}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          style={inputStyle}
                          onFocus={onFocus}
                          onBlur={onBlur}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Margen info ── */}
              <div style={{ gridColumn: '1 / -1', fontFamily: 'var(--font-syne)', fontSize: 11, color: 'var(--gold)', marginTop: 2 }}>
                Margen: {marginPct}
                {!isService && ` · Capital a ingresar: $${capitalToEnter}`}
              </div>

              {/* ── Buttons ── */}
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="button" onClick={handleClose}
                  style={{ flex: 1, padding: '10px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500, background: 'var(--hover)', color: 'var(--text2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="font-syne font-bold"
                  style={{ flex: 1, padding: '10px 16px', borderRadius: 8, fontSize: 14, background: loading ? 'rgba(232,165,0,0.5)' : 'linear-gradient(135deg, #F5C842, #F09A1A)', color: '#1A1B2E', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
