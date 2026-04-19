'use client'

import { useState, useEffect } from 'react'
import PhoneInput from '@/components/ui/PhoneInput'
import { validateTaxId, validateAccountNumber, validateSupplier } from '@/lib/validations'
import type { SupplierRow } from './SuppliersTable'

// ── Styles ─────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border2)',
  color: 'var(--text)',
  fontFamily: 'var(--font-jakarta)',
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  fontSize: 13,
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

const sectionTitle: React.CSSProperties = {
  fontSize: 9,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  fontWeight: 700,
  color: 'var(--muted)',
  marginBottom: 10,
}

function onFocusStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = 'var(--gold)'
  e.target.style.boxShadow   = '0 0 0 3px var(--gold-bg)'
}
function onBlurStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = 'var(--border2)'
  e.target.style.boxShadow   = 'none'
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p style={{ marginTop: 3, fontSize: 11, color: 'var(--red)' }}>{msg}</p>
}

// ── Types ──────────────────────────────────────────────────────────────────

interface EditSupplierModalProps {
  supplier: SupplierRow & {
    default_lead_time_days?: number | null
    payment_terms?: string | null
    bank_tax_id?: string | null
    account_type?: string | null
  }
  onClose: () => void
  onSuccess?: () => void
}

// ── Component ──────────────────────────────────────────────────────────────

