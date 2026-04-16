'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
export default function NewBankAccountForm() {
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [bank_name, setBankName] = useState('')
  const [account_type, setAccountType] = useState('checking')
  const [account_number, setAccountNumber] = useState('')
  const [initial_balance, setInitialBalance] = useState('0')

  function resetForm() {
    setBankName('')
    setAccountType('checking')
    setAccountNumber('')
    setInitialBalance('0')
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

    if (!bank_name.trim()) {
      setError('El nombre del banco es obligatorio.')
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

    const balance = parseFloat(initial_balance) || 0

    const { error: insertError } = await supabase.from('bank_accounts').insert({
      company_id,
      bank_name: bank_name.trim(),
      account_type,
      account_number: account_number.trim() || null,
      initial_balance: balance,
      current_balance: balance,
      is_active: true,
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
        + Nueva cuenta
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Nueva cuenta bancaria"
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
              maxWidth: 420,
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
                Nueva cuenta
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
                  marginBottom: 12,
                  fontSize: 12,
                  color: 'var(--green)',
                  fontWeight: 500,
                }}
              >
                ✓ Cuenta registrada correctamente
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
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div>
                <label htmlFor="ba-bank_name" style={labelStyle}>
                  Nombre del banco
                </label>
                <input
                  id="ba-bank_name"
                  type="text"
                  required
                  value={bank_name}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Banco Pichincha"
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div>
                <label htmlFor="ba-account_type" style={labelStyle}>
                  Tipo de cuenta
                </label>
                <select
                  id="ba-account_type"
                  value={account_type}
                  onChange={(e) => setAccountType(e.target.value)}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                >
                  <option value="checking">Cuenta corriente</option>
                  <option value="savings">Cuenta de ahorros</option>
                  <option value="cash">Caja chica</option>
                  <option value="other">Otra</option>
                </select>
              </div>

              <div>
                <label htmlFor="ba-account_number" style={labelStyle}>
                  Número (opcional)
                </label>
                <input
                  id="ba-account_number"
                  type="text"
                  value={account_number}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="últimos 4 dígitos"
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div>
                <label htmlFor="ba-initial_balance" style={labelStyle}>
                  Saldo inicial $
                </label>
                <input
                  id="ba-initial_balance"
                  type="number"
                  step="0.01"
                  value={initial_balance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  placeholder="0.00"
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
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
