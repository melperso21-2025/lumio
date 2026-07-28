'use client'

import { useState } from 'react'

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

const VALID_PLAN_SLUGS = new Set(['trial', 'basic', 'standard', 'pro'])
const VALID_STATUS_SLUGS = new Set(['trial', 'active', 'suspended'])

export function normalizePlan(p: string | undefined) {
  return p && VALID_PLAN_SLUGS.has(p) ? p : 'trial'
}

export function normalizeStatus(s: string | undefined) {
  return s && VALID_STATUS_SLUGS.has(s) ? s : 'trial'
}

export type CompanyFormValues = {
  name: string
  tax_id: string
  sector: string
  plan: string
  status: string
  max_users: number
  allow_user_invites: boolean
  trial_expires_at: string
  operational_since: string
  pulse_notes: string
}

const empty: CompanyFormValues = {
  name: '',
  tax_id: '',
  sector: '',
  plan: 'trial',
  status: 'trial',
  max_users: 3,
  allow_user_invites: true,
  trial_expires_at: '',
  operational_since: '',
  pulse_notes: '',
}

export type NewCompanyFormProps = {
  mode: 'create' | 'edit'
  initial?: Partial<CompanyFormValues> & { id?: string }
  onClose: () => void
  onSuccess: () => void
}

export default function NewCompanyForm({
  mode,
  initial,
  onClose,
  onSuccess,
}: NewCompanyFormProps) {
  const [v, setV] = useState<CompanyFormValues>(() => ({
    ...empty,
    ...initial,
    name: initial?.name ?? '',
    tax_id: initial?.tax_id ?? '',
    sector: initial?.sector ?? '',
    plan: normalizePlan(initial?.plan),
    status: normalizeStatus(initial?.status),
    max_users: initial?.max_users ?? 3,
    allow_user_invites: initial?.allow_user_invites ?? true,
    trial_expires_at: initial?.trial_expires_at?.slice(0, 10) ?? '',
    operational_since: initial?.operational_since?.slice(0, 10) ?? '',
    pulse_notes: initial?.pulse_notes ?? '',
  }))
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    e.target.style.borderColor = 'var(--gold)'
    e.target.style.boxShadow = '0 0 0 3px var(--gold-bg)'
  }
  function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    e.target.style.borderColor = 'var(--border2)'
    e.target.style.boxShadow = 'none'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!v.name.trim()) {
      setError('El nombre de la empresa es obligatorio')
      return
    }
    if (v.tax_id.trim() && !/^\d{13}$/.test(v.tax_id.trim())) {
      setError('El RUC debe tener exactamente 13 dígitos')
      return
    }
    if (mode === 'create') {
      if (!adminName.trim()) {
        setError('El nombre completo del administrador es obligatorio')
        return
      }
      if (!adminEmail.trim()) {
        setError('El email del administrador es obligatorio')
        return
      }
    }

    setLoading(true)
    try {
      if (mode === 'create') {
        const res = await fetch('/api/pulse-admin/companies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: v.name.trim(),
            tax_id: v.tax_id.trim() || null,
            sector: v.sector.trim() || null,
            plan: v.plan,
            status: v.status,
            max_users: v.max_users,
            allow_user_invites: v.allow_user_invites,
            trial_expires_at: v.trial_expires_at || null,
            operational_since: v.operational_since || null,
            pulse_notes: v.pulse_notes || null,
          }),
        })
        const data = (await res.json()) as {
          error?: string
          company?: { id: string }
        }
        if (!res.ok) {
          setError(data.error ?? 'Error al crear')
          setLoading(false)
          return
        }
        const companyId = data.company?.id
        if (!companyId) {
          setError('No se pudo obtener el ID de la empresa creada')
          setLoading(false)
          return
        }
        const invRes = await fetch('/api/users/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: adminEmail.trim(),
            full_name: adminName.trim(),
            role: 'admin',
            company_id: companyId,
            is_pulse_admin_creating: true,
          }),
        })
        const invData = (await invRes.json()) as { error?: string }
        if (!invRes.ok) {
          setError(
            invData.error ??
              'La empresa se creó, pero falló el envío de la invitación al administrador.'
          )
          setLoading(false)
          return
        }
      } else if (mode === 'edit' && initial?.id) {
        const res = await fetch(
          `/api/pulse-admin/companies/${initial.id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: v.name.trim(),
              tax_id: v.tax_id.trim() || null,
              sector: v.sector.trim() || null,
              plan: v.plan,
              status: v.status,
              max_users: v.max_users,
              allow_user_invites: v.allow_user_invites,
              trial_expires_at: v.trial_expires_at || null,
              operational_since: v.operational_since || null,
              pulse_notes: v.pulse_notes || null,
            }),
          }
        )
        const data = (await res.json()) as { error?: string }
        if (!res.ok) {
          setError(data.error ?? 'Error al guardar')
          setLoading(false)
          return
        }
      }
      onSuccess()
      onClose()
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '72vh', overflowY: 'auto', paddingRight: 4 }}
    >
      {error && (
        <div
          style={{
            background: 'rgba(220,38,38,0.06)',
            border: '1px solid rgba(220,38,38,0.2)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
            color: 'var(--red)',
          }}
        >
          {error}
        </div>
      )}

      <div>
        <label htmlFor="c-name" style={labelStyle}>
          Nombre de la empresa
        </label>
        <input
          id="c-name"
          required
          value={v.name}
          onChange={(e) => setV((p) => ({ ...p, name: e.target.value }))}
          style={inputStyle}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </div>
      <div>
        <label htmlFor="c-tax" style={labelStyle}>
          RUC de la empresa (13 dígitos)
        </label>
        <input
          id="c-tax"
          inputMode="numeric"
          maxLength={13}
          value={v.tax_id}
          onChange={(e) => setV((p) => ({ ...p, tax_id: e.target.value.replace(/\D/g, '').slice(0, 13) }))}
          style={inputStyle}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="1799999999001"
        />
      </div>
      <div>
        <label htmlFor="c-sector" style={labelStyle}>
          Sector / industria
        </label>
        <input
          id="c-sector"
          value={v.sector}
          onChange={(e) => setV((p) => ({ ...p, sector: e.target.value }))}
          style={inputStyle}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label htmlFor="c-plan" style={labelStyle}>
            Plan
          </label>
          <select
            id="c-plan"
            value={v.plan}
            onChange={(e) => setV((p) => ({ ...p, plan: e.target.value }))}
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          >
            <option value="trial">Trial</option>
            <option value="basic">Basic</option>
            <option value="standard">Standard</option>
            <option value="pro">Pro</option>
          </select>
        </div>
        <div>
          <label htmlFor="c-status" style={labelStyle}>
            Estado
          </label>
          <select
            id="c-status"
            value={v.status}
            onChange={(e) => setV((p) => ({ ...p, status: e.target.value }))}
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          >
            <option value="trial">Trial</option>
            <option value="active">Activo</option>
            <option value="suspended">Suspendido</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="c-max" style={labelStyle}>
          Máximo de usuarios
        </label>
        <input
          id="c-max"
          type="number"
          min={0}
          value={v.max_users}
          onChange={(e) => setV((p) => ({ ...p, max_users: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
          style={inputStyle}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        <p style={{ fontSize: 10, color: 'var(--muted)', margin: '4px 0 0' }}>
          0 = no puede crear usuarios. Por defecto 3.
        </p>
      </div>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          color: 'var(--text2)',
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={v.allow_user_invites}
          onChange={(e) => setV((p) => ({ ...p, allow_user_invites: e.target.checked }))}
        />
        Permitir invitar usuarios
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label htmlFor="c-trial" style={labelStyle}>
            Expira el (trial)
          </label>
          <input
            id="c-trial"
            type="date"
            value={v.trial_expires_at}
            onChange={(e) => setV((p) => ({ ...p, trial_expires_at: e.target.value }))}
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </div>
        <div>
          <label htmlFor="c-op" style={labelStyle}>
            Operando desde
          </label>
          <input
            id="c-op"
            type="date"
            value={v.operational_since}
            onChange={(e) => setV((p) => ({ ...p, operational_since: e.target.value }))}
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </div>
      </div>

      {mode === 'create' && (
        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 12,
            background: 'var(--hover)',
          }}
        >
          <div
            className="font-syne font-bold"
            style={{ fontSize: 12, color: 'var(--text)', marginBottom: 10 }}
          >
            Usuario administrador
          </div>
          <div style={{ marginBottom: 10 }}>
            <label htmlFor="c-admin-name" style={labelStyle}>
              Nombre completo del admin
            </label>
            <input
              id="c-admin-name"
              type="text"
              required
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>
          <div>
            <label htmlFor="c-admin-email" style={labelStyle}>
              Email del admin
            </label>
            <input
              id="c-admin-email"
              type="email"
              required
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>
        </div>
      )}

      <div>
        <label htmlFor="c-notes" style={labelStyle}>
          Notas internas de Pulse
        </label>
        <textarea
          id="c-notes"
          rows={3}
          value={v.pulse_notes}
          onChange={(e) => setV((p) => ({ ...p, pulse_notes: e.target.value }))}
          style={{ ...inputStyle, minHeight: 72, resize: 'vertical' as const }}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4, flexShrink: 0 }}>
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: 8,
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
            background: loading
              ? 'rgba(232,165,0,0.5)'
              : 'linear-gradient(135deg, #F5C842, #F09A1A)',
            color: '#1A1B2E',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Guardando…' : mode === 'create' ? 'Crear empresa' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
