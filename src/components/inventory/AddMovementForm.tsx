'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ── Tipos ─────────────────────────────────────────────────────
interface Product {
  id: string
  name: string
  current_stock: number
}

interface AddMovementFormProps {
  product: Product
}

// ── Opciones de tipo y razón ───────────────────────────────────
const typeOptions = [
  { value: 'in', label: '📥 Entrada' },
  { value: 'out', label: '📤 Salida' },
  { value: 'adjustment', label: '⚖ Ajuste' },
] as const

const reasonOptions: Record<string, { value: string; label: string }[]> = {
  in: [
    { value: 'purchase', label: 'Compra' },
    { value: 'return', label: 'Devolución' },
    { value: 'adjustment', label: 'Ajuste' },
  ],
  out: [
    { value: 'sale', label: 'Venta' },
    { value: 'damage', label: 'Daño/Merma' },
    { value: 'transfer', label: 'Transferencia' },
    { value: 'adjustment', label: 'Ajuste' },
  ],
  adjustment: [{ value: 'adjustment', label: 'Ajuste de inventario' }],
}

// ── Estilos base ───────────────────────────────────────────────
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
  e.target.style.boxShadow = '0 0 0 3px var(--gold-bg)'
}
function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = 'var(--border2)'
  e.target.style.boxShadow = 'none'
}

// ── Componente ─────────────────────────────────────────────────
export default function AddMovementForm({ product }: AddMovementFormProps) {
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [type, setType] = useState<'in' | 'out' | 'adjustment'>('in')
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState('purchase')
  const [notes, setNotes] = useState('')

  const reasons = reasonOptions[type] ?? reasonOptions.in
  const productNameTruncated = product.name.length > 30 ? product.name.slice(0, 30) + '…' : product.name

  function resetForm() {
    setType('in')
    setQuantity('1')
    setReason('purchase')
    setNotes('')
    setError(null)
    setSuccess(false)
  }

  function handleClose() {
    if (loading) return
    setOpen(false)
    resetForm()
  }

  function handleTypeChange(newType: 'in' | 'out' | 'adjustment') {
    setType(newType)
    const opts = reasonOptions[newType]
    setReason(opts[0]?.value ?? 'adjustment')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const qty = parseInt(quantity, 10) || 0
    if (qty <= 0) {
      setError('La cantidad debe ser mayor a 0.')
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
      setError('No tienes una empresa asignada.')
      setLoading(false)
      return
    }

    const today = new Date().toISOString().slice(0, 10)

    const { error: insertError } = await supabase
      .from('inventory_movements')
      .insert({
        company_id,
        product_id: product.id,
        type,
        quantity: qty,
        reason,
        movement_date: today,
        notes: notes.trim() || null,
      })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
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
        style={{
          fontSize: 11,
          padding: '3px 10px',
          borderRadius: 6,
          border: '1px solid var(--gold-bdr)',
          background: 'var(--gold-bg)',
          color: 'var(--gold)',
          cursor: 'pointer',
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
          }}
          onClick={handleClose}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 20,
              width: '100%',
              maxWidth: 380,
              boxShadow: '0 20px 40px rgba(0,0,0,0.14)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <h3
                className="font-syne font-bold"
                style={{ fontSize: 14, color: 'var(--text)' }}
              >
                Movimiento de stock · {productNameTruncated}
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

            <div
              style={{
                background: 'var(--gold-bg)',
                border: '1px solid var(--gold-bdr)',
                borderRadius: 8,
                padding: '8px 12px',
                marginBottom: 12,
                fontSize: 12,
              }}
            >
              Stock actual:{' '}
              <strong
                style={{
                  fontFamily: 'var(--font-syne)',
                  color: 'var(--gold)',
                }}
              >
                {product.current_stock} unidades
              </strong>
            </div>

            {success && (
              <div
                style={{
                  background: 'rgba(5,150,105,0.08)',
                  border: '1px solid rgba(5,150,105,0.2)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 12,
                  fontSize: 12,
                  color: 'var(--green)',
                  fontWeight: 500,
                }}
              >
                ✓ Movimiento registrado
              </div>
            )}

            {error && (
              <div
                style={{
                  background: 'rgba(220,38,38,0.06)',
                  border: '1px solid rgba(220,38,38,0.2)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  marginBottom: 12,
                  fontSize: 12,
                  color: 'var(--red)',
                }}
              >
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <div>
                <label style={labelStyle}>Tipo</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {typeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleTypeChange(opt.value)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 500,
                        border:
                          type === opt.value
                            ? '1px solid var(--gold-bdr)'
                            : '1px solid var(--border)',
                        background:
                          type === opt.value ? 'var(--gold-bg)' : 'var(--hover)',
                        color: type === opt.value ? 'var(--gold)' : 'var(--text2)',
                        cursor: 'pointer',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="am-quantity" style={labelStyle}>
                  Cantidad
                </label>
                <input
                  id="am-quantity"
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div>
                <label htmlFor="am-reason" style={labelStyle}>
                  Razón
                </label>
                <select
                  id="am-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                >
                  {reasons.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="am-notes" style={labelStyle}>
                  Notas (opcional)
                </label>
                <textarea
                  id="am-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={handleClose}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: 13,
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
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: 13,
                    background: loading
                      ? 'rgba(232,165,0,0.5)'
                      : 'linear-gradient(135deg, #F5C842, #F09A1A)',
                    color: '#1A1B2E',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
