'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ── Estilos base (igual que QuickSaleForm) ─────────────────────
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
export default function NewCustomerForm() {
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [full_name, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [customer_type, setCustomerType] = useState('retail')
  const [label, setLabel] = useState('new')
  const [registered_since, setRegisteredSince] = useState(
    new Date().toISOString().slice(0, 10)
  )

  function resetForm() {
    setFullName('')
    setPhone('')
    setEmail('')
    setCustomerType('retail')
    setLabel('new')
    setRegisteredSince(new Date().toISOString().slice(0, 10))
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

    if (!full_name.trim()) {
      setError('El nombre es obligatorio.')
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

    const { error: insertError } = await supabase.from('customers').insert({
      company_id,
      full_name: full_name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      customer_type,
      label,
      registered_since,
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
        + Nuevo cliente
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Nuevo cliente"
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
                Nuevo cliente
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
                ✓ Cliente registrado correctamente
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
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div>
                <label htmlFor="nc-full_name" style={labelStyle}>
                  Nombre completo
                </label>
                <input
                  id="nc-full_name"
                  type="text"
                  required
                  value={full_name}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nombre completo"
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div>
                <label htmlFor="nc-phone" style={labelStyle}>
                  Teléfono
                </label>
                <input
                  id="nc-phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+593 99 000 0000"
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div>
                <label htmlFor="nc-email" style={labelStyle}>
                  Email
                </label>
                <input
                  id="nc-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@empresa.com"
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div>
                <label htmlFor="nc-customer_type" style={labelStyle}>
                  Tipo de cliente
                </label>
                <select
                  id="nc-customer_type"
                  value={customer_type}
                  onChange={(e) => setCustomerType(e.target.value)}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                >
                  <option value="retail">Retail (consumidor final)</option>
                  <option value="wholesale">Mayorista</option>
                  <option value="occasional">Eventual</option>
                  <option value="b2b">Empresa (B2B)</option>
                </select>
              </div>

              <div>
                <label htmlFor="nc-label" style={labelStyle}>
                  Etiqueta
                </label>
                <select
                  id="nc-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                >
                  <option value="new">Nuevo</option>
                  <option value="frequent">Frecuente</option>
                  <option value="vip">VIP</option>
                  <option value="recovery">Recuperar</option>
                </select>
              </div>

              <div>
                <label htmlFor="nc-registered_since" style={labelStyle}>
                  Cliente desde
                </label>
                <input
                  id="nc-registered_since"
                  type="date"
                  value={registered_since}
                  onChange={(e) => setRegisteredSince(e.target.value)}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div
                style={{
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
