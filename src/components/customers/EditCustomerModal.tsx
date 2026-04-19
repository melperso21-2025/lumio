'use client'

import { useState, useEffect } from 'react'
import PhoneInput from '@/components/ui/PhoneInput'
import { toLocalISO } from '@/lib/dateUtils'
import { validatePhone, validateTaxId, validateDate } from '@/lib/validations'
import type { CustomerDetail } from '@/components/customers/CustomerDetailView'

// ── Types ──────────────────────────────────────────────────────────────────

interface CatalogItem {
  id: string
  name: string
  color: string
}

interface EditCustomerModalProps {
  customer: CustomerDetail
  customerTypes: CatalogItem[]
  customerLabels: CatalogItem[]
  companyId: string
  onClose: () => void
  onSuccess: (updated: CustomerDetail) => void
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

function onFocus(
  e: React.FocusEvent<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >
) {
  e.target.style.borderColor = 'var(--gold)'
  e.target.style.boxShadow = '0 0 0 3px var(--gold-bg)'
}
function onBlur(
  e: React.FocusEvent<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >
) {
  e.target.style.borderColor = 'var(--border2)'
  e.target.style.boxShadow = 'none'
}

// ── Component ──────────────────────────────────────────────────────────────

export default function EditCustomerModal({
  customer,
  customerTypes,
  customerLabels,
  companyId,
  onClose,
  onSuccess,
}: EditCustomerModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function setFieldError(field: string, msg: string | null) {
    setFieldErrors((prev) => {
      const next = { ...prev }
      if (msg) next[field] = msg
      else delete next[field]
      return next
    })
  }

  // Required
  const [full_name, setFullName] = useState(customer.full_name ?? '')
  const [id_type, setIdType] = useState<'cedula' | 'ruc' | 'pasaporte'>(
    (customer.id_type as 'cedula' | 'ruc' | 'pasaporte') ?? 'cedula'
  )
  const [tax_id, setTaxId] = useState(customer.tax_id ?? '')
  const [phone, setPhone] = useState(customer.phone ?? '')
  const [email, setEmail] = useState(customer.email ?? '')

  // Optional
  const [address, setAddress] = useState(customer.address ?? '')
  const [customer_type, setCustomerType] = useState(customer.customer_type ?? '')
  const [label, setLabel] = useState(customer.label ?? '')
  const [registered_since, setRegisteredSince] = useState(
    customer.registered_since ?? toLocalISO(new Date())
  )

  // Company
  const [is_company, setIsCompany] = useState(customer.is_company ?? false)
  const [contact_name, setContactName] = useState(customer.contact_name ?? '')
  const [contact_phone, setContactPhone] = useState(customer.contact_phone ?? '')
  const [contact_email, setContactEmail] = useState(customer.contact_email ?? '')

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validate all fields before submit
    const errs: Record<string, string> = {}
    if (!full_name.trim() || full_name.trim().length < 2)
      errs.full_name = full_name.trim() ? 'El nombre debe tener al menos 2 caracteres' : 'El nombre completo es obligatorio'
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = email.trim() ? 'El email no tiene un formato válido' : 'El email es obligatorio'
    if (!phone.trim()) {
      errs.phone = 'El teléfono es obligatorio'
    } else {
      const phoneRes = validatePhone(phone)
      if (!phoneRes.valid) errs.phone = phoneRes.error!
    }
    if (!tax_id.trim()) {
      errs.tax_id = 'El número de identificación es obligatorio'
    } else {
      const taxRes = validateTaxId(tax_id.trim(), id_type)
      if (!taxRes.valid) errs.tax_id = taxRes.error!
    }
    if (!registered_since) {
      errs.registered_since = 'cliente_desde es obligatorio'
    } else {
      const dateRes = validateDate(registered_since)
      if (!dateRes.valid) errs.registered_since = 'cliente_desde debe ser una fecha válida (YYYY-MM-DD)'
    }
    if (contact_phone.trim()) {
      const cpRes = validatePhone(contact_phone)
      if (!cpRes.valid) errs.contact_phone = cpRes.error!
    }
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      setError('Corrige los errores antes de guardar.')
      return
    }
    setFieldErrors({})

