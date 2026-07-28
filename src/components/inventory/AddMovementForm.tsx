'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toLocalISO } from '@/lib/dateUtils'

// ── Types ──────────────────────────────────────────────────────────────────

interface Product {
  id: string
  name: string
  current_stock: number
  unit_label?: string | null
  unit_cost?: number | null
  supplier_price?: number | null
  product_type?: string | null
}

interface AddMovementFormProps {
  product: Product
}

// ── Options ────────────────────────────────────────────────────────────────

const typeOptions = [
  { value: 'in',         label: '📥 Entrada'  },
  { value: 'out',        label: '📤 Salida'   },
  { value: 'adjustment', label: '⚖ Ajuste'   },
] as const

const reasonOptions: Record<string, { value: string; label: string }[]> = {
  in:         [
    { value: 'purchase',   label: 'Compra'      },
    { value: 'return',     label: 'Devolución'  },
    { value: 'adjustment', label: 'Ajuste'      },
  ],
  out:        [
    { value: 'sale',       label: 'Venta'            },
    { value: 'damage',     label: 'Daño / Merma'     },
    { value: 'transfer',   label: 'Transferencia'    },
    { value: 'adjustment', label: 'Ajuste'           },
  ],
  adjustment: [{ value: 'adjustment', label: 'Ajuste de inventario' }],
}

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

function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = 'var(--gold)'
  e.target.style.boxShadow   = '0 0 0 3px var(--gold-bg)'
}
function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = 'var(--border2)'
  e.target.style.boxShadow   = 'none'
}

// ── Suffix input ──────────────────────────────────────────────────────────

function SuffixInput({
  id,
  value,
  onChange,
  suffix,
  step = '0.01',
  min = '0',
  placeholder = '',
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  suffix: string
  step?: string
  min?: string
  placeholder?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border2)', borderRadius: 8, background: 'var(--surface)', overflow: 'hidden' }}>
      <input
        id={id}
        type="number"
        step={step}
        min={min}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{ flex: 1, padding: '8px 10px', fontSize: 14, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontFamily: 'var(--font-jakarta)' }}
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
        <span style={{ padding: '8px 10px', fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-jakarta)', borderLeft: '1px solid var(--border2)', background: 'var(--bg)', whiteSpace: 'nowrap', userSelect: 'none' }}>
          {suffix}
        </span>
      )}
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────

