'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toLocalISO } from '@/lib/dateUtils'
import PhoneInput from '@/components/ui/PhoneInput'
import { validatePhone, validateTaxId, validateDate } from '@/lib/validations'

// ── Types ──────────────────────────────────────────────────────────────────

interface CatalogItem {
  id: string
  name: string
  color: string
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

function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = 'var(--gold)'
  e.target.style.boxShadow = '0 0 0 3px var(--gold-bg)'
}
function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = 'var(--border2)'
  e.target.style.boxShadow = 'none'
}

// ── Component ──────────────────────────────────────────────────────────────

export default function NewCustomerForm() {
  const router = useRouter()
  const supabase = createClient()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Catalog state
  const [customerTypes, setCustomerTypes] = useState<CatalogItem[]>([])
  const [customerLabels, setCustomerLabels] = useState<CatalogItem[]>([])
  const [loadingCatalogs, setLoadingCatalogs] = useState(false)

  // Required fields
  const [full_name, setFullName] = useState('')
  const [id_type, setIdType] = useState<'cedula' | 'ruc' | 'pasaporte' | 'ruc_extranjero'>('cedula')
  const [tax_id, setTaxId] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  // Optional fields
  const [address, setAddress] = useState('')
  const [customer_type, setCustomerType] = useState('')
  const [label, setLabel] = useState('')
  const [registered_since, setRegisteredSince] = useState(toLocalISO(new Date()))

  // Company section
  const [is_company, setIsCompany] = useState(false)
  const [contact_name, setContactName] = useState('')
  const [contact_phone, setContactPhone] = useState('')
  const [contact_email, setContactEmail] = useState('')

  async function loadCatalogs(companyId: string) {
    setLoadingCatalogs(true)
    const [{ data: types }, { data: labels }] = await Promise.all([
      supabase
        .from('customer_types')
        .select('id, name, color')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('name', { ascending: true }),
      supabase
        .from('customer_labels')
        .select('id, name, color')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('name', { ascending: true }),
    ])
    setCustomerTypes(types ?? [])
    setCustomerLabels(labels ?? [])
    setLoadingCatalogs(false)
  }

  async function handleOpen() {
    setOpen(true)
    // Get company_id to load catalogs
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: userRow } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()
    if (userRow?.company_id) {
      loadCatalogs(userRow.company_id)
    }
  }

  function resetForm() {
    setFullName('')
    setIdType('cedula')
    setTaxId('')
    setPhone('')
    setEmail('')
    setAddress('')
    setCustomerType('')
    setLabel('')
    setRegisteredSince(toLocalISO(new Date()))
    setIsCompany(false)
    setContactName('')
    setContactPhone('')
    setContactEmail('')
    setError(null)
    setSuccess(false)
    setFieldErrors({})
  }

  function setFieldError(field: string, msg: string | null) {
    setFieldErrors((prev) => {
      const next = { ...prev }
      if (msg) next[field] = msg
      else delete next[field]
      return next
    })
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

    const { data: { user } } = await supabase.auth.getUser()
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

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loading])

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
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
            overflowY: 'auto',
            padding: '16px 0',
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
                  marginBottom: 12,
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
              {/* ── Sección: Identificación ── */}
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
                    <label htmlFor="nc-full_name" style={labelStyle}>
                      Nombre completo *
                    </label>
                    <input
                      id="nc-full_name"
                      type="text"
                      required
                      value={full_name}
                      onChange={(e) => { setFullName(e.target.value); setFieldError('full_name', null) }}
                      placeholder="Nombre completo"
                      style={{ ...inputStyle, borderColor: fieldErrors.full_name ? 'rgba(220,38,38,0.6)' : undefined }}
                      onFocus={onFocus}
                      onBlur={(e) => { onBlur(e); if (!e.target.value.trim()) setFieldError('full_name', 'El nombre completo es obligatorio') }}
                    />
                    {fieldErrors.full_name && <p style={{ marginTop: 3, fontSize: 11, color: 'var(--red)' }}>{fieldErrors.full_name}</p>}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                    <div>
                      <label htmlFor="nc-id_type" style={labelStyle}>
                        Tipo de ID *
                      </label>
                      <select
                        id="nc-id_type"
                        value={id_type}
                        onChange={(e) => { setIdType(e.target.value as 'cedula' | 'ruc' | 'pasaporte' | 'ruc_extranjero'); setTaxId(''); setFieldError('tax_id', null) }}
                        style={inputStyle}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      >
                        <option value="cedula">Cédula (10 dígitos)</option>
                        <option value="ruc">RUC (13 dígitos)</option>
                        <option value="pasaporte">Pasaporte (6-20 chars)</option>
                        <option value="ruc_extranjero">RUC extranjero (5-30 chars)</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="nc-tax_id" style={labelStyle}>
                        Número de ID *
                      </label>
                      <input
                        id="nc-tax_id"
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

              {/* ── Sección: Contacto ── */}
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
                    <label htmlFor="nc-phone" style={labelStyle}>
                      Teléfono *
                    </label>
                    <PhoneInput
                      id="nc-phone"
                      value={phone}
                      onChange={(v) => { setPhone(v); setFieldError('phone', null) }}
                      required
                    />
                    {fieldErrors.phone && <p style={{ marginTop: 3, fontSize: 11, color: 'var(--red)' }}>{fieldErrors.phone}</p>}
                  </div>

                  <div>
                    <label htmlFor="nc-email" style={labelStyle}>
                      Email *
                    </label>
                    <input
                      id="nc-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setFieldError('email', null) }}
                      placeholder="cliente@empresa.com"
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
                    <label htmlFor="nc-address" style={labelStyle}>
                      Dirección
                    </label>
                    <textarea
                      id="nc-address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Calle, número, ciudad…"
                      rows={2}
                      style={{
                        ...inputStyle,
                        resize: 'vertical',
                        minHeight: 52,
                      }}
                      onFocus={onFocus}
                      onBlur={onBlur}
                    />
                  </div>
                </div>
              </div>

              {/* ── Sección: Clasificación ── */}
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
                    <label htmlFor="nc-customer_type" style={labelStyle}>
                      Tipo de cliente
                    </label>
                    {loadingCatalogs ? (
                      <p style={{ fontSize: 12, color: 'var(--muted)' }}>Cargando…</p>
                    ) : (
                      <select
                        id="nc-customer_type"
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
                    )}
                  </div>

                  <div>
                    <label htmlFor="nc-label" style={labelStyle}>
                      Etiqueta
                    </label>
                    {loadingCatalogs ? (
                      <p style={{ fontSize: 12, color: 'var(--muted)' }}>Cargando…</p>
                    ) : (
                      <select
                        id="nc-label"
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
                    )}
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label htmlFor="nc-registered_since" style={labelStyle}>
                      Cliente desde *
                    </label>
                    <input
                      id="nc-registered_since"
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
                  style={{ width: 16, height: 16, accentColor: 'var(--blue)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                  ¿Es una empresa?
                </span>
                {is_company && (
                  <span
                    style={{
                      fontSize: 10,
                      padding: '2px 7px',
                      borderRadius: 5,
                      background: 'rgba(37,99,235,0.1)',
                      color: 'var(--blue)',
                      fontWeight: 600,
                      marginLeft: 'auto',
                    }}
                  >
                    Empresa
                  </span>
                )}
              </label>

              {/* ── Sección: Contacto de empresa ── */}
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
                    <label htmlFor="nc-contact_name" style={labelStyle}>
                      Persona de contacto
                    </label>
                    <input
                      id="nc-contact_name"
                      type="text"
                      value={contact_name}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Nombre del contacto"
                      style={inputStyle}
                      onFocus={onFocus}
                      onBlur={onBlur}
                    />
                  </div>

                  <div>
                    <label htmlFor="nc-contact_phone" style={labelStyle}>
                      Teléfono de contacto
                    </label>
                    <PhoneInput
                      id="nc-contact_phone"
                      value={contact_phone}
                      onChange={setContactPhone}
                    />
                  </div>

                  <div>
                    <label htmlFor="nc-contact_email" style={labelStyle}>
                      Email de contacto
                    </label>
                    <input
                      id="nc-contact_email"
                      type="email"
                      value={contact_email}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="contacto@empresa.com"
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
                  {loading ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