    setLoading(true)

    const res = await fetch(`/api/customers/${customer.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: full_name.trim(),
        id_type,
        tax_id: tax_id.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        customer_type: customer_type || null,
        label: label || null,
        registered_since,
        is_company,
        contact_name: is_company && contact_name.trim() ? contact_name.trim() : null,
        contact_phone: is_company && contact_phone.trim() ? contact_phone.trim() : null,
        contact_email: is_company && contact_email.trim() ? contact_email.trim() : null,
      }),
    })

    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Error al guardar el cliente.')
      setLoading(false)
      return
    }

    setLoading(false)
    onSuccess(json.customer as CustomerDetail)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Editar cliente"
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
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 24,
          width: '100%',
          maxWidth: 520,
          boxShadow: '0 20px 40px rgba(0,0,0,0.14)',
          margin: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
            Editar cliente
          </h3>
          <button
            type="button"
            onClick={onClose}
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
          {/* ── Identificación ── */}
          <div
            style={{
              padding: '10px 12px',
              background: 'var(--bg)',
              borderRadius: 8,
              border: '1px solid var(--border)',
            }}
          >
            <p
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontWeight: 700,
                color: 'var(--muted)',
                marginBottom: 10,
              }}
            >
              Identificación
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Nombre completo *</label>
                <input
                  type="text"
                  required
                  value={full_name}
                  onChange={(e) => { setFullName(e.target.value); setFieldError('full_name', null) }}
                  style={{ ...inputStyle, borderColor: fieldErrors.full_name ? 'rgba(220,38,38,0.6)' : undefined }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
                {fieldErrors.full_name && <p style={{ marginTop: 3, fontSize: 11, color: 'var(--red)' }}>{fieldErrors.full_name}</p>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Tipo de ID *</label>
                  <select
                    value={id_type}
                    onChange={(e) => { setIdType(e.target.value as 'cedula' | 'ruc' | 'pasaporte'); setTaxId(''); setFieldError('tax_id', null) }}
                    style={inputStyle}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  >
                    <option value="cedula">Cédula (10 dígitos)</option>
                    <option value="ruc">RUC (13 dígitos)</option>
                    <option value="pasaporte">Pasaporte (6-20 chars)</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Número de ID *</label>
                  <input
                    type="text"
                    required
                    value={tax_id}
                    onChange={(e) => { setTaxId(e.target.value); setFieldError('tax_id', null) }}
                    placeholder={id_type === 'cedula' ? '1712345678' : id_type === 'ruc' ? '1712345678001' : 'ABC123456'}
                    style={{ ...inputStyle, borderColor: fieldErrors.tax_id ? 'rgba(220,38,38,0.6)' : undefined }}
                    onFocus={onFocus}
                    onBlur={(e) => {
                      onBlur(e)
                      if (e.target.value.trim()) {
                        const res = validateTaxId(e.target.value.trim(), id_type)
                        setFieldError('tax_id', res.valid ? null : (res.error ?? null))
                      }
                    }}
                  />
                  {fieldErrors.tax_id && <p style={{ marginTop: 3, fontSize: 11, color: 'var(--red)' }}>{fieldErrors.tax_id}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* ── Contacto ── */}
          <div
            style={{
              padding: '10px 12px',
              background: 'var(--bg)',
              borderRadius: 8,
              border: '1px solid var(--border)',
            }}
          >
            <p
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontWeight: 700,
                color: 'var(--muted)',
                marginBottom: 10,
              }}
            >
              Contacto
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Teléfono *</label>
                <PhoneInput value={phone} onChange={(v) => { setPhone(v); setFieldError('phone', null) }} required />
                {fieldErrors.phone && <p style={{ marginTop: 3, fontSize: 11, color: 'var(--red)' }}>{fieldErrors.phone}</p>}
              </div>
              <div>
                <label style={labelStyle}>Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldError('email', null) }}
                  style={{ ...inputStyle, borderColor: fieldErrors.email ? 'rgba(220,38,38,0.6)' : undefined }}
                  onFocus={onFocus}
                  onBlur={(e) => {
                    onBlur(e)
                    if (e.target.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value))
                      setFieldError('email', 'El email no tiene un formato válido')
                  }}
                />
                {fieldErrors.email && <p style={{ marginTop: 3, fontSize: 11, color: 'var(--red)' }}>{fieldErrors.email}</p>}
              </div>
              <div>
                <label style={labelStyle}>Dirección</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 52 }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>
            </div>
          </div>

          {/* ── Clasificación ── */}
          <div
            style={{
              padding: '10px 12px',
              background: 'var(--bg)',
              borderRadius: 8,
              border: '1px solid var(--border)',
            }}
          >
            <p
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontWeight: 700,
                color: 'var(--muted)',
                marginBottom: 10,
              }}
            >
              Clasificación
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Tipo de cliente</label>
                <select
                  value={customer_type}
                  onChange={(e) => setCustomerType(e.target.value)}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                >
                  <option value="">— Sin tipo —</option>
                  {customerTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Etiqueta</label>
                <select
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                >
                  <option value="">— Sin etiqueta —</option>
                  {customerLabels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Cliente desde *</label>
                <input
                  type="date"
                  required
                  value={registered_since}
                  onChange={(e) => { setRegisteredSince(e.target.value); setFieldError('registered_since', null) }}
                  style={{ ...inputStyle, borderColor: fieldErrors.registered_since ? 'rgba(220,38,38,0.6)' : undefined }}
                  onFocus={onFocus}
                  onBlur={(e) => {
                    onBlur(e)
                    if (!e.target.value) setFieldError('registered_since', 'cliente_desde es obligatorio')
                  }}
                />
                {fieldErrors.registered_since && <p style={{ marginTop: 3, fontSize: 11, color: 'var(--red)' }}>{fieldErrors.registered_since}</p>}
              </div>
            </div>
          </div>

          {/* ── Toggle empresa ── */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              padding: '10px 12px',
              background: is_company ? 'rgba(37,99,235,0.05)' : 'var(--bg)',
              borderRadius: 8,
              border: `1px solid ${is_company ? 'rgba(37,99,235,0.25)' : 'var(--border)'}`,
              transition: 'all 0.15s',
            }}
          >
            <input
              type="checkbox"
              checked={is_company}
              onChange={(e) => setIsCompany(e.target.checked)}
              style={{
                width: 16,
                height: 16,
                accentColor: 'var(--blue)',
                cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
              ¿Es una empresa?
            </span>
          </label>

          {/* ── Contacto de empresa ── */}
          {is_company && (
            <div
              style={{
                padding: '10px 12px',
                background: 'rgba(37,99,235,0.03)',
                borderRadius: 8,
                border: '1px solid rgba(37,99,235,0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <p
                style={{
                  fontSize: 9,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontWeight: 700,
                  color: 'var(--blue)',
                }}
              >
                Contacto de empresa
              </p>
              <div>
                <label style={labelStyle}>Persona de contacto</label>
                <input
                  type="text"
                  value={contact_name}
                  onChange={(e) => setContactName(e.target.value)}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>
              <div>
                <label style={labelStyle}>Teléfono de contacto</label>
                <PhoneInput value={contact_phone} onChange={(v) => { setContactPhone(v); setFieldError('contact_phone', null) }} />
                {fieldErrors.contact_phone && <p style={{ marginTop: 3, fontSize: 11, color: 'var(--red)' }}>{fieldErrors.contact_phone}</p>}
              </div>
              <div>
                <label style={labelStyle}>Email de contacto</label>
                <input
                  type="email"
                  value={contact_email}
                  onChange={(e) => setContactEmail(e.target.value)}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>
            </div>
          )}

          {/* ── Buttons ── */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
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
              {loading ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