export default function AddMovementForm({ product }: AddMovementFormProps) {
  const router = useRouter()

  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [type, setType]         = useState<'in' | 'out' | 'adjustment'>('in')
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason]     = useState('purchase')
  const [notes, setNotes]       = useState('')

  // Purchase-specific fields
  const [batchNumber,    setBatchNumber]    = useState('')
  const [newUnitCost,    setNewUnitCost]    = useState(product.unit_cost?.toString() ?? '')
  const [newSupplierPrice, setNewSupplierPrice] = useState(product.supplier_price?.toString() ?? '')
  const [updateCost,     setUpdateCost]     = useState(false)

  const unitLbl = product.unit_label ?? 'unidades'
  const productNameShort =
    product.name.length > 28 ? product.name.slice(0, 28) + '…' : product.name

  const isPurchase   = type === 'in' && reason === 'purchase'
  const isAdjustment = type === 'adjustment'

  // Auto-set updateCost when cost changes
  const currentCost  = product.unit_cost ?? 0
  const parsedNewCost = parseFloat(newUnitCost) || 0

  function resetForm() {
    setType('in'); setQuantity('1'); setReason('purchase')
    setNotes(''); setError(null); setSuccess(false)
    setBatchNumber('')
    setNewUnitCost(product.unit_cost?.toString() ?? '')
    setNewSupplierPrice(product.supplier_price?.toString() ?? '')
    setUpdateCost(false)
  }

  function handleClose() {
    if (loading) return
    setOpen(false)
    resetForm()
  }

  function handleTypeChange(newType: 'in' | 'out' | 'adjustment') {
    setType(newType)
    setReason(reasonOptions[newType][0]?.value ?? 'adjustment')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setSuccess(false)

    const qty = parseFloat(quantity) || 0
    if (qty <= 0) { setError('La cantidad debe ser mayor a 0.'); return }

    if (isAdjustment && !notes.trim()) {
      setError('Las notas son obligatorias para ajustes. Explica el motivo.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Sesión expirada.'); setLoading(false); return }

    const { data: userRow } = await supabase
      .from('users').select('company_id').eq('id', user.id).single()

    const company_id = userRow?.company_id
    if (!company_id) { setError('Sin empresa asignada.'); setLoading(false); return }

    // Insert movement
    const { error: insertError } = await supabase
      .from('inventory_movements')
      .insert({
        company_id,
        product_id: product.id,
        type,
        quantity: qty,
        reason,
        movement_date: toLocalISO(new Date()),
        notes: notes.trim() || null,
        batch_number: batchNumber.trim() || null,
      })

    if (insertError) { setError(insertError.message); setLoading(false); return }

    // Update product cost if requested
    if (isPurchase && updateCost && parsedNewCost > 0) {
      const patchBody: Record<string, unknown> = { unit_cost: parsedNewCost }
      const parsedSupplierPrice = parseFloat(newSupplierPrice)
      if (!isNaN(parsedSupplierPrice) && parsedSupplierPrice > 0) {
        patchBody.supplier_price = parsedSupplierPrice
      }
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody),
      })
      if (!res.ok) {
        const j = await res.json()
        setError(`Movimiento registrado, pero hubo un error al actualizar el costo: ${j.error ?? ''}`)
        setLoading(false)
        router.refresh()
        return
      }
    }

    setSuccess(true); setLoading(false); resetForm()
    router.refresh()
    setTimeout(() => { setOpen(false); setSuccess(false) }, 1200)
  }

  const reasons = reasonOptions[type] ?? reasonOptions.in

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (product.product_type === 'service') return
          setOpen(true)
        }}
        disabled={product.product_type === 'service'}
        style={{
          fontSize: 11,
          padding: '3px 10px',
          borderRadius: 6,
          border: product.product_type === 'service' ? '1px solid var(--border)' : '1px solid var(--gold-bdr)',
          background: product.product_type === 'service' ? 'var(--hover)' : 'var(--gold-bg)',
          color: product.product_type === 'service' ? 'var(--muted)' : 'var(--gold)',
          cursor: product.product_type === 'service' ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
          opacity: product.product_type === 'service' ? 0.5 : 1,
        }}
      >
        📦 Movimiento
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Movimiento de stock"
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
              padding: '14px 16px',
              width: '100%',
              maxWidth: 420,
              boxShadow: '0 20px 40px rgba(0,0,0,0.14)',
              margin: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 className="font-syne font-bold" style={{ fontSize: 14, color: 'var(--text)' }}>
                Movimiento · {productNameShort}
              </h3>
              <button type="button" onClick={handleClose}
                style={{ color: 'var(--muted)', fontSize: 18, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}>
                ×
              </button>
            </div>

            {/* Stock actual */}
            <div style={{ background: 'var(--gold-bg)', border: '1px solid var(--gold-bdr)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12 }}>
              Stock actual:{' '}
              <strong style={{ fontFamily: 'var(--font-syne)', color: 'var(--gold)' }}>
                {product.current_stock.toLocaleString('es-EC', { maximumFractionDigits: 3 })} {unitLbl}
              </strong>
            </div>

            {success && (
              <div style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>
                ✓ Movimiento registrado
              </div>
            )}
            {error && (
              <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: 'var(--red)' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Tipo */}
              <div>
                <label style={labelStyle}>Tipo</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {typeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleTypeChange(opt.value)}
                      style={{
                        flex: 1,
                        padding: '7px 8px',
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 500,
                        border: type === opt.value ? '1px solid var(--gold-bdr)' : '1px solid var(--border)',
                        background: type === opt.value ? 'var(--gold-bg)' : 'var(--hover)',
                        color: type === opt.value ? 'var(--gold)' : 'var(--text2)',
                        cursor: 'pointer',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cantidad con sufijo */}
              <div>
                <label htmlFor="am-quantity" style={labelStyle}>
                  Cantidad ({unitLbl})
                </label>
                <SuffixInput
                  id="am-quantity"
                  value={quantity}
                  onChange={setQuantity}
                  suffix={unitLbl}
                  step="0.01"
                  min="0.01"
                />
              </div>

              {/* Razón */}
              <div>
                <label htmlFor="am-reason" style={labelStyle}>Razón</label>
                <select id="am-reason" value={reason} onChange={(e) => setReason(e.target.value)}
                  style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                  {reasons.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              {/* ── Campos adicionales para compras ── */}
              {isPurchase && (
                <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, color: 'var(--muted)', margin: 0 }}>
                    Detalles de la compra
                  </p>

                  <div>
                    <label style={labelStyle}>Número de lote (opcional)</label>
                    <input type="text" value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      placeholder="Ej: LOTE-2026-001"
                      style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>

                  <div>
                    <label style={labelStyle}>Costo unitario de compra $</label>
                    <SuffixInput
                      value={newUnitCost}
                      onChange={(v) => {
                        setNewUnitCost(v)
                        const newVal = parseFloat(v) || 0
                        setUpdateCost(newVal !== currentCost && newVal > 0)
                      }}
                      suffix="$"
                      step="0.01"
                      placeholder="0.00"
                    />
                    {currentCost > 0 && (
                      <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
                        Costo actual: ${currentCost.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>

                  <div>
                    <label style={labelStyle}>Precio acordado proveedor $</label>
                    <SuffixInput
                      value={newSupplierPrice}
                      onChange={setNewSupplierPrice}
                      suffix="$"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>

                  {parsedNewCost > 0 && parsedNewCost !== currentCost && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={updateCost}
                        onChange={(e) => setUpdateCost(e.target.checked)}
                        style={{ width: 14, height: 14, accentColor: 'var(--gold)', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                        Actualizar costo del producto a ${parsedNewCost.toFixed(2)}
                      </span>
                    </label>
                  )}
                </div>
              )}

              {/* ── Número de lote para ajustes ── */}
              {isAdjustment && (
                <div>
                  <label style={labelStyle}>Número de lote (opcional)</label>
                  <input type="text" value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="Ej: LOTE-2026-001"
                    style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>
              )}

              {/* Notas */}
              <div>
                <label htmlFor="am-notes" style={labelStyle}>
                  {isAdjustment ? 'Motivo del ajuste *' : 'Notas (opcional)'}
                </label>
                <textarea
                  id="am-notes"
                  rows={2}
                  required={isAdjustment}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isAdjustment ? 'Describe el motivo del ajuste…' : 'Observaciones…'}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="button" onClick={handleClose}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: 'var(--hover)', color: 'var(--text2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="font-syne font-bold"
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13, background: loading ? 'rgba(232,165,0,0.5)' : 'linear-gradient(135deg, #F5C842, #F09A1A)', color: '#1A1B2E', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading ? 'Guardando…' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
