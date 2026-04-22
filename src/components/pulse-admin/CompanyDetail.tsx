'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ReinviteUserButton from '@/components/settings/ReinviteUserButton'
import { useRouter } from 'next/navigation'
import { PULSE_COMPANY_MODULE_OPTIONS } from '@/lib/pulse-admin/companyModules'
import {
  type CompanyFormValues,
  normalizePlan,
  normalizeStatus,
} from '@/components/pulse-admin/NewCompanyForm'
import type { Json } from '@/lib/supabase/database.types'

type CompanyRow = {
  id: string
  name: string
  tax_id: string | null
  sector: string | null
  plan: string
  status: string
  max_users: number
  allow_user_invites: boolean
  trial_expires_at: string | null
  operational_since: string | null
  pulse_notes: string | null
  active_modules: string[] | null
  metadata: Json | null
  tags: string[] | null
  branch_count: number | null
  created_at: string | null
}

type UserRow = {
  id: string
  full_name: string
  email: string
  role: string
  last_seen_at: string | null
}

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

function roleBadge(role: string) {
  const isAdmin = role === 'admin'
  const isMgr = role === 'manager'
  return {
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 5,
    background: isAdmin
      ? 'rgba(124,58,237,0.1)'
      : isMgr
        ? 'rgba(5,150,105,0.1)'
        : 'rgba(99,102,241,0.1)',
    color: isAdmin ? '#7C3AED' : isMgr ? '#059669' : '#4F46E5',
    border: `1px solid ${isAdmin ? 'rgba(124,58,237,0.2)' : isMgr ? 'rgba(5,150,105,0.2)' : 'rgba(99,102,241,0.2)'}`,
    textTransform: 'capitalize',
  } as React.CSSProperties
}

