'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Types ───────────────────────────────────────────────────

export interface SaleItemRaw {
  product_id: string
  quantity: number
  unit_price: number
  unit_cost: number
  discount_amount: number
  subtotal: number
  products: {
    name: string
    sku: string | null
    current_stock: number
  } | null
}

export interface SaleWithItems {
  id: string
  sale_date: string
  customer_id: string | null
  branch_id: string | null
  channel_id: string | null
  status: string | null
  gross_total: number
  discount_amount: number | null
  production_cost: number | null
  lines_per_order: number | null
  items: SaleItemRaw[]
}

interface Product {
  id: string
  name: string
  sku: string | null
  current_stock: number
  unit_cost: number
  sale_price: number
}

interface EditSaleLine {
  product: Product
  quantity: number
  unit_price: number
  unit_cost: number
  discount_amount: number
  /** Stock quantity already reserved by this sale — added back when computing available stock */
  originalQuantity: number
}

export interface EditSaleModalProps {
  sale: SaleWithItems | null
  customers: { id: string; full_name: string | null }[]
  branches: { id: string; name: string }[]
  channels: { id: string; name: string }[]
  companyId: string
  userRole: string
  onClose: () => void
  onSuccess: () => void
}

// ── Constants ───────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'closed', label: 'Cerrada' },
  { value: 'review', label: 'Revisión' },
  { value: 'contact', label: 'Contacto' },
] as const

// ── Styles ──────────────────────────────────────────────────

const inputBase: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border2)',
  color: 'var(--text)',
  fontFamily: 'var(--font-jakarta)',
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  fontSize: 14,
  boxSizing: 'border-box',
}

const labelSt: React.CSSProperties = {
  fontSize: 9,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 600,
  display: 'block',
  marginBottom: 4,
}

function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = 'var(--gold)'
  e.target.style.boxShadow = '0 0 0 3px var(--gold-bg)'
  e.target.style.outline = 'none'
}
function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = 'var(--border2)'
  e.target.style.boxShadow = 'none'
}

