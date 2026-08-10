'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ModuleAiButton from '@/components/ai/ModuleAiButton'
import EmptyState from '@/components/ui/EmptyState'

// ── Types ───────────────────────────────────────────────────

interface Supplier { id: string; name: string }
interface Product  { id: string; name: string; sku: string | null; unit_cost: number; current_stock: number }

interface ApRecord {
  id:          string
  purchase_id: string
  amount:      number
  amount_paid: number
  balance:     number
  status:      string
  due_date:    string | null
}

interface PurchaseLine {
  product:     Product | null
  description: string
  quantity:    number
  unit_cost:   number
}

interface Purchase {
  id:             string
  purchase_date:  string
  invoice_ref:    string | null
  subtotal:       number
  tax_amount:     number
  total:          number
  payment_method: string
  credit_days:    number
  status:         string
  notes:          string | null
  suppliers:      { id: string; name: string } | null
}

interface Props {
  companyId:  string
  userRole:   string
  from:       string
  to:         string
  purchases:  Purchase[]
  suppliers:  Supplier[]
  apRecords:  ApRecord[]
  kpis: {
    totalComprado:      number
    totalPendienteCxP:  number
    countPurchases:     number
  }
}

// ── Helpers ─────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const PM_LABELS: Record<string, string> = {
  cash: 'Contado', credit: 'Crédito', transfer: 'Transferencia', card: 'Tarjeta',
}
const PM_COLORS: Record<string, string> = {
  cash: 'var(--green)', credit: '#F97316', transfer: 'var(--gold)', card: '#818CF8',
}

const inputBase: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border2)',
  color: 'var(--text)', fontFamily: 'var(--font-jakarta)',
  width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, boxSizing: 'border-box',
}
const labelSt: React.CSSProperties = {
  fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase',
  letterSpacing: '0.08em', fontWeight: 600, display: 'block', marginBottom: 4,
}
function onFocusSt(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = 'var(--gold)'
  e.target.style.boxShadow   = '0 0 0 3px var(--gold-bg)'
  e.target.style.outline     = 'none'
}
function onBlurSt(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = 'var(--border2)'
  e.target.style.boxShadow   = 'none'
}

// Botón pill reutilizable (mismo estilo que CompaniesManager)
function PillBtn({
  onClick, disabled, variant = 'neutral', children,
}: {
  onClick: () => void
  disabled?: boolean
  variant?: 'neutral' | 'red' | 'gold'
  children: React.ReactNode
}) {
  const styles: Record<string, React.CSSProperties> = {
    neutral: { border: '1px solid var(--border)', background: 'var(--hover)', color: 'var(--text2)' },
    red:     { border: '1px solid rgba(220,38,38,0.25)', background: 'rgba(220,38,38,0.05)', color: 'var(--red)' },
    gold:    { border: '1px solid rgba(245,200,66,0.35)', background: 'rgba(245,200,66,0.07)', color: 'var(--gold)' },
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 11, fontWeight: variant === 'neutral' ? 500 : 600,
        whiteSpace: 'nowrap', padding: '4px 9px', borderRadius: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        ...styles[variant],
      }}
    >
      {children}
    </button>
  )
}

// ── Purchase Form (shared between create and edit) ───────────

interface PurchaseFormProps {
  mode: 'create' | 'edit'
  purchase?: Purchase & { items?: { product_id: string | null; description: string | null; quantity: number; unit_cost: number }[] }
  suppliers:  Supplier[]
  companyId:  string
  onClose:    () => void
  onSuccess:  (updated?: Purchase) => void
}