export default function CompanyDetail({
  company: initial,
  users,
  kpis,
  activeUserCount,
}: {
  company: CompanyRow
  users: UserRow[]
  kpis: {
    totalSales: number
    customerCount: number
    productCount: number
    insightCount: number
  }
  activeUserCount: number
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'general' | 'users' | 'modules' | 'notas'>('general')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [gen, setGen] = useState<CompanyFormValues>({
    name: initial.name,
    tax_id: initial.tax_id ?? '',
    sector: initial.sector ?? '',
    plan: normalizePlan(initial.plan),
    status: normalizeStatus(initial.status),
    max_users: initial.max_users ?? 3,
    allow_user_invites: initial.allow_user_invites ?? true,
    trial_expires_at: initial.trial_expires_at?.slice(0, 10) ?? '',
    operational_since: initial.operational_since?.slice(0, 10) ?? '',
    pulse_notes: initial.pulse_notes ?? '',
  })

  const [notas, setNotas] = useState(initial.pulse_notes ?? '')
  const [modules, setModules] = useState<string[]>(initial.active_modules ?? [])

  const [inviteOpen, setInviteOpen] = useState(false)
  const [aEmail, setAEmail] = useState('')
  const [aName, setAName] = useState('')
  const [aRole, setARole] = useState<'admin' | 'manager' | 'operator'>('operator')
  const [aLoading, setALoading] = useState(false)
  const [aErr, setAErr] = useState<string | null>(null)
  const [reinviteToast, setReinviteToast] = useState<string | null>(null)

  const maxU = initial.max_users ?? 3
  const atLimit = maxU > 0 && activeUserCount >= maxU
  const noUsersAllowed = maxU === 0

  useEffect(() => {
    if (!reinviteToast) return
    const t = setTimeout(() => setReinviteToast(null), 3500)
    return () => clearTimeout(t)
  }, [reinviteToast])

  async function patchBody(body: Record<string, unknown>) {
    setErr(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/pulse-admin/companies/${initial.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setErr(data.error ?? 'Error al guardar')
        return
      }
      router.refresh()
    } catch {
      setErr('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  function saveGeneral(e: React.FormEvent) {
    e.preventDefault()
    if (!gen.name.trim()) {
      setErr('El nombre es obligatorio')
      return
    }
    if (gen.tax_id.trim() && !/^\d{13}$/.test(gen.tax_id.trim())) {
      setErr('RUC: 13 dígitos')
      return
    }
    patchBody({
      name: gen.name.trim(),
      tax_id: gen.tax_id.trim() || null,
      sector: gen.sector.trim() || null,
      plan: gen.plan,
      status: gen.status,
      max_users: gen.max_users,
      allow_user_invites: gen.allow_user_invites,
      trial_expires_at: gen.trial_expires_at || null,
      operational_since: gen.operational_since || null,
    })
  }

  function saveNotas() {
    patchBody({ pulse_notes: notas || null })
  }

  function saveModules() {
    patchBody({ active_modules: modules.length ? modules : [] })
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    setAErr(null)
    setALoading(true)
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: aEmail.trim(),
          full_name: aName.trim(),
          role: aRole,
          company_id: initial.id,
          is_pulse_admin_creating: true,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setAErr(data.error ?? 'Error')
        return
      }
      setInviteOpen(false)
      setAEmail('')
      setAName('')
      setARole('operator')
      router.refresh()
    } catch {
      setAErr('Error de conexión')
    } finally {
      setALoading(false)
    }
  }

  function toggleModule(id: string) {
    setModules((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const money = new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(kpis.totalSales)

  const tabs: { id: typeof tab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'users', label: 'Usuarios' },
    { id: 'modules', label: 'Módulos' },
    { id: 'notas', label: 'Notas' },
  ]

  return (
    <div style={{ padding: '14px 16px', maxWidth: 960, position: 'relative' }}>
      {reinviteToast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 200,
            background: 'rgba(5,150,105,0.12)',
            border: '1px solid rgba(5,150,105,0.3)',
            color: 'var(--green)',
            padding: '10px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          {reinviteToast}
        </div>
      )}
      <Link
        href="/pulse-admin/companies"
        style={{ fontSize: 12, color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}
      >
        ← Volver a empresas
      </Link>
      <h1
        className="font-syne font-bold"
        style={{ fontSize: 20, color: 'var(--text)', marginTop: 10, marginBottom: 4 }}
      >
        {initial.name}
      </h1>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
        ID {initial.id}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 10,
          marginBottom: 18,
        }}
      >
        {[
          { label: 'Ventas totales', value: money },
          { label: 'Clientes', value: String(kpis.customerCount) },
          { label: 'Productos', value: String(kpis.productCount) },
          { label: 'Insights generados', value: String(kpis.insightCount) },
        ].map((k) => (
          <div
            key={k.label}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 12,
            }}
          >
            <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              {k.label}
            </div>
            <div className="font-syne font-bold" style={{ fontSize: 18, color: 'var(--text)' }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: '1px solid var(--border)' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="font-syne"
            style={{
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? 'var(--text)' : 'var(--muted)',
              background: tab === t.id ? 'var(--card)' : 'transparent',
              border: '1px solid',
              borderColor: tab === t.id ? 'var(--border)' : 'transparent',
              borderBottom: tab === t.id ? '1px solid var(--card)' : 'none',
              marginBottom: -1,
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {err && (
        <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{err}</p>
      )}

      {tab === 'general' && (
        <form
          onSubmit={saveGeneral}
          style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 520 }}
        >
          <div>
            <label style={labelStyle}>Nombre de la empresa</label>
            <input
              value={gen.name}
              onChange={(e) => setGen((g) => ({ ...g, name: e.target.value }))}
              style={inputStyle}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>RUC (13 dígitos)</label>
            <input
              value={gen.tax_id}
              onChange={(e) => setGen((g) => ({ ...g, tax_id: e.target.value.replace(/\D/g, '').slice(0, 13) }))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Sector</label>
            <input
              value={gen.sector}
              onChange={(e) => setGen((g) => ({ ...g, sector: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={labelStyle}>Plan</label>
              <select
                value={gen.plan}
                onChange={(e) => setGen((g) => ({ ...g, plan: e.target.value }))}
                style={inputStyle}
              >
                <option value="trial">Trial</option>
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="pro">Pro</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Estado</label>
              <select
                value={gen.status}
                onChange={(e) => setGen((g) => ({ ...g, status: e.target.value }))}
                style={inputStyle}
              >
                <option value="trial">Trial</option>
                <option value="active">Activo</option>
                <option value="suspended">Suspendido</option>
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Máximo de usuarios</label>
            <input
              type="number"
              min={0}
              value={gen.max_users}
              onChange={(e) => setGen((g) => ({ ...g, max_users: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
              style={inputStyle}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)' }}>
            <input
              type="checkbox"
              checked={gen.allow_user_invites}
              onChange={(e) => setGen((g) => ({ ...g, allow_user_invites: e.target.checked }))}
            />
            Permitir invitar usuarios
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={labelStyle}>Expira (trial)</label>
              <input
                type="date"
                value={gen.trial_expires_at}
                onChange={(e) => setGen((g) => ({ ...g, trial_expires_at: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Operando desde</label>
              <input
                type="date"
                value={gen.operational_since}
                onChange={(e) => setGen((g) => ({ ...g, operational_since: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Sucursales (referencia)</label>
            <input
              type="number"
              min={0}
              value={initial.branch_count ?? ''}
              readOnly
              style={{ ...inputStyle, opacity: 0.7 }}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="font-syne font-bold"
            style={{
              alignSelf: 'flex-start',
              marginTop: 6,
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #F5C842, #F09A1A)',
              color: '#1A1B2E',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Guardando…' : 'Guardar general'}
          </button>
        </form>
      )}

      {tab === 'users' && (
        <div>
          {noUsersAllowed ? (
            <p style={{ color: 'var(--red)', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
              Empresa sin acceso a usuarios (límite 0)
            </p>
          ) : (
            <p style={{ fontSize: 12, color: atLimit ? 'var(--red)' : 'var(--text2)', marginBottom: 12 }}>
              <strong>
                {activeUserCount} de {maxU} usuarios activos
              </strong>
              {atLimit && ' — Límite alcanzado. Aumenta el máximo en la pestaña General o contacta a comercial.'}
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={labelStyle}>Miembros</span>
            <button
              type="button"
              onClick={() => {
                setInviteOpen(true)
                setAErr(null)
                setARole('operator')
              }}
              className="font-syne font-bold"
              style={{
                fontSize: 11,
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              + Invitar usuario
            </button>
          </div>
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              overflow: 'auto',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Nombre', 'Email', 'Rol', 'Última actividad', 'Acciones'].map((h) => (
                    <th
                      key={h}
                      style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--muted)', fontSize: 9, textTransform: 'uppercase' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 16, color: 'var(--muted)' }}>
                      No hay usuarios
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const pending = !u.last_seen_at
                    return (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 10px' }}>{u.full_name}</td>
                      <td style={{ padding: '8px 10px' }}>{u.email}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={roleBadge(u.role)}>{u.role}</span>
                      </td>
                      <td style={{ padding: '8px 10px', color: 'var(--muted)' }}>
                        {u.last_seen_at
                          ? u.last_seen_at.slice(0, 16).replace('T', ' ')
                          : '—'}
                        {pending && (
                          <span
                            style={{
                              display: 'inline-block',
                              marginLeft: 8,
                              fontSize: 10,
                              fontWeight: 600,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: 'rgba(217,119,6,0.12)',
                              color: '#B45309',
                              border: '1px solid rgba(217,119,6,0.2)',
                            }}
                          >
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', verticalAlign: 'middle' }}>
                        {pending ? (
                          <ReinviteUserButton
                            userId={u.id}
                            email={u.email}
                            onReinvited={() => setReinviteToast('Invitación reenviada correctamente')}
                          />
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'modules' && (
        <div style={{ maxWidth: 480 }}>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
            Activa o desactiva módulos disponibles para esta empresa.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {PULSE_COMPANY_MODULE_OPTIONS.map((m) => (
              <label
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 13,
                  color: 'var(--text)',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={modules.includes(m.id)}
                  onChange={() => toggleModule(m.id)}
                />
                {m.label} <span style={{ fontSize: 10, color: 'var(--muted)' }}>({m.id})</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={saveModules}
            disabled={saving}
            className="font-syne font-bold"
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #F5C842, #F09A1A)',
              color: '#1A1B2E',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Guardando…' : 'Guardar módulos'}
          </button>
        </div>
      )}

      {tab === 'notas' && (
        <div style={{ maxWidth: 520 }}>
          <label style={labelStyle}>Notas internas de Pulse</label>
          <textarea
            rows={8}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            style={{ ...inputStyle, minHeight: 160, resize: 'vertical' as const }}
          />
          <button
            type="button"
            onClick={saveNotas}
            disabled={saving}
            className="font-syne font-bold"
            style={{
              marginTop: 10,
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #F5C842, #F09A1A)',
              color: '#1A1B2E',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Guardando…' : 'Guardar notas'}
          </button>
        </div>
      )}

      {inviteOpen && (
        <div
          role="dialog"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)',
            padding: 16,
          }}
          onClick={() => setInviteOpen(false)}
        >
          <form
            onSubmit={sendInvite}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 20,
              width: '100%',
              maxWidth: 400,
            }}
          >
            <h3 className="font-syne font-bold" style={{ fontSize: 15, marginBottom: 6 }}>
              Invitar usuario
            </h3>
            {aErr && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{aErr}</p>}
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Nombre completo</label>
              <input
                required
                value={aName}
                onChange={(e) => setAName(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                required
                value={aEmail}
                onChange={(e) => setAEmail(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Rol</label>
              <select
                value={aRole}
                onChange={(e) =>
                  setARole(e.target.value as 'admin' | 'manager' | 'operator')
                }
                style={inputStyle}
              >
                <option value="admin">Administrador</option>
                <option value="manager">Gerente</option>
                <option value="operator">Operativo</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid var(--border)' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={aLoading}
                className="font-syne font-bold"
                style={{
                  flex: 1,
                  padding: 8,
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
                  color: '#fff',
                }}
              >
                {aLoading ? 'Enviando…' : 'Invitar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
