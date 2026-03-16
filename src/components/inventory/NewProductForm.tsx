'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ── Tipos ─────────────────────────────────────────────────────
interface Category {
  id: string
  name: string
}

interface NewProductFormProps {
  categories?: Category[]
}

// ── Estilos base (igual que NewCustomerForm) ────────────────────
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

function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = 'var(--gold)'
  e.target.style.boxShadow = '0 0 0 3px var(--gold-bg)'
}
function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = 'var(--border2)'
  e.target.style.boxShadow = 'none'
}

// ── Componente ─────────────────────────────────────────────────
export default function NewProductForm({ categories = [] }: NewProductFormProps) {
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [category_id, setCategoryId] = useState('')
  const [sale_price, setSalePrice] = useState('')
  const [unit_cost, setUnitCost] = useState('')
  const [current_stock, setCurrentStock] = useState('0')
  const [min_stock_alert, setMinStockAlert] = useState('0')
  const [lead_time_days, setLeadTimeDays] = useState('1')

  const parsedSalePrice = parseFloat(sale_price) || 0
  const parsedUnitCost = parseFloat(unit_cost) || 0
  const parsedCurrentStock = parseInt(current_stock, 10) || 0

  const marginPct =
    parsedSalePrice > 0 && parsedUnitCost > 0
      ? (((parsedSalePrice - parsedUnitCost) / parsedSalePrice) * 100).toFixed(1) + '%'
      : '—'
  const capitalToEnter = (parsedCurrentStock * parsedUnitCost).toFixed(2)

  function resetForm() {
    setName('')
    setSku('')
    setCategoryId('')
    setSalePrice('')
    setUnitCost('')
    setCurrentStock('0')
    setMinStockAlert('0')
    setLeadTimeDays('1')
    setError(null)
    setSuccess(false)
  }

  function handleClose() {
    if (loading) return
    setOpen(false)
    resetForm()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!name.trim()) {
      setError('El nombre del producto es obligatorio.')
      return
    }

    const price = parseFloat(sale_price) || 0
    if (price <= 0) {
      setError('El precio de venta debe ser mayor a 0.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError('Sesión expirada. Vuelve a iniciar sesión.')
      setLoading(false)
      return
    }

    const { data: userRow } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    const company_id = userRow?.company_id
    if (!company_id) {
      setError('No tienes una empresa asignada. Contacta a tu administrador.')
      setLoading(false)
      return
    }

    const today = new Date().toISOString().slice(0, 10)
    const stockVal = parseInt(current_stock, 10) || 0

    const { data: insertedProduct, error: insertError } = await supabase
      .from('products')
      .insert({
        company_id,
        name: name.trim(),
        sku: sku.trim() || null,
        category_id: category_id || null,
        sale_price: price,
        unit_cost: parseFloat(unit_cost) || 0,
        current_stock: stockVal,
        min_stock_alert: parseInt(min_stock_alert, 10) || 0,
        lead_time_days: parseInt(lead_time_days, 10) || 1,
        is_active: true,
      })
      .select('id')
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    if (insertedProduct && stockVal > 0) {
      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert({
          company_id,
          product_id: insertedProduct.id,
          type: 'in',
          quantity: stockVal,
          reason: 'initial',
          movement_date: today,
          notes: 'Stock inicial al crear producto',
        })

      if (movementError) {
        setError(movementError.message)
        setLoading(false)
        return
      }
    }

    setSuccess(true)
    setLoading(false)
    resetForm()
    router.refresh()

    setTimeout(() => {
      setOpen(false)
      setSuccess(false)
    }, 1200)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-syne font-bold text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
        style={{
          background: 'linear-gradient(135deg, #F5C842, #F09A1A)',
          color: '#1A1B2E',
        }}
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
              maxWidth: 520,
              boxShadow: '0 20px 40px rgba(0,0,0,0.14)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <h3
                className="font-syne font-bold"
                style={{ fontSize: 16, color: 'var(--text)' }}
              >
                Nuevo producto
              </h3>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  color: 'var(--muted)',
                  fontSize: 18,
                  lineHeight: 1,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>

            {success && (
              <div
                style={{
                  background: 'rgba(5,150,105,0.08)',
                  border: '1px solid rgba(5,150,105,0.2)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 16,
                  fontSize: 12,
                  color: 'var(--green)',
                  fontWeight: 500,
                }}
              >
                ✓ Producto registrado correctamente
              </div>
            )}

            {error && (
              <div
                style={{
                  background: 'rgba(220,38,38,0.06)',
                  border: '1px solid rgba(220,38,38,0.2)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  marginBottom: 16,
                  fontSize: 12,
                  color: 'var(--red)',
                }}
              >
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 14,
              }}
            >
              <div style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="np-name" style={labelStyle}>
                  Nombre del producto
                </label>
                <input
                  id="np-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre del producto"
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div>
                <label htmlFor="np-sku" style={labelStyle}>
                  SKU
                </label>
                <input
                  id="np-sku"
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="SKU-001"
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              {categories.length > 0 && (
                <div>
                  <label htmlFor="np-category" style={labelStyle}>
                    Categoría
                  </label>
                  <select
                    id="np-category"
                    value={category_id}
                    onChange={(e) => setCategoryId(e.target.value)}
                    style={inputStyle}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  >
                    <option value="">Sin categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="np-sale_price" style={labelStyle}>
                  Precio de venta $
                </label>
                <input
                  id="np-sale_price"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={sale_price}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="0.00"
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div>
                <label htmlFor="np-unit_cost" style={labelStyle}>
                  Costo unitario $
                </label>
                <input
                  id="np-unit_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={unit_cost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder="0.00"
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div>
                <label htmlFor="np-current_stock" style={labelStyle}>
                  Stock inicial
                </label>
                <input
                  id="np-current_stock"
                  type="number"
                  min="0"
                  value={current_stock}
                  onChange={(e) => setCurrentStock(e.target.value)}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div>
                <label htmlFor="np-min_stock_alert" style={labelStyle}>
                  Alerta stock mínimo
                </label>
                <input
                  id="np-min_stock_alert"
                  type="number"
                  min="0"
                  value={min_stock_alert}
                  onChange={(e) => setMinStockAlert(e.target.value)}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div>
                <label htmlFor="np-lead_time_days" style={labelStyle}>
                  Días para reponer
                </label>
                <input
                  id="np-lead_time_days"
                  type="number"
                  min="1"
                  value={lead_time_days}
                  onChange={(e) => setLeadTimeDays(e.target.value)}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div
                style={{
                  gridColumn: '1 / -1',
                  fontFamily: 'var(--font-syne)',
                  fontSize: 11,
                  color: 'var(--gold)',
                  marginTop: 4,
                }}
              >
                Margen: {marginPct} · Capital a ingresar: $ {capitalToEnter}
              </div>

              <div
                style={{
                  gridColumn: '1 / -1',
                  display: 'flex',
                  gap: 8,
                  marginTop: 8,
                }}
              >
                <button
                  type="button"
                  onClick={handleClose}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    background: 'var(--hover)',
                    color: 'var(--text2)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="font-syne font-bold"
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 8,
                    fontSize: 14,
                    background: loading
                      ? 'rgba(232,165,0,0.5)'
                      : 'linear-gradient(135deg, #F5C842, #F09A1A)',
                    color: '#1A1B2E',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
