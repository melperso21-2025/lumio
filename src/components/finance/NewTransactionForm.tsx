'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ── Tipos ─────────────────────────────────────────────────────
interface Account {
  id: string
  bank_name: string | null
  account_type: string | null
}

interface NewTransactionFormProps {
  accounts?: Account[]
}

// ── Categorías por tipo ───────────────────────────────────────
const incomeCategories = [
  { value: 'sale', label: 'Venta' },
  { value: 'collection', label: 'Cobro CxC' },
  { value: 'loan', label: 'Préstamo recibido' },
  { value: 'investment', label: 'Inversión recibida' },
  { value: 'other', label: 'Otro ingreso' },
]

const expenseCategories = [
  { value: 'payroll', label: 'Nómina' },
  { value: 'marketing', label: 'Marketing / Pauta' },
  { value: 'supplier', label: 'Proveedor' },
  { value: 'rent', label: 'Arriendo' },
  { value: 'utilities', label: 'Servicios básicos' },
  { value: 'taxes', label: 'Impuestos' },
  { value: 'logistics', label: 'Logística' },
  { value: 'other', label: 'Otro egreso' },
]

// ── Estilos base ──────────────────────────────────────────────
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
export default function NewTransactionForm({ accounts = [] }: NewTransactionFormProps) {
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [type, setType] = useState<'income' | 'expense'>('income')
  const [account_id, setAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [concept, setConcept] = useState('')
  const [tx_date, setTxDate] = useState(new Date().toISOString().slice(0, 10))
  const [is_fixed, setIsFixed] = useState(false)

  const categories = type === 'income' ? incomeCategories : expenseCategories

  useEffect(() => {
    if (open && accounts.length > 0 && !account_id) {
      setAccountId(accounts[0].id)
    }
  }, [open, accounts, account_id])

  function resetForm() {
    setType('income')
    setAccountId(accounts[0]?.id ?? '')
    setCategory('')
    setConcept('')
    setTxDate(new Date().toISOString().slice(0, 10))
    setIsFixed(false)
    setError(null)
    setSuccess(false)
  }

  function handleClose() {
    if (loading) return
    setOpen(false)
    resetForm()
  }

  function handleTypeChange(newType: 'income' | 'expense') {
    setType(newType)
    setCategory('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (accounts.length === 0) {
      setError('Primero crea una cuenta bancaria.')
      return
    }

    const amt = parseFloat(amount) || 0
    if (amt <= 0) {
      setError('El monto debe ser mayor a 0.')
      return
    }

    if (!account_id) {
      setError('Selecciona una cuenta.')
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

    const { error: insertError } = await supabase.from('bank_transactions').insert({
      company_id,
      account_id,
      type,
      amount: amt,
      category: category || null,
      concept: concept.trim() || null,
      tx_date,
      is_fixed,
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
        className="font-syne font-bold text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
        style={{
          background: 'linear-gradient(135deg, #F5C842, #F09A1A)',
          color: '#1A1B2E',
        }}
      >
        + Movimiento
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Nuevo movimiento"
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
              maxWidth: 480,
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
                Nuevo movimiento
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
                <label style={labelStyle}>Tipo</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('income')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 500,
                      border:
                        type === 'income'
                          ? '1px solid var(--gold-bdr)'
                          : '1px solid var(--border)',
                      background:
                        type === 'income' ? 'var(--gold-bg)' : 'var(--hover)',
                      color: type === 'income' ? 'var(--gold)' : 'var(--text2)',
                      cursor: 'pointer',
                    }}
                  >
                    📈 Ingreso
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('expense')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 500,
                      border:
                        type === 'expense'
                          ? '1px solid var(--gold-bdr)'
                          : '1px solid var(--border)',
                      background:
                        type === 'expense' ? 'var(--gold-bg)' : 'var(--hover)',
                      color: type === 'expense' ? 'var(--gold)' : 'var(--text2)',
                      cursor: 'pointer',
                    }}
                  >
                    📉 Egreso
                  </button>
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="tx-account" style={labelStyle}>
                  Cuenta
                </label>
                {accounts.length === 0 ? (
                  <input
                    type="text"
                    disabled
                    value="Primero crea una cuenta"
                    style={{
                      ...inputStyle,
                      background: 'var(--hover)',
                      color: 'var(--muted)',
                      cursor: 'not-allowed',
                    }}
                  />
                ) : (
                  <select
                    id="tx-account"
                    value={account_id}
                    onChange={(e) => setAccountId(e.target.value)}
                    required
                    style={inputStyle}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  >
                    <option value="">Selecciona cuenta</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.bank_name ?? 'Sin nombre'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label htmlFor="tx-amount" style={labelStyle}>
                  Monto $
                </label>
                <input
                  id="tx-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div>
                <label htmlFor="tx-category" style={labelStyle}>
                  Categoría
                </label>
                <select
                  id="tx-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                >
                  <option value="">Sin categoría</option>
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="tx-concept" style={labelStyle}>
                  Concepto
                </label>
                <input
                  id="tx-concept"
                  type="text"
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="Descripción del movimiento"
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div>
                <label htmlFor="tx-date" style={labelStyle}>
                  Fecha
                </label>
                <input
                  id="tx-date"
                  type="date"
                  value={tx_date}
                  onChange={(e) => setTxDate(e.target.value)}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  gridColumn: '1 / -1',
                }}
              >
                <input
                  type="checkbox"
                  id="tx-fixed"
                  checked={is_fixed}
                  onChange={(e) => setIsFixed(e.target.checked)}
                  style={{
                    width: 16,
                    height: 16,
                    accentColor: 'var(--gold)',
                  }}
                />
                <label
                  htmlFor="tx-fixed"
                  style={{
                    fontSize: 12,
                    color: 'var(--text2)',
                    cursor: 'pointer',
                  }}
                >
                  Es un movimiento fijo recurrente (nómina, arriendo, etc.)
                </label>
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
                  disabled={loading || accounts.length === 0}
                  className="font-syne font-bold"
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 8,
                    fontSize: 14,
                    background:
                      loading || accounts.length === 0
                        ? 'rgba(232,165,0,0.5)'
                        : 'linear-gradient(135deg, #F5C842, #F09A1A)',
                    color: '#1A1B2E',
                    border: 'none',
                    cursor:
                      loading || accounts.length === 0
                        ? 'not-allowed'
                        : 'pointer',
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