function fmt(n: number): string {
  return n.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Component ───────────────────────────────────────────────

export default function EditSaleModal({
  sale,
  customers,
  branches,
  channels,
  companyId,
  userRole,
  onClose,
  onSuccess,
}: EditSaleModalProps) {
  const canSeeMargin = userRole === 'admin' || userRole === 'manager'

  // Header fields
  const [sale_date, setSaleDate] = useState('')
  const [customer_id, setCustomerId] = useState('')
  const [branch_id, setBranchId] = useState('')
  const [channel_id, setChannelId] = useState('')
  const [status, setStatus] = useState('closed')

  // Products & lines
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [lines, setLines] = useState<EditSaleLine[]>([])

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Initialize header fields and lines from sale prop
  useEffect(() => {
    if (!sale) return
    setSaleDate(sale.sale_date)
    setCustomerId(sale.customer_id ?? '')
    setBranchId(sale.branch_id ?? '')
    setChannelId(sale.channel_id ?? '')
    setStatus(sale.status ?? 'closed')
    setError(null)
    setSuccess(false)

    const initialLines: EditSaleLine[] = sale.items.map(item => {
      const p = item.products
      const product: Product = {
        id: item.product_id,
        name: p?.name ?? '(producto eliminado)',
        sku: p?.sku ?? null,
        current_stock: p?.current_stock ?? 0,
        unit_cost: Number(item.unit_cost),
        sale_price: Number(item.unit_price),
      }
      return {
        product,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        unit_cost: Number(item.unit_cost),
        discount_amount: Number(item.discount_amount),
        originalQuantity: Number(item.quantity),
      }
    })
    setLines(initialLines)
  }, [sale])

  // Load active products for search dropdown
  useEffect(() => {
    if (!sale) return
    setProductsLoading(true)
    const supabase = createClient()
    supabase
      .from('products')
      .select('id, name, sku, current_stock, unit_cost, sale_price')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('name', { ascending: true })
      .then(({ data }) => {
        setProducts(
          (data ?? []).map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            current_stock: p.current_stock ?? 0,
            unit_cost: p.unit_cost ?? 0,
            sale_price: p.sale_price ?? 0,
          }))
        )
        setProductsLoading(false)
      })
  }, [sale, companyId])

  // Filtered products for search
  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q)
    )
  }, [products, productSearch])

  // Line operations
  function addLine(product: Product) {
    if (lines.some(l => l.product.id === product.id)) return
    setLines(prev => [
      ...prev,
      {
        product,
        quantity: 1,
        unit_price: product.sale_price,
        unit_cost: product.unit_cost,
        discount_amount: 0,
        originalQuantity: 0,
      },
    ])
    setProductSearch('')
    setShowDropdown(false)
  }

  function removeLine(productId: string) {
    setLines(prev => prev.filter(l => l.product.id !== productId))
  }

  function updateLine(
    productId: string,
    field: 'quantity' | 'unit_price' | 'discount_amount',
    value: number
  ) {
    setLines(prev =>
      prev.map(l => (l.product.id === productId ? { ...l, [field]: value } : l))
    )
  }

  // Totals
  const subtotalBruto = useMemo(
    () => lines.reduce((s, l) => s + l.quantity * l.unit_price, 0),
    [lines]
  )
  const totalDescuentos = useMemo(
    () => lines.reduce((s, l) => s + (l.discount_amount || 0), 0),
    [lines]
  )
  const totalVenta = subtotalBruto - totalDescuentos
  const costoTotal = useMemo(
    () => lines.reduce((s, l) => s + l.quantity * l.unit_cost, 0),
    [lines]
  )
  const margenBruto = totalVenta > 0 ? ((totalVenta - costoTotal) / totalVenta) * 100 : 0
  const hasDiscountViolation = lines.some(
    l => (l.discount_amount || 0) > l.quantity * l.unit_price
  )

  // Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (lines.length === 0) {
      setError('Agrega al menos un producto a la venta.')
      return
    }
    if (!customer_id) {
      setError('Selecciona un cliente.')
      return
    }
    if (!branch_id) {
      setError('Selecciona una sucursal.')
      return
    }
    if (!channel_id) {
      setError('Selecciona un canal de venta.')
      return
    }

    // Stock: available = current_stock + originalQuantity (returned on soft delete)
    for (const line of lines) {
      const availableStock = line.product.current_stock + line.originalQuantity
      if (line.quantity > availableStock) {
        setError(
          `"${line.product.name}" no tiene suficiente stock ` +
            `(disponible: ${availableStock}).`
        )
        return
      }
    }

    if (hasDiscountViolation) {
      setError('Revisa los descuentos — ninguno puede superar el subtotal de su línea.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/sales/${sale!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sale_date,
          customer_id,
          branch_id,
          channel_id,
          status,
          items: lines.map(l => ({
            product_id: l.product.id,
            quantity: l.quantity,
            unit_price: l.unit_price,
            unit_cost: l.unit_cost,
            discount_amount: l.discount_amount || 0,
          })),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al actualizar la venta.')
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)
      setTimeout(() => {
        onSuccess()
      }, 1200)
    } catch {
      setError('Error de conexión.')
      setLoading(false)
    }
  }

  if (!sale) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Editar venta"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '24px 24px 20px',
          width: '100%',
          maxWidth: 600,
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 24px 48px rgba(0,0,0,0.18)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <h3 className="font-syne font-bold" style={{ fontSize: 16, color: 'var(--text)' }}>
            Editar venta
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              color: 'var(--muted)',
              fontSize: 20,
              lineHeight: 1,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 2,
            }}
          >
            ×
          </button>
        </div>

        {/* Success banner */}
        {success && (
          <div
            style={{
              background: 'rgba(5,150,105,0.08)',
              border: '1px solid rgba(5,150,105,0.2)',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 14,
              fontSize: 12,
              color: 'var(--green)',
              fontWeight: 500,
            }}
          >
            ✓ Venta actualizada correctamente
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ═══════════════════════════════════════════
              SECCIÓN 1 — Datos de la venta
          ═══════════════════════════════════════════ */}
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 10,
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Datos de la venta
            </div>

            {/* Cliente + Sucursal */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label htmlFor="es-customer" style={labelSt}>
                  Cliente <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <select
                  id="es-customer"
                  required
                  value={customer_id}
                  onChange={e => setCustomerId(e.target.value)}
                  style={inputBase}
                  onFocus={onFocus}
                  onBlur={onBlur}
                >
                  <option value="">Selecciona…</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.full_name ?? '—'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="es-branch" style={labelSt}>
                  Sucursal <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <select
                  id="es-branch"
                  required
                  value={branch_id}
                  onChange={e => setBranchId(e.target.value)}
                  style={inputBase}
                  onFocus={onFocus}
                  onBlur={onBlur}
                >
                  <option value="">Selecciona…</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Canal + Fecha */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label htmlFor="es-channel" style={labelSt}>
                  Canal <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <select
                  id="es-channel"
                  required
                  value={channel_id}
                  onChange={e => setChannelId(e.target.value)}
                  style={inputBase}
                  onFocus={onFocus}
                  onBlur={onBlur}
                >
                  <option value="">Selecciona…</option>
                  {channels.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="es-date" style={labelSt}>
                  Fecha
                </label>
                <input
                  id="es-date"
                  type="date"
                  required
                  value={sale_date}
                  onChange={e => setSaleDate(e.target.value)}
                  style={inputBase}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>
            </div>

            {/* Estado */}
            <div>
              <label htmlFor="es-status" style={labelSt}>
                Estado
              </label>
              <select
                id="es-status"
                value={status}
                onChange={e => setStatus(e.target.value)}
                style={inputBase}
                onFocus={onFocus}
                onBlur={onBlur}
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ═══════════════════════════════════════════
              SECCIÓN 2 — Líneas de productos
          ═══════════════════════════════════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Productos
            </div>

            {/* Buscador */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={productSearch}
                onChange={e => {
                  setProductSearch(e.target.value)
                  setShowDropdown(true)
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 160)}
                placeholder={productsLoading ? 'Cargando productos…' : 'Buscar por nombre o SKU…'}
                disabled={productsLoading}
                style={{ ...inputBase, paddingLeft: 36 }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 13,
                  color: 'var(--muted)',
                  pointerEvents: 'none',
                }}
              >
                🔍
              </span>

              {showDropdown && !productsLoading && productSearch.trim() && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    zIndex: 200,
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    maxHeight: 220,
                    overflowY: 'auto',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
                  }}
                >
                  {filteredProducts.length === 0 ? (
                    <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--muted)' }}>
                      Sin resultados para &ldquo;{productSearch}&rdquo;
                    </div>
                  ) : (
                    filteredProducts.slice(0, 12).map(p => {
                      const added = lines.some(l => l.product.id === p.id)
                      return (
                        <div
                          key={p.id}
                          onMouseDown={() => !added && addLine(p)}
                          style={{
                            padding: '9px 14px',
                            cursor: added ? 'default' : 'pointer',
                            opacity: added ? 0.4 : 1,
                            borderBottom: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <div>
                            <div
                              style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}
                            >
                              {p.name}
                              {added && (
                                <span
                                  style={{ marginLeft: 6, fontSize: 10, color: 'var(--muted)' }}
                                >
                                  (ya agregado)
                                </span>
                              )}
                            </div>
                            <div
                              style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}
                            >
                              SKU: {p.sku ?? '—'} · Stock: {p.current_stock}
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              color: 'var(--gold)',
                              fontWeight: 600,
                              flexShrink: 0,
                            }}
                          >
                            ${fmt(p.sale_price)}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>

            {/* Líneas */}
            {lines.length === 0 ? (
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--muted)',
                  textAlign: 'center',
                  padding: '14px 0',
                  border: '1px dashed var(--border)',
                  borderRadius: 8,
                }}
              >
                Busca y selecciona productos para agregarlos a la venta
              </div>
            ) : (
              <div>
                {/* Cabecera columnas */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 70px 100px 90px 80px 24px',
                    gap: 6,
                    paddingBottom: 6,
                    borderBottom: '1px solid var(--border)',
                    marginBottom: 6,
                  }}
                >
                  {['Producto', 'Cant.', 'P. Unit.', 'Descuento', 'Subtotal', ''].map(h => (
                    <div
                      key={h}
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        color: 'var(--muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {h}
                    </div>
                  ))}
                </div>

                {/* Filas */}
                {lines.map(line => {
                  // available = current stock + what will be returned on soft-delete
                  const availableStock = line.product.current_stock + line.originalQuantity
                  const lineGross = line.quantity * line.unit_price
                  const lineSub = lineGross - (line.discount_amount || 0)
                  const overStock = line.quantity > availableStock
                  const overDiscount = (line.discount_amount || 0) > lineGross
                  return (
                    <div
                      key={line.product.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 70px 100px 90px 80px 24px',
                        gap: 6,
                        alignItems: 'center',
                        marginBottom: 8,
                        paddingBottom: 8,
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      {/* Producto */}
                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--text)',
                            fontWeight: 500,
                            lineHeight: 1.3,
                          }}
                        >
                          {line.product.name}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: overStock ? 'var(--red)' : 'var(--muted)',
                            marginTop: 2,
                          }}
                        >
                          {overStock
                            ? `⚠ Excede stock (${availableStock})`
                            : `Stock disp.: ${availableStock}`}
                        </div>
                      </div>

                      {/* Cantidad */}
                      <input
                        type="number"
                        min={1}
                        max={availableStock}
                        value={line.quantity}
                        onChange={e =>
                          updateLine(
                            line.product.id,
                            'quantity',
                            Math.max(1, parseInt(e.target.value) || 1)
                          )
                        }
                        style={{
                          ...inputBase,
                          padding: '5px 6px',
                          fontSize: 13,
                          textAlign: 'center',
                        }}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      />

                      {/* Precio unitario */}
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.unit_price}
                        onChange={e =>
                          updateLine(
                            line.product.id,
                            'unit_price',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        style={{ ...inputBase, padding: '5px 8px', fontSize: 13 }}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      />

                      {/* Descuento */}
                      <div>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.discount_amount || ''}
                          onChange={e =>
                            updateLine(
                              line.product.id,
                              'discount_amount',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          placeholder="0.00"
                          style={{
                            ...inputBase,
                            padding: '5px 8px',
                            fontSize: 13,
                            borderColor: overDiscount ? 'var(--red)' : undefined,
                            boxShadow: overDiscount
                              ? '0 0 0 2px rgba(220,38,38,0.18)'
                              : undefined,
                          }}
                          onFocus={onFocus}
                          onBlur={onBlur}
                        />
                        {overDiscount && (
                          <div
                            style={{
                              fontSize: 9,
                              color: 'var(--red)',
                              marginTop: 3,
                              lineHeight: 1.3,
                            }}
                          >
                            Máx. ${fmt(lineGross)}
                          </div>
                        )}
                      </div>

                      {/* Subtotal */}
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--gold)',
                          fontWeight: 600,
                          textAlign: 'right',
                          lineHeight: 1.3,
                        }}
                      >
                        ${fmt(lineSub)}
                      </div>

                      {/* Eliminar */}
                      <button
                        type="button"
                        onClick={() => removeLine(line.product.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--muted)',
                          fontSize: 17,
                          lineHeight: 1,
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Eliminar línea"
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════
              TOTALES
          ═══════════════════════════════════════════ */}
          {lines.length > 0 && (
            <div
              style={{
                background: 'var(--surface)',
                borderRadius: 10,
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 7,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  color: 'var(--text2)',
                }}
              >
                <span>Subtotal bruto</span>
                <span>${fmt(subtotalBruto)}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  color: 'var(--red)',
                }}
              >
                <span>(-) Descuentos</span>
                <span>-${fmt(totalDescuentos)}</span>
              </div>
              <div
                style={{
                  borderTop: '1px solid var(--border)',
                  paddingTop: 8,
                  marginTop: 2,
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  className="font-syne font-bold"
                  style={{ fontSize: 14, color: 'var(--text)' }}
                >
                  Total venta
                </span>
                <span
                  className="font-syne font-bold"
                  style={{ fontSize: 15, color: 'var(--gold)' }}
                >
                  ${fmt(totalVenta)}
                </span>
              </div>

              {canSeeMargin && (
                <div
                  style={{
                    borderTop: '1px solid var(--border)',
                    paddingTop: 8,
                    marginTop: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 5,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      color: 'var(--text2)',
                    }}
                  >
                    <span>Costo total</span>
                    <span>-${fmt(costoTotal)}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ color: 'var(--muted)' }}>Margen bruto</span>
                    <span
                      style={{
                        color:
                          margenBruto >= 30
                            ? 'var(--green)'
                            : margenBruto >= 0
                              ? 'var(--gold)'
                              : 'var(--red)',
                      }}
                    >
                      {margenBruto.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              style={{
                background: 'rgba(220,38,38,0.06)',
                border: '1px solid rgba(220,38,38,0.2)',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 12,
                color: 'var(--red)',
              }}
            >
              {error}
            </div>
          )}

          {/* Botones */}
          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: '9px 0',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                background: 'var(--hover)',
                color: 'var(--text2)',
                border: '1px solid var(--border)',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || lines.length === 0 || hasDiscountViolation}
              className="font-syne font-bold"
              style={{
                flex: 2,
                padding: '9px 0',
                borderRadius: 8,
                fontSize: 13,
                background:
                  loading || lines.length === 0 || hasDiscountViolation
                    ? 'rgba(232,165,0,0.45)'
                    : 'linear-gradient(135deg, #F5C842, #F09A1A)',
                color: '#1A1B2E',
                border: 'none',
                cursor:
                  loading || lines.length === 0 || hasDiscountViolation
                    ? 'not-allowed'
                    : 'pointer',
                opacity: loading || lines.length === 0 || hasDiscountViolation ? 0.7 : 1,
              }}
            >
              {loading
                ? 'Guardando…'
                : lines.length > 0
                  ? `Guardar cambios · $${fmt(totalVenta)}`
                  : 'Guardar cambios'}
            </button>
          </div>
          {hasDiscountViolation && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--red)',
                textAlign: 'center',
                marginTop: 2,
              }}
            >
              Corrige los descuentos marcados en rojo antes de continuar
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