function PurchaseForm({ mode, purchase, suppliers, companyId, onClose, onSuccess }: PurchaseFormProps) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [supplierId,    setSupplierId]    = useState(purchase?.suppliers?.id ?? '')
  const [purchaseDate,  setPurchaseDate]  = useState(purchase?.purchase_date ?? new Date().toISOString().slice(0, 10))
  const [invoiceRef,    setInvoiceRef]    = useState(purchase?.invoice_ref ?? '')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'transfer' | 'card'>((purchase?.payment_method as 'cash' | 'credit' | 'transfer' | 'card') ?? 'cash')
  const [creditDays,    setCreditDays]    = useState(purchase?.credit_days ?? 30)
  const [taxAmount,     setTaxAmount]     = useState(purchase?.tax_amount ?? 0)
  const [notes,         setNotes]         = useState(purchase?.notes ?? '')
  const [lines,         setLines]         = useState<PurchaseLine[]>([])

  const [products,   setProducts]   = useState<Product[]>([])
  const [prodSearch, setProdSearch] = useState('')
  const [showDrop,   setShowDrop]   = useState(false)

  // Load products & pre-fill lines for edit
  useEffect(() => {
    createClient()
      .from('products')
      .select('id, name, sku, unit_cost, current_stock')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        const prods = (data ?? []).map(p => ({
          id: p.id, name: p.name, sku: p.sku,
          unit_cost: p.unit_cost ?? 0, current_stock: p.current_stock ?? 0,
        }))
        setProducts(prods)

        // Pre-fill lines for edit mode
        if (mode === 'edit' && purchase?.items) {
          setLines(purchase.items.map(item => {
            const prod = prods.find(p => p.id === item.product_id) ?? null
            return {
              product: prod,
              description: item.description ?? (prod?.name ?? ''),
              quantity: item.quantity,
              unit_cost: item.unit_cost,
            }
          }))
        }
      })
  }, [companyId, mode, purchase]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredProds = useMemo(() => {
    const q = prodSearch.trim().toLowerCase()
    if (!q) return products
    return products.filter(p => p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q))
  }, [products, prodSearch])

  function addLine(product: Product) {
    if (lines.some(l => l.product?.id === product.id)) return
    setLines(prev => [...prev, { product, description: product.name, quantity: 1, unit_cost: product.unit_cost }])
    setProdSearch(''); setShowDrop(false)
  }
  function addFreeTextLine() {
    setLines(prev => [...prev, { product: null, description: '', quantity: 1, unit_cost: 0 }])
  }
  function removeLine(idx: number) { setLines(prev => prev.filter((_, i) => i !== idx)) }
  function updateLine<K extends keyof PurchaseLine>(idx: number, field: K, value: PurchaseLine[K]) {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l))
  }

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.quantity * l.unit_cost, 0), [lines])
  const total    = subtotal + taxAmount

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (lines.length === 0) { setError('Agrega al menos un ítem.'); return }
    if (lines.some(l => !l.description.trim())) { setError('Todos los ítems deben tener descripción.'); return }
    setLoading(true)

    const payload = {
      supplier_id:    supplierId || null,
      purchase_date:  purchaseDate,
      invoice_ref:    invoiceRef || null,
      payment_method: paymentMethod,
      credit_days:    paymentMethod === 'credit' ? creditDays : 0,
      tax_amount:     taxAmount,
      notes:          notes || null,
      items: lines.map(l => ({
        product_id:  l.product?.id ?? null,
        description: l.description,
        quantity:    l.quantity,
        unit_cost:   l.unit_cost,
      })),
    }

    const url    = mode === 'edit' ? `/api/purchases/${purchase!.id}` : '/api/purchases'
    const method = mode === 'edit' ? 'PATCH' : 'POST'

    const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Error al guardar'); setLoading(false); return }

    setSuccess(true)
    setLoading(false)

    // Build updated purchase for optimistic state (edit mode)
    const updatedPurchase: Purchase | undefined = mode === 'edit' && purchase
      ? {
          ...purchase,
          purchase_date: purchaseDate,
          invoice_ref: invoiceRef || null,
          payment_method: paymentMethod,
          credit_days: paymentMethod === 'credit' ? creditDays : 0,
          tax_amount: taxAmount,
          notes: notes || null,
          subtotal,
          total,
          suppliers: suppliers.find(s => s.id === supplierId)
            ? { id: supplierId, name: suppliers.find(s => s.id === supplierId)!.name }
            : null,
        } as Purchase
      : undefined

    setTimeout(() => {
      onSuccess(updatedPurchase)
    }, mode === 'edit' ? 800 : 1200)
  }

  const title = mode === 'edit' ? 'Editar compra' : 'Registrar compra'
  const cta   = mode === 'edit'
    ? (loading ? 'Guardando…' : `Guardar cambios · $${fmt(total)}`)
    : (loading ? 'Guardando…' : `Registrar compra · $${fmt(total)}`)

  return (
    <div
      role="dialog" aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
      onClick={() => { if (!loading) onClose() }}
    >
      <div
        style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px 24px 20px', width: '100%', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 className="font-syne font-bold" style={{ fontSize: 16, color: 'var(--text)' }}>{title}</h3>
          <button type="button" onClick={onClose} style={{ color: 'var(--muted)', fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>

        {success && (
          <div style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>
            ✓ {mode === 'edit' ? 'Compra actualizada' : 'Compra registrada'} correctamente
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Datos generales */}
          <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Datos de la compra</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelSt}>Proveedor</label>
                <select value={supplierId} onChange={e => setSupplierId(e.target.value)} style={inputBase} onFocus={onFocusSt} onBlur={onBlurSt}>
                  <option value="">Sin proveedor</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSt}>Fecha <span style={{ color: 'var(--red)' }}>*</span></label>
                <input type="date" required value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} style={inputBase} onFocus={onFocusSt} onBlur={onBlurSt} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelSt}>N° Factura</label>
                <input type="text" value={invoiceRef} onChange={e => setInvoiceRef(e.target.value)} placeholder="001-001-000012345" style={inputBase} onFocus={onFocusSt} onBlur={onBlurSt} />
              </div>
              <div>
                <label style={labelSt}>Método de pago <span style={{ color: 'var(--red)' }}>*</span></label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as typeof paymentMethod)} style={inputBase} onFocus={onFocusSt} onBlur={onBlurSt}>
                  <option value="cash">Contado</option>
                  <option value="credit">Crédito</option>
                  <option value="transfer">Transferencia</option>
                  <option value="card">Tarjeta</option>
                </select>
              </div>
            </div>

            {paymentMethod === 'credit' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelSt}>Plazo de crédito (días)</label>
                  <input type="number" min={1} value={creditDays} onChange={e => setCreditDays(parseInt(e.target.value) || 30)} style={inputBase} onFocus={onFocusSt} onBlur={onBlurSt} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                  <div style={{ fontSize: 11, color: '#F97316', background: 'rgba(249,115,22,0.08)', borderRadius: 6, padding: '6px 10px', lineHeight: 1.4 }}>
                    Vence: {new Date(new Date(purchaseDate).getTime() + creditDays * 86400000).toLocaleDateString('es-EC')}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Ítems */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ítems</span>
              <button type="button" onClick={addFreeTextLine} style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}>
                + Ítem libre
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type="text" value={prodSearch}
                onChange={e => { setProdSearch(e.target.value); setShowDrop(true) }}
                onFocus={e => { setShowDrop(true); onFocusSt(e) }}
                onBlur={e => { setTimeout(() => setShowDrop(false), 160); onBlurSt(e) }}
                placeholder="Buscar producto por nombre o SKU…"
                style={{ ...inputBase, paddingLeft: 36 }}
              />
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--muted)', pointerEvents: 'none' }}>🔍</span>
              {showDrop && prodSearch.trim() && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, maxHeight: 200, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.14)' }}>
                  {filteredProds.length === 0
                    ? <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--muted)' }}>Sin resultados</div>
                    : filteredProds.slice(0, 10).map(p => {
                        const added = lines.some(l => l.product?.id === p.id)
                        return (
                          <div key={p.id} onMouseDown={() => !added && addLine(p)}
                            style={{ padding: '9px 14px', cursor: added ? 'default' : 'pointer', opacity: added ? 0.4 : 1, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{p.name}</div>
                              <div style={{ fontSize: 10, color: 'var(--muted)' }}>SKU: {p.sku ?? '—'} · Costo: ${fmt(p.unit_cost)}</div>
                            </div>
                          </div>
                        )
                      })
                  }
                </div>
              )}
            </div>

            {lines.length === 0
              ? <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '14px 0', border: '1px dashed var(--border)', borderRadius: 8 }}>Busca un producto o agrega un ítem libre</div>
              : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 70px 110px 80px 24px', gap: 6, paddingBottom: 6, borderBottom: '1px solid var(--border)', marginBottom: 6 }}>
                    {['Descripción', 'Cant.', 'Costo unit.', 'Subtotal', ''].map(h => (
                      <div key={h} style={{ fontSize: 9, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</div>
                    ))}
                  </div>
                  {lines.map((line, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 70px 110px 80px 24px', gap: 6, alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                      <input type="text" value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)} placeholder="Descripción…" style={{ ...inputBase, padding: '5px 8px', fontSize: 12 }} onFocus={onFocusSt} onBlur={onBlurSt} />
                      <input type="number" min={0.001} step="0.001" value={line.quantity} onChange={e => updateLine(idx, 'quantity', parseFloat(e.target.value) || 1)} style={{ ...inputBase, padding: '5px 6px', fontSize: 12, textAlign: 'center' }} onFocus={onFocusSt} onBlur={onBlurSt} />
                      <input type="number" min={0} step="0.01" value={line.unit_cost} onChange={e => updateLine(idx, 'unit_cost', parseFloat(e.target.value) || 0)} style={{ ...inputBase, padding: '5px 8px', fontSize: 12 }} onFocus={onFocusSt} onBlur={onBlurSt} />
                      <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600, textAlign: 'right' }}>${fmt(line.quantity * line.unit_cost)}</div>
                      <button type="button" onClick={() => removeLine(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 17, lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              )
            }
          </div>

          {/* Totales */}
          {lines.length > 0 && (
            <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)' }}>
                <span>Subtotal</span><span>${fmt(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text2)', gap: 8 }}>
                <span>IVA</span>
                <input type="number" min={0} step="0.01" value={taxAmount || ''} placeholder="0.00" onChange={e => setTaxAmount(parseFloat(e.target.value) || 0)} style={{ ...inputBase, width: 100, padding: '4px 8px', fontSize: 12 }} onFocus={onFocusSt} onBlur={onBlurSt} />
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
                <span className="font-syne font-bold" style={{ fontSize: 14, color: 'var(--text)' }}>Total</span>
                <span className="font-syne font-bold" style={{ fontSize: 15, color: 'var(--gold)' }}>${fmt(total)}</span>
              </div>
            </div>
          )}

          {/* Notas */}
          <div>
            <label style={labelSt}>Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Observaciones opcionales…" style={{ ...inputBase, resize: 'vertical', minHeight: 60 }} onFocus={onFocusSt} onBlur={onBlurSt} />
          </div>

          {error && (
            <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--red)' }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} disabled={loading}
              style={{ flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, background: 'var(--hover)', color: 'var(--text2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading || lines.length === 0} className="font-syne font-bold"
              style={{ flex: 2, padding: '9px 0', borderRadius: 8, fontSize: 13, background: loading || lines.length === 0 ? 'rgba(232,165,0,0.45)' : 'linear-gradient(135deg,#F5C842,#F09A1A)', color: '#1A1B2E', border: 'none', cursor: loading || lines.length === 0 ? 'not-allowed' : 'pointer' }}>
              {cta}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Payment Modal ────────────────────────────────────────────

function PaymentModal({
  ap,
  onClose,
  onSuccess,
}: {
  ap: ApRecord
  onClose: () => void
  onSuccess: (apId: string, amountPaid: number) => void
}) {
  const [amount,        setAmount]        = useState<number>(ap.balance)
  const [paymentDate,   setPaymentDate]   = useState(new Date().toISOString().slice(0, 10))
  const [paymentMethod, setPaymentMethod] = useState('transfer')
  const [notes,         setNotes]         = useState('')
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [success,       setSuccess]       = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!amount || amount <= 0) { setError('Ingresa un monto válido.'); return }
    if (amount > ap.balance + 0.001) { setError(`El monto supera el saldo pendiente ($${fmt(ap.balance)})`); return }
    setLoading(true)

    const res  = await fetch(`/api/ap/${ap.id}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, payment_date: paymentDate, payment_method: paymentMethod, notes: notes || null }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Error al registrar el pago'); setLoading(false); return }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => onSuccess(ap.id, amount), 1000)
  }

  const STATUS_LABEL: Record<string, string> = { pending: 'Pendiente', partial: 'Parcial', paid: 'Pagada', overdue: 'Vencida' }
  const STATUS_COLOR: Record<string, string> = { pending: '#F97316', partial: '#F59E0B', paid: 'var(--green)', overdue: 'var(--red)' }

  return (
    <div
      role="dialog" aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)' }}
      onClick={() => { if (!loading) onClose() }}
    >
      <div
        style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px 24px 20px', width: '100%', maxWidth: 420, boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 className="font-syne font-bold" style={{ fontSize: 16, color: 'var(--text)' }}>Registrar pago CxP</h3>
          <button type="button" onClick={onClose} style={{ color: 'var(--muted)', fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>

        {/* Resumen AP */}
        <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '12px 14px', marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { label: 'Total factura', value: `$${fmt(ap.amount)}`, color: 'var(--text)' },
            { label: 'Pagado',        value: `$${fmt(ap.amount_paid)}`, color: 'var(--green)' },
            { label: 'Saldo',         value: `$${fmt(ap.balance)}`, color: '#F97316', bold: true },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--muted)' }}>{r.label}</span>
              <span style={{ color: r.color, fontWeight: r.bold ? 700 : 400, fontVariantNumeric: 'tabular-nums' }}>{r.value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 2 }}>
            <span style={{ color: 'var(--muted)' }}>Estado</span>
            <span style={{ color: STATUS_COLOR[ap.status] ?? 'var(--muted)', fontWeight: 600 }}>{STATUS_LABEL[ap.status] ?? ap.status}</span>
          </div>
          {ap.due_date && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'var(--muted)' }}>Vencimiento</span>
              <span style={{ color: 'var(--text2)' }}>{ap.due_date}</span>
            </div>
          )}
        </div>

        {success && (
          <div style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>
            ✓ Pago registrado correctamente
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelSt}>Monto a pagar <span style={{ color: 'var(--red)' }}>*</span></label>
            <input
              type="number" min={0.01} step="0.01" required
              value={amount || ''}
              onChange={e => setAmount(parseFloat(e.target.value) || 0)}
              style={inputBase} onFocus={onFocusSt} onBlur={onBlurSt}
            />
          </div>
          <div>
            <label style={labelSt}>Fecha de pago</label>
            <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} style={inputBase} onFocus={onFocusSt} onBlur={onBlurSt} />
          </div>
          <div>
            <label style={labelSt}>Método de pago</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={inputBase} onFocus={onFocusSt} onBlur={onBlurSt}>
              <option value="transfer">Transferencia</option>
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="check">Cheque</option>
            </select>
          </div>
          <div>
            <label style={labelSt}>Notas</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Referencia, número de transacción…" style={inputBase} onFocus={onFocusSt} onBlur={onBlurSt} />
          </div>

          {error && (
            <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--red)' }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} disabled={loading}
              style={{ flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, background: 'var(--hover)', color: 'var(--text2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="font-syne font-bold"
              style={{ flex: 2, padding: '9px 0', borderRadius: 8, fontSize: 13, background: loading ? 'rgba(232,165,0,0.45)' : 'linear-gradient(135deg,#F5C842,#F09A1A)', color: '#1A1B2E', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Registrando…' : `Registrar pago · $${fmt(amount || 0)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


// ── Component ────────────────────────────────────────────────

export default function PurchasesOverview({
  companyId, userRole, purchases: initialPurchases, suppliers, apRecords: initialApRecords, kpis,
}: Props) {
  const router  = useRouter()
  const canEdit = ['admin', 'manager'].includes(userRole)

  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases)
  const [apRecords, setApRecords] = useState<ApRecord[]>(initialApRecords)

  // Create modal
  const [openCreate, setOpenCreate] = useState(false)

  // Edit modal
  const [editPurchase, setEditPurchase] = useState<(Purchase & { items?: { product_id: string | null; description: string | null; quantity: number; unit_cost: number }[] }) | null>(null)
  const [loadingEdit,  setLoadingEdit]  = useState(false)

  // Payment modal
  const [payingAp, setPayingAp] = useState<ApRecord | null>(null)

  // Delete state
  const [deletingId,  setDeletingId]  = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleOpenEdit(p: Purchase) {
    setLoadingEdit(true)
    try {
      const res  = await fetch(`/api/purchases/${p.id}`)
      const json = await res.json()
      if (res.ok) {
        setEditPurchase({ ...json.purchase, suppliers: p.suppliers })
      }
    } finally {
      setLoadingEdit(false)
    }
  }

  async function handleDelete(p: Purchase) {
    if (!confirm(`¿Eliminar la compra del ${p.purchase_date}? Esta acción no se puede deshacer.`)) return
    setDeletingId(p.id)
    setDeleteError(null)
    const res  = await fetch(`/api/purchases/${p.id}`, { method: 'DELETE' })
    const json = await res.json()
    setDeletingId(null)
    if (!res.ok) { setDeleteError(json.error ?? 'Error al eliminar'); return }
    setPurchases(prev => prev.filter(x => x.id !== p.id))
    router.refresh()
  }

  async function handleAnular(p: Purchase) {
    if (!confirm(`¿Anular la compra del ${p.purchase_date}?`)) return
    setDeletingId(p.id)
    const res  = await fetch(`/api/purchases/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    const json = await res.json()
    setDeletingId(null)
    if (!res.ok) { setDeleteError(json.error ?? 'Error al anular'); return }
    setPurchases(prev => prev.map(x => x.id === p.id ? { ...x, status: 'cancelled' } : x))
    router.refresh()
  }

  const getModuleData = useCallback(() => ({
    totalComprado: kpis.totalComprado,
    totalPendienteCxP: kpis.totalPendienteCxP,
    countCompras: kpis.countPurchases,
    compras: purchases.slice(0, 15).map(p => ({
      proveedor: p.suppliers?.name ?? 'Sin proveedor',
      total: p.total, estado: p.status,
      metodoPago: p.payment_method, fecha: p.purchase_date,
    })),
  }), [kpis, purchases])

  const kpiCards = [
    { label: 'Total comprado', value: `$${fmt(kpis.totalComprado)}`, color: 'var(--text)' },
    { label: 'CxP pendiente',  value: `$${fmt(kpis.totalPendienteCxP)}`, color: '#F97316' },
    { label: 'Compras',        value: kpis.countPurchases.toString(), color: 'var(--gold)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* KPIs + IA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) auto', gap: 12, alignItems: 'stretch' }}>
        {kpiCards.map(k => (
          <div key={k.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color, fontFamily: 'var(--font-syne)' }}>{k.value}</div>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ModuleAiButton module="purchases" getModuleData={getModuleData} />
        </div>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-syne)' }}>
          Compras del período
        </span>
        {canEdit && (
          <button
            onClick={() => setOpenCreate(true)}
            className="font-syne font-bold"
            style={{ background: 'linear-gradient(135deg,#F5C842,#F09A1A)', color: '#1A1B2E', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, cursor: 'pointer' }}
          >
            + Registrar compra
          </button>
        )}
      </div>

      {deleteError && (
        <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: 'var(--red)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {deleteError}
          <button onClick={() => setDeleteError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 16 }}>×</button>
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflowX: 'auto' }}>
        {purchases.length === 0 ? (
          <EmptyState
            icon="🛒"
            title="Aún no hay compras registradas"
            description="Aquí verás todo lo que le compras a tus proveedores — materias primas, productos para reventa, insumos. Al registrar tus compras, Lumio calcula automáticamente tu costo real y genera las cuentas por pagar."
            tip="Empieza registrando la última factura que recibiste de un proveedor. Necesitas tener proveedores creados primero en el módulo de Proveedores."
            action={{ label: '+ Registrar primera compra', onClick: () => setOpenCreate(true) }}
            secondaryAction={{ label: 'Ir a Proveedores →', href: '/suppliers' }}
          />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                {['Fecha', 'Proveedor', 'Factura', 'Subtotal', 'IVA', 'Total', 'Método', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {purchases.map(p => {
                const isCancelled = p.status === 'cancelled'
                const isProcessing = deletingId === p.id || loadingEdit
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', opacity: deletingId === p.id ? 0.4 : 1 }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text2)', whiteSpace: 'nowrap' }}>{p.purchase_date}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text)', fontWeight: 500 }}>
                      {(p.suppliers as Supplier | null)?.name ?? '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{p.invoice_ref ?? '—'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text2)', fontVariantNumeric: 'tabular-nums' }}>${fmt(p.subtotal)}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>${fmt(p.tax_amount)}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--gold)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>${fmt(p.total)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: PM_COLORS[p.payment_method] ?? 'var(--muted)', background: `${PM_COLORS[p.payment_method] ?? 'var(--muted)'}15`, padding: '2px 8px', borderRadius: 4 }}>
                        {PM_LABELS[p.payment_method] ?? p.payment_method}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: isCancelled ? 'var(--red)' : 'var(--green)', background: isCancelled ? 'rgba(220,38,38,0.08)' : 'rgba(5,150,105,0.08)', padding: '2px 8px', borderRadius: 4 }}>
                        {isCancelled ? 'Anulada' : 'Recibida'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      {canEdit && (
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                          {!isCancelled && (
                            <PillBtn
                              onClick={() => handleOpenEdit(p)}
                              disabled={isProcessing}
                              variant="neutral"
                            >
                              <span style={{ fontSize: 10 }}>✎</span> Editar
                            </PillBtn>
                          )}
                          {(() => {
                            const ap = apRecords.find(r => r.purchase_id === p.id && ['pending', 'partial', 'overdue'].includes(r.status))
                            if (!ap) return null
                            return (
                              <PillBtn onClick={() => setPayingAp(ap)} disabled={isProcessing} variant="gold">
                                💳 Pagar (${fmt(ap.balance)})
                              </PillBtn>
                            )
                          })()}
                          {!isCancelled && (
                            <PillBtn
                              onClick={() => handleAnular(p)}
                              disabled={isProcessing}
                              variant="gold"
                            >
                              {deletingId === p.id ? '…' : '⊘ Anular'}
                            </PillBtn>
                          )}
                          <PillBtn
                            onClick={() => handleDelete(p)}
                            disabled={isProcessing}
                            variant="red"
                          >
                            {deletingId === p.id ? '…' : '🗑 Eliminar'}
                          </PillBtn>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal — Crear */}
      {openCreate && (
        <PurchaseForm
          mode="create"
          suppliers={suppliers}
          companyId={companyId}
          onClose={() => setOpenCreate(false)}
          onSuccess={() => {
            setOpenCreate(false)
            router.refresh()
          }}
        />
      )}

      {/* Modal — Editar */}
      {editPurchase && (
        <PurchaseForm
          mode="edit"
          purchase={editPurchase}
          suppliers={suppliers}
          companyId={companyId}
          onClose={() => setEditPurchase(null)}
          onSuccess={(updated) => {
            setEditPurchase(null)
            if (updated) {
              setPurchases(prev => prev.map(x => x.id === updated.id ? updated : x))
            }
            router.refresh()
          }}
        />
      )}

      {/* Modal — Pagar CxP */}
      {payingAp && (
        <PaymentModal
          ap={payingAp}
          onClose={() => setPayingAp(null)}
          onSuccess={(apId, amountPaid) => {
            setApRecords(prev => prev.map(r => {
              if (r.id !== apId) return r
              const newPaid = r.amount_paid + amountPaid
              const newBal  = r.amount - newPaid
              return {
                ...r,
                amount_paid: newPaid,
                balance: newBal,
                status: newBal <= 0.001 ? 'paid' : 'partial',
              }
            }))
            setPayingAp(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