export default function EditSupplierModal({ supplier, onClose, onSuccess }: EditSupplierModalProps) {

  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // State init from supplier
  const [is_company, setIsCompany] = useState(supplier.is_company !== false)
  const [name, setName]             = useState(supplier.name ?? '')
  const [first_name, setFirstName]  = useState(supplier.first_name ?? '')
  const [last_name, setLastName]    = useState(supplier.last_name ?? '')
  const [id_type, setIdType]        = useState(supplier.id_type ?? 'ruc')
  const [tax_id, setTaxId]          = useState(supplier.tax_id ?? '')
  const [phone, setPhone]           = useState(supplier.phone ?? '')
  const [email, setEmail]           = useState(supplier.email ?? '')
  const [address, setAddress]       = useState(supplier.address ?? '')

  const [showBanking, setShowBanking]       = useState(!!(supplier.bank_name || supplier.bank_account))
  const [bank_name, setBankName]             = useState(supplier.bank_name ?? '')
  const [bank_account, setBankAccount]       = useState(supplier.bank_account ?? '')
  const [account_type, setAccountType]       = useState(supplier.account_type ?? 'checking')
  const [bank_tax_id, setBankTaxId]          = useState(supplier.bank_tax_id ?? '')
  const [bankAccountError, setBankAccountError] = useState<string | null>(null)

  const [default_lead_time_days, setLeadTime] = useState(
    supplier.default_lead_time_days != null ? String(supplier.default_lead_time_days) : ''
  )
  // payment_terms: stored code (cash|15d|30d|60d|90d|other)
  // payment_terms_other: free text shown only when code === 'other'
  const [payment_terms, setPaymentTerms]           = useState(supplier.payment_terms ?? '')
  const [payment_terms_other, setPaymentTermsOther] = useState('')

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setSuccess(false)

    const row: Record<string, unknown> = {
      is_company,
      name:       is_company ? name : undefined,
      first_name: is_company ? undefined : first_name,
      last_name:  is_company ? undefined : last_name,
      id_type, tax_id, phone, email, address,
      bank_name:    showBanking ? bank_name    : undefined,
      bank_account: showBanking ? bank_account : undefined,
      account_type: showBanking ? account_type : undefined,
      bank_tax_id:  showBanking ? bank_tax_id  : undefined,
      default_lead_time_days: default_lead_time_days || undefined,
      payment_terms: payment_terms || undefined,
    }

    const metadata =
      payment_terms === 'other' && payment_terms_other.trim()
        ? { payment_terms_detail: payment_terms_other.trim() }
        : null

    const result = validateSupplier(row, '')
    if (!result.valid) {
      setFieldErrors(result.errors)
      setError('Revisa los campos con error.')
      return
    }

    setFieldErrors({})
    setLoading(true)

    const res = await fetch(`/api/suppliers/${supplier.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...result.data, ...(metadata ? { metadata } : {}) }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Error al actualizar')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    onSuccess?.()
    setTimeout(onClose, 1200)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Editar proveedor"
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', overflowY: 'auto', padding: '24px 0' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 560, boxShadow: '0 20px 40px rgba(0,0,0,0.14)', margin: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 className="font-syne font-bold" style={{ fontSize: 16, color: 'var(--text)' }}>Editar proveedor</h3>
          <button type="button" onClick={onClose} style={{ color: 'var(--muted)', fontSize: 18, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>

        {success && <div style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>✓ Proveedor actualizado</div>}
        {error && <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: 'var(--red)' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Tipo */}
          <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <p style={sectionTitle}>Tipo de proveedor</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[true, false].map((val) => (
                <button key={String(val)} type="button"
                  onClick={() => { setIsCompany(val); setFieldErrors({}) }}
                  style={{ flex: 1, padding: '7px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500, border: is_company === val ? '1px solid var(--gold-bdr)' : '1px solid var(--border)', background: is_company === val ? 'var(--gold-bg)' : 'var(--hover)', color: is_company === val ? 'var(--gold)' : 'var(--text2)', cursor: 'pointer' }}>
                  {val ? '🏢 Empresa' : '👤 Persona natural'}
                </button>
              ))}
            </div>
          </div>

          {/* Nombre */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {is_company ? (
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Nombre de empresa *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  style={{ ...inputStyle, borderColor: fieldErrors.name ? 'rgba(220,38,38,0.5)' : undefined }}
                  onFocus={onFocusStyle} onBlur={onBlurStyle} />
                <FieldError msg={fieldErrors.name} />
              </div>
            ) : (
              <>
                <div>
                  <label style={labelStyle}>Nombre *</label>
                  <input type="text" value={first_name} onChange={(e) => setFirstName(e.target.value)}
                    style={{ ...inputStyle, borderColor: fieldErrors.first_name ? 'rgba(220,38,38,0.5)' : undefined }}
                    onFocus={onFocusStyle} onBlur={onBlurStyle} />
                  <FieldError msg={fieldErrors.first_name} />
                </div>
                <div>
                  <label style={labelStyle}>Apellido *</label>
                  <input type="text" value={last_name} onChange={(e) => setLastName(e.target.value)}
                    style={{ ...inputStyle, borderColor: fieldErrors.last_name ? 'rgba(220,38,38,0.5)' : undefined }}
                    onFocus={onFocusStyle} onBlur={onBlurStyle} />
                  <FieldError msg={fieldErrors.last_name} />
                </div>
              </>
            )}

            <div>
              <label style={labelStyle}>Tipo de documento *</label>
              <select value={id_type} onChange={(e) => setIdType(e.target.value)}
                style={{ ...inputStyle, borderColor: fieldErrors.id_type ? 'rgba(220,38,38,0.5)' : undefined }}
                onFocus={onFocusStyle} onBlur={onBlurStyle}>
                <option value="ruc">RUC</option>
                <option value="cedula">Cédula</option>
                <option value="pasaporte">Pasaporte</option>
              </select>
              <FieldError msg={fieldErrors.id_type} />
            </div>

            <div>
              <label style={labelStyle}>{id_type === 'cedula' ? 'Cédula' : id_type === 'ruc' ? 'RUC' : 'Pasaporte'} *</label>
              <input type="text" value={tax_id} onChange={(e) => setTaxId(e.target.value)}
                style={{ ...inputStyle, borderColor: fieldErrors.tax_id ? 'rgba(220,38,38,0.5)' : undefined }}
                onFocus={onFocusStyle}
                onBlur={(e) => {
                  onBlurStyle(e)
                  if (tax_id) {
                    const r = validateTaxId(tax_id, id_type as 'cedula' | 'ruc' | 'pasaporte')
                    if (!r.valid) setFieldErrors((prev) => ({ ...prev, tax_id: r.error! }))
                    else setFieldErrors((prev) => { const n = { ...prev }; delete n.tax_id; return n })
                  }
                }}
              />
              <FieldError msg={fieldErrors.tax_id} />
            </div>
          </div>

          {/* Contacto */}
          <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <p style={sectionTitle}>Contacto</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              <div>
                <label style={labelStyle}>Teléfono *</label>
                <PhoneInput value={phone} onChange={setPhone} error={fieldErrors.phone} />
              </div>
              <div>
                <label style={labelStyle}>Email *</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  style={{ ...inputStyle, borderColor: fieldErrors.email ? 'rgba(220,38,38,0.5)' : undefined }}
                  onFocus={onFocusStyle} onBlur={onBlurStyle} />
                <FieldError msg={fieldErrors.email} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Dirección</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2}
                  style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
                  onFocus={onFocusStyle} onBlur={onBlurStyle} />
              </div>
            </div>
          </div>

          {/* Datos bancarios */}
          <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <button type="button" onClick={() => setShowBanking((v) => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <span style={{ ...sectionTitle, marginBottom: 0 }}>Datos bancarios (opcional)</span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{showBanking ? '▲' : '▼'}</span>
            </button>
            {showBanking && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 12 }}>
                <div>
                  <label style={labelStyle}>Banco</label>
                  <input type="text" value={bank_name} onChange={(e) => setBankName(e.target.value)} style={inputStyle} onFocus={onFocusStyle} onBlur={onBlurStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Tipo de cuenta</label>
                  <select value={account_type} onChange={(e) => setAccountType(e.target.value)} style={inputStyle} onFocus={onFocusStyle} onBlur={onBlurStyle}>
                    <option value="checking">Corriente</option>
                    <option value="savings">Ahorros</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Número de cuenta</label>
                  <input type="text" inputMode="numeric" value={bank_account}
                    onChange={(e) => { setBankAccount(e.target.value); if (bankAccountError) setBankAccountError(null) }}
                    style={{ ...inputStyle, borderColor: bankAccountError ? 'rgba(220,38,38,0.5)' : undefined }}
                    onFocus={onFocusStyle}
                    onBlur={(e) => {
                      onBlurStyle(e)
                      const v = e.target.value.trim()
                      if (v) {
                        const r = validateAccountNumber(v)
                        setBankAccountError(r.valid ? null : (r.error ?? null))
                      } else setBankAccountError(null)
                    }}
                  />
                  {bankAccountError && <p style={{ marginTop: 3, fontSize: 11, color: 'var(--red)' }}>{bankAccountError}</p>}
                </div>
                <div>
                  <label style={labelStyle}>RUC/Cédula de la cuenta</label>
                  <input type="text" value={bank_tax_id} onChange={(e) => setBankTaxId(e.target.value)} style={inputStyle} onFocus={onFocusStyle} onBlur={onBlurStyle} />
                </div>
              </div>
            )}
          </div>

          {/* Adicionales */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            <div>
              <label style={labelStyle}>Días de entrega</label>
              <input type="number" min="1" value={default_lead_time_days} onChange={(e) => setLeadTime(e.target.value)}
                placeholder="7" style={inputStyle} onFocus={onFocusStyle} onBlur={onBlurStyle} />
            </div>
            <div>
              <label style={labelStyle}>Términos de pago</label>
              <select value={payment_terms} onChange={(e) => setPaymentTerms(e.target.value)}
                style={inputStyle} onFocus={onFocusStyle} onBlur={onBlurStyle}>
                <option value="">Sin especificar</option>
                <option value="cash">Contado</option>
                <option value="15d">15 días</option>
                <option value="30d">30 días</option>
                <option value="60d">60 días</option>
                <option value="90d">90 días</option>
                <option value="other">Otro</option>
              </select>
              {payment_terms === 'other' && (
                <input
                  type="text"
                  value={payment_terms_other}
                  onChange={(e) => setPaymentTermsOther(e.target.value)}
                  placeholder="Especifica los términos"
                  style={{ ...inputStyle, marginTop: 6 }}
                  onFocus={onFocusStyle} onBlur={onBlurStyle}
                />
              )}
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: 'var(--hover)', color: 'var(--text2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="font-syne font-bold"
              style={{ flex: 1, padding: '10px 16px', borderRadius: 8, fontSize: 13, background: loading ? 'rgba(232,165,0,0.5)' : 'linear-gradient(135deg, #F5C842, #F09A1A)', color: '#1A1B2E', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
