'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toLocalISO } from '@/lib/dateUtils'

// ── Types ──────────────────────────────────────────────────────────────────

interface Account {
  id: string
  bank_name: string | null
  account_type: string | null
}

interface TxCategory {
  id: string
  name: string
  type: 'income' | 'expense' | 'both'
}

interface NewTransactionFormProps {
  accounts?: Account[]
}

// ── Styles ─────────────────────────────────────────────────────────────────

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
function onBlurStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = 'var(--border2)'
  e.target.style.boxShadow = 'none'
}

// ── Component ───────────────────────────────────────────────────────────────

export default function NewTransactionForm({ accounts = [] }: NewTransactionFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [type, setType]           = useState<'income' | 'expense'>('income')
  const [account_id, setAccountId] = useState('')
  const [amount, setAmount]       = useState('')
  const [category, setCategory]   = useState('')
  const [concept, setConcept]     = useState('')
  const [tx_date, setTxDate]      = useState(toLocalISO(new Date()))
  const [is_fixed, setIsFixed]    = useState(false)

  // DB-loaded categories
  const [allCategories, setAllCategories] = useState<TxCategory[]>([])
  const [loadingCats, setLoadingCats]     = useState(false)

  // Filtered categories by current type
  const categories = allCategories.filter(
    (c) => c.type === type || c.type === 'both'
  )

  // Load categories from DB when modal opens
  useEffect(() => {
    if (!open) return

    // Pre-select first account
    if (accounts.length > 0 && !account_id) {
      setAccountId(accounts[0].id)
    }

    async function loadCategories() {
      setLoadingCats(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) { setLoadingCats(false); return }

      const { data: userRow } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!userRow?.company_id) { setLoadingCats(false); return }

      const { data } = await supabase
        .from('bank_transaction_categories')
        .select('id, name, type')
        .eq('company_id', userRow.company_id)
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('name', { ascending: true })

      setAllCategories((data ?? []) as TxCategory[])
      setLoadingCats(false)
    }

    loadCategories()
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset selected category when type changes
  useEffect(() => {
    setCategory('')
  }, [type])

  function resetForm() {
    setType('income')
    setAccountId(accounts[0]?.id ?? '')
    setAmount('')
    setCategory('')
    setConcept('')
    setTxDate(toLocalISO(new Date()))
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

    // Client-side validation
    if (accounts.length === 0) {
      setError('Primero crea una cuenta bancaria.')
      return
    }
    if (!account_id) {
      setError('Selecciona una cuenta bancaria.')
      return
    }
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) {
      setError('El monto debe ser un número mayor a 0.')
      return
    }
    if (!category) {
      setError('La categoría es obligatoria.')
      return
    }
    if (!tx_date) {
      setError('La fecha es obligatoria.')
      return
    }

    setLoading(true)

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
      category,
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

  // ── Render ─────────────────────────────────────────────────────────────────

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
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 className="font-syne font-bold" style={{ fontSize: 16, color: 'var(--text)' }}>
                Nuevo movimiento
              </h3>
              <button
                type="button"
                onClick={handleClose}
                style={{ color: 'var(--muted)', fontSize: 18, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            {/* Success */}
            {success && (
              <div style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>
                ✓ Movimiento registrado
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: 'var(--red)' }}>
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}
            >
              {/* Tipo */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Tipo *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['income', 'expense'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleTypeChange(t)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 500,
                        border: type === t ? '1px solid var(--gold-bdr)' : '1px solid var(--border)',
                        background: type === t ? 'var(--gold-bg)' : 'var(--hover)',
                        color: type === t ? 'var(--gold)' : 'var(--text2)',
                        cursor: 'pointer',
                      }}
                    >
                      {t === 'income' ? '📈 Ingreso' : '📉 Egreso'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cuenta */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="tx-account" style={labelStyle}>Cuenta *</label>
                {accounts.length === 0 ? (
                  <input type="text" disabled value="Primero crea una cuenta" style={{ ...inputStyle, background: 'var(--hover)', color: 'var(--muted)', cursor: 'not-allowed' }} />
                ) : (
                  <select
                    id="tx-account"
                    value={account_id}
                    onChange={(e) => setAccountId(e.target.value)}
                    required
                    style={inputStyle}
                    onFocus={onFocus}
                    onBlur={onBlurStyle}
                  >
                    <option value="">Selecciona cuenta</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.bank_name ?? 'Sin nombre'}
                        {a.account_type ? ` · ${a.account_type}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Monto */}
              <div>
                <label htmlFor="tx-amount" style={labelStyle}>Monto $ *</label>
                <input
                  id="tx-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlurStyle}
                />
              </div>

              {/* Categoría */}
              <div>
                <label htmlFor="tx-category" style={labelStyle}>
                  Categoría *
                </label>
                <select
                  id="tx-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  style={{
                    ...inputStyle,
                    borderColor: !category ? 'rgba(220,38,38,0.4)' : undefined,
                  }}
                  onFocus={onFocus}
                  onBlur={onBlurStyle}
                >
                  <option value="">
                    {loadingCats ? 'Cargando…' : 'Selecciona categoría'}
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                  {!loadingCats && categories.length === 0 && (
                    <option disabled value="">
                      Sin categorías — crea en Configuración → Finanzas
                    </option>
                  )}
                </select>
              </div>

              {/* Concepto */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="tx-concept" style={labelStyle}>Concepto</label>
                <input
                  id="tx-concept"
                  type="text"
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="Descripción del movimiento"
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlurStyle}
                />
              </div>

              {/* Fecha */}
              <div>
                <label htmlFor="tx-date" style={labelStyle}>Fecha *</label>
                <input
                  id="tx-date"
                  type="date"
                  value={tx_date}
                  onChange={(e) => setTxDate(e.target.value)}
                  required
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlurStyle}
                />
              </div>

              {/* Es fijo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="tx-fixed"
                  checked={is_fixed}
                  onChange={(e) => setIsFixed(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--gold)' }}
                />
                <label htmlFor="tx-fixed" style={{ fontSize: 12, color: 'var(--text2)', cursor: 'pointer' }}>
                  Movimiento fijo
                </label>
              </div>

              {/* Acciones */}
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={handleClose}
                  style={{ flex: 1, padding: '10px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500, background: 'var(--hover)', color: 'var(--text2)', border: '1px solid var(--border)', cursor: 'pointer' }}
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
                    background: loading || accounts.length === 0 ? 'rgba(232,165,0,0.5)' : 'linear-gradient(135deg, #F5C842, #F09A1A)',
                    color: '#1A1B2E',
                    border: 'none',
                    cursor: loading || accounts.length === 0 ? 'not-allowed' : 'pointer',
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
