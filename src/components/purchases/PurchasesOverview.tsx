'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ── Types ───────────────────────────────────────────────────

interface Supplier { id: string; name: string }
interface Product  { id: string; name: string; sku: string | null; unit_cost: number; current_stock: number }

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
  kpis: {
    totalComprado:   number
    totalPendienteCxP: number
    countPurchases:  number
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

// ── Component ────────────────────────────────────────────────

export default function PurchasesOverview({
  companyId, userRole, purchases, suppliers, kpis,
}: Props) {
  const router  = useRouter()
  const canEdit = ['admin', 'manager'].includes(userRole)

  // ── Modal state ──────────────────────────────────────────
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // ── Form fields ──────────────────────────────────────────
  const [supplierId,    setSupplierId]    = useState('')
  const [purchaseDate,  setPurchaseDate]  = useState(new Date().toISOString().slice(0, 10))
  const [invoiceRef,    setInvoiceRef]    = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'transfer' | 'card'>('cash')
  const [creditDays,    setCreditDays]    = useState(30)
  const [taxAmount,     setTaxAmount]     = useState(0)
  const [notes,         setNotes]         = useState('')
  const [lines,         setLines]         = useState<PurchaseLine[]>([])

  // ── Products ─────────────────────────────────────────────
  const [products,   setProducts]   = useState<Product[]>([])
  const [prodSearch, setProdSearch] = useState('')
  const [showDrop,   setShowDrop]   = useState(false)

  useEffect(() => {
    if (!open) return
    createClient()
      .from('products')
      .select('id, name, sku, unit_cost, current_stock')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setProducts((data ?? []).map(p => ({
        id: p.id, name: p.name, sku: p.sku,
        unit_cost: p.unit_cost ?? 0, current_stock: p.current_stock ?? 0,
      }))))
  }, [open, companyId])

  const filteredProds = useMemo(() => {
    const q = prodSearch.trim().toLowerCase()
    if (!q) return products
    return products.filter(p => p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q))
  }, [products, prodSearch])

  function addLine(product: Product) {
    if (lines.some(l => l.product?.id === product.id)) return
    setLines(prev => [...prev, { product, description: product.name, quantity: 1, unit_cost: product.unit_cost }])
    setProdSearch('')
    setShowDrop(false)
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

  function resetForm() {
    setSupplierId(''); setPurchaseDate(new Date().toISOString().slice(0, 10))
    setInvoiceRef(''); setPaymentMethod('cash'); setCreditDays(30)
    setTaxAmount(0); setNotes(''); setLines([])
    setProdSearch(''); setShowDrop(false)
    setError(null); setSuccess(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (lines.length === 0) { setError('Agrega al menos un ítem.'); return }
    if (lines.some(l => !l.description.trim())) { setError('Todos los ítems deben tener descripción.'); return }
    setLoading(true)

    const res = await fetch('/api/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplier_id:    supplierId || undefined,
        purchase_date:  purchaseDate,
        invoice_ref:    invoiceRef || undefined,
        payment_method: paymentMethod,
        credit_days:    paymentMethod === 'credit' ? creditDays : 0,
        tax_amount:     taxAmount,
        notes:          notes || undefined,
        items: lines.map(l => ({
          product_id:  l.product?.id,
          description: l.description,
          quantity:    l.quantity,
          unit_cost:   l.unit_cost,
        })),
      }),
    })

    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Error al registrar compra'); setLoading(false); return }

    setSuccess(true); setLoading(false)
    resetForm()
    router.refresh()
    setTimeout(() => { setOpen(false); setSuccess(false) }, 1200)
  }

  // ── KPI Cards ────────────────────────────────────────────
  const kpiCards = [
    { label: 'Total comprado', value: `$${fmt(kpis.totalComprado)}`, color: 'var(--text)' },
    { label: 'CxP pendiente',  value: `$${fmt(kpis.totalPendienteCxP)}`, color: '#F97316' },
    { label: 'Compras',        value: kpis.countPurchases.toString(), color: 'var(--gold)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {kpiCards.map(k => (
          <div key={k.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color, fontFamily: 'var(--font-syne)' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-syne)' }}>
          Compras del período
        </span>
        {canEdit && (
          <button
            onClick={() => setOpen(true)}
            className="font-syne font-bold"
            style={{ background: 'linear-gradient(135deg,#F5C842,#F09A1A)', color: '#1A1B2E', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, cursor: 'pointer' }}
          >
            + Registrar compra
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10 }}>
        {purchases.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            No hay compras en este período
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                {['Fecha', 'Proveedor', 'Factura', 'Subtotal', 'IVA', 'Total', 'Método', 'Estado'].map(h => (
                  <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {purchases.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>{p.purchase_date}</td>
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
                    <span style={{ fontSize: 10, fontWeight: 600, color: p.status === 'cancelled' ? 'var(--red)' : 'var(--green)', background: p.status === 'cancelled' ? 'rgba(220,38,38,0.08)' : 'rgba(5,150,105,0.08)', padding: '2px 8px', borderRadius: 4 }}>
                      {p.status === 'cancelled' ? 'Anulada' : 'Recibida'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── MODAL Nueva Compra ─────────────────────────────── */}
      {open && (
        <div
          role="dialog" aria-modal="true"
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
          onClick={() => { if (!loading) { setOpen(false); resetForm() } }}
        >
          <div
            style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px 24px 20px', width: '100%', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 className="font-syne font-bold" style={{ fontSize: 16, color: 'var(--text)' }}>Registrar compra</h3>
              <button type="button" onClick={() => { setOpen(false); resetForm() }} style={{ color: 'var(--muted)', fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
            </div>

            {success && (
              <div style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>
                ✓ Compra registrada correctamente
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

                {/* Búsqueda de producto */}
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

                {/* Líneas */}
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
                <button type="button" onClick={() => { setOpen(false); resetForm() }} disabled={loading} style={{ flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, background: 'var(--hover)', color: 'var(--text2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={loading || lines.length === 0} className="font-syne font-bold"
                  style={{ flex: 2, padding: '9px 0', borderRadius: 8, fontSize: 13, background: loading || lines.length === 0 ? 'rgba(232,165,0,0.45)' : 'linear-gradient(135deg,#F5C842,#F09A1A)', color: '#1A1B2E', border: 'none', cursor: loading || lines.length === 0 ? 'not-allowed' : 'pointer' }}>
                  {loading ? 'Guardando…' : `Registrar compra · $${fmt(total)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
