'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ModuleAiButton from '@/components/ai/ModuleAiButton'
import EmptyState from '@/components/ui/EmptyState'

// ── Types ────────────────────────────────────────────────────

export interface APRecord {
  id:          string
  purchase_id: string | null
  supplier_id: string | null
  amount:      number
  amount_paid: number
  balance:     number
  issue_date:  string
  due_date:    string
  status:      string
  notes:       string | null
  suppliers:   { name: string } | null
}

interface Props {
  records: APRecord[]
  kpis: {
    totalPendiente: number
    totalVencido:   number
    totalPagado:    number
    countPendiente: number
  }
  userRole: string
}

// ── Helpers ──────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const today = new Date().toISOString().slice(0, 10)

function agingBucket(dueDate: string): string {
  const diff = Math.floor((new Date(today).getTime() - new Date(dueDate).getTime()) / 86400000)
  if (diff <= 0)  return 'Al día'
  if (diff <= 30) return '1-30 días'
  if (diff <= 60) return '31-60 días'
  if (diff <= 90) return '61-90 días'
  return '+90 días'
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', partial: 'Parcial', paid: 'Pagada', overdue: 'Vencida',
}
const STATUS_COLORS: Record<string, string> = {
  pending: 'var(--gold)', partial: '#F97316', paid: 'var(--green)', overdue: 'var(--red)',
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
function onFocusSt(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = 'var(--gold)'; e.target.style.boxShadow = '0 0 0 3px var(--gold-bg)'; e.target.style.outline = 'none'
}
function onBlurSt(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = 'var(--border2)'; e.target.style.boxShadow = 'none'
}

// ── Component ────────────────────────────────────────────────

export default function PayablesOverview({ records, kpis, userRole }: Props) {
  const router  = useRouter()
  const canEdit = ['admin', 'manager'].includes(userRole)

  const [selected, setSelected] = useState<APRecord | null>(null)
  const [amount,   setAmount]   = useState('')
  const [date,     setDate]     = useState(today)
  const [method,   setMethod]   = useState('transfer')
  const [notes,    setNotes]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState(false)
  const [filter,   setFilter]   = useState<'all' | 'pending' | 'partial' | 'paid'>('all')

  const visible = records.filter(r =>
    filter === 'all'     ? true :
    filter === 'pending' ? ['pending', 'partial'].includes(r.status) :
    r.status === filter
  )

  function openModal(r: APRecord) {
    setSelected(r)
    setAmount(String(r.balance > 0 ? r.balance.toFixed(2) : ''))
    setDate(today); setMethod('transfer'); setNotes('')
    setError(null); setSuccess(false)
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setError(null); setLoading(true)

    const res = await fetch(`/api/ap/${selected.id}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: parseFloat(amount), payment_date: date, payment_method: method, notes: notes || undefined }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Error'); setLoading(false); return }

    setSuccess(true); setLoading(false)
    router.refresh()
    setTimeout(() => { setSelected(null); setSuccess(false) }, 1000)
  }

  // Aging summary
  const agingMap: Record<string, number> = {}
  records.filter(r => !['paid'].includes(r.status)).forEach(r => {
    const b = agingBucket(r.due_date)
    agingMap[b] = (agingMap[b] ?? 0) + r.balance
  })
  const agingOrder  = ['Al día', '1-30 días', '31-60 días', '61-90 días', '+90 días']
  const agingColors = ['var(--green)', 'var(--gold)', '#F97316', '#EF4444', '#DC2626']

  const getModuleData = useCallback(() => ({
    totalPendiente: kpis.totalPendiente,
    totalVencido: kpis.totalVencido,
    totalPagado: kpis.totalPagado,
    countActivas: kpis.countPendiente,
    agingResumen: agingOrder.map(b => ({ bucket: b, monto: agingMap[b] ?? 0 })),
    registros: records.slice(0, 20).map(r => ({
      proveedor: r.suppliers?.name ?? 'Sin nombre',
      monto: r.amount,
      saldo: r.balance,
      vencimiento: r.due_date,
      estado: r.status,
    })),
  }), [kpis, agingMap, agingOrder, records])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', minHeight: 0 }}>

      {/* KPIs + IA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr) auto', gap: 12, alignItems: 'stretch' }}>
        {[
          { label: 'Pendiente de pago', value: `$${fmt(kpis.totalPendiente)}`, color: '#F97316'      },
          { label: 'Vencido',           value: `$${fmt(kpis.totalVencido)}`,   color: 'var(--red)'   },
          { label: 'Pagado (período)',  value: `$${fmt(kpis.totalPagado)}`,    color: 'var(--green)' },
          { label: 'CxP activas',       value: kpis.countPendiente.toString(), color: 'var(--text)'  },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.color, fontFamily: 'var(--font-syne)' }}>{k.value}</div>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ModuleAiButton module="payables" getModuleData={getModuleData} />
        </div>
      </div>

      {/* Aging */}
      {Object.keys(agingMap).length > 0 && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', alignSelf: 'center' }}>Antigüedad deuda</div>
          {agingOrder.filter(k => agingMap[k]).map((k, i) => (
            <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: agingColors[i], fontFamily: 'var(--font-syne)' }}>${fmt(agingMap[k]!)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8 }}>
        {(['all', 'pending', 'partial', 'paid'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ fontSize: 11, padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 600, background: filter === f ? 'var(--gold)' : 'var(--surface)', color: filter === f ? '#1A1B2E' : 'var(--muted)' }}>
            {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : f === 'partial' ? 'Parciales' : 'Pagadas'}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10 }}>
        {records.length === 0
          ? (
            <EmptyState
              icon="📤"
              title="No hay facturas por pagar"
              description="Las cuentas por pagar (CxP) se crean automáticamente cuando registras una compra a crédito. Aquí verás cuánto le debes a cada proveedor y cuándo vence el plazo de pago."
              tip="Registra una compra en el módulo de Compras y elige 'Crédito' como método de pago. La CxP se generará sola."
              action={{ label: 'Ir a Compras →', href: '/purchases' }}
            />
          )
          : visible.length === 0
          ? <EmptyState isFilterEmpty onClearFilter={() => setFilter('all')} />
          : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                  {['Proveedor', 'Emisión', 'Vencimiento', 'Total', 'Pagado', 'Saldo', 'Estado', ''].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(r => {
                  const isOverdue = !['paid'].includes(r.status) && r.due_date < today
                  const statusKey = isOverdue && r.status !== 'partial' ? 'overdue' : r.status
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px', color: 'var(--text)', fontWeight: 500 }}>
                        {(r.suppliers as { name: string } | null)?.name ?? '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>{r.issue_date}</td>
                      <td style={{ padding: '10px 12px', color: isOverdue ? 'var(--red)' : 'var(--text2)', fontWeight: isOverdue ? 600 : 400 }}>
                        {r.due_date} {isOverdue && '⚠'}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>${fmt(r.amount)}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>${fmt(r.amount_paid)}</td>
                      <td style={{ padding: '10px 12px', color: '#F97316', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>${fmt(r.balance)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: STATUS_COLORS[statusKey] ?? 'var(--muted)', background: `${STATUS_COLORS[statusKey] ?? 'var(--muted)'}15`, padding: '2px 8px', borderRadius: 4 }}>
                          {STATUS_LABELS[statusKey] ?? statusKey}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {canEdit && r.status !== 'paid' && (
                          <button onClick={() => openModal(r)}
                            style={{ fontSize: 10, padding: '3px 10px', borderRadius: 5, border: '1px solid #F97316', background: 'rgba(249,115,22,0.08)', color: '#F97316', fontWeight: 600, cursor: 'pointer' }}>
                            Registrar pago
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )
        }
      </div>

      {/* Modal pago */}
      {selected && (
        <div role="dialog" aria-modal="true"
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
          onClick={() => { if (!loading) setSelected(null) }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px', width: '100%', maxWidth: 420, boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="font-syne font-bold" style={{ fontSize: 15, color: 'var(--text)' }}>Registrar pago</h3>
              <button type="button" onClick={() => setSelected(null)} style={{ color: 'var(--muted)', fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12 }}>
              <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}>
                {(selected.suppliers as { name: string } | null)?.name ?? 'Proveedor'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
                <span>Total: ${fmt(selected.amount)}</span>
                <span>Saldo: <strong style={{ color: '#F97316' }}>${fmt(selected.balance)}</strong></span>
              </div>
            </div>

            {success && (
              <div style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: 'var(--green)' }}>✓ Pago registrado</div>
            )}

            <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelSt}>Monto <span style={{ color: 'var(--red)' }}>*</span></label>
                  <input type="number" min={0.01} step="0.01" max={selected.balance} required value={amount} onChange={e => setAmount(e.target.value)} style={inputBase} onFocus={onFocusSt} onBlur={onBlurSt} />
                </div>
                <div>
                  <label style={labelSt}>Fecha</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputBase} onFocus={onFocusSt} onBlur={onBlurSt} />
                </div>
              </div>
              <div>
                <label style={labelSt}>Método</label>
                <select value={method} onChange={e => setMethod(e.target.value)} style={inputBase} onFocus={onFocusSt} onBlur={onBlurSt}>
                  <option value="transfer">Transferencia</option>
                  <option value="cash">Efectivo</option>
                  <option value="card">Tarjeta</option>
                  <option value="check">Cheque</option>
                </select>
              </div>
              <div>
                <label style={labelSt}>Notas</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcional…" style={inputBase} onFocus={onFocusSt} onBlur={onBlurSt} />
              </div>
              {error && <div style={{ fontSize: 12, color: 'var(--red)', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 6, padding: '8px 12px' }}>{error}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="button" onClick={() => setSelected(null)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, background: 'var(--hover)', color: 'var(--text2)', border: '1px solid var(--border)', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={loading} className="font-syne font-bold"
                  style={{ flex: 2, padding: '9px 0', borderRadius: 8, fontSize: 13, background: loading ? 'rgba(249,115,22,0.4)' : 'linear-gradient(135deg,#F97316,#EA580C)', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading ? 'Guardando…' : 'Confirmar pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
