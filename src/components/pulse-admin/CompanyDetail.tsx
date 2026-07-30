'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
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
  deleted_at: string | null
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

const ROLES = [
  {
    id: 'admin' as const,
    label: 'Administrador',
    desc: 'Acceso total. Puede invitar usuarios y configurar la empresa.',
    color: '#7C3AED',
    bg: 'rgba(124,58,237,0.08)',
    border: 'rgba(124,58,237,0.25)',
  },
  {
    id: 'manager' as const,
    label: 'Gerente',
    desc: 'Acceso a reportes y operaciones. Sin configuración.',
    color: '#059669',
    bg: 'rgba(5,150,105,0.08)',
    border: 'rgba(5,150,105,0.25)',
  },
  {
    id: 'operator' as const,
    label: 'Operativo',
    desc: 'Solo ingreso de datos y consulta básica.',
    color: '#4F46E5',
    bg: 'rgba(79,70,229,0.08)',
    border: 'rgba(79,70,229,0.25)',
  },
]

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

function roleColor(role: string) {
  return ROLES.find((r) => r.id === role) ?? ROLES[2]
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'Ahora mismo'
  if (mins < 60) return `Hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Hace ${hrs} h`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Ayer'
  if (days < 30) return `Hace ${days} días`
  const months = Math.floor(days / 30)
  return `Hace ${months} mes${months > 1 ? 'es' : ''}`
}

export default function CompanyDetail({
  company: initial,
  users: initialUsers,
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
  const [users, setUsers] = useState<UserRow[]>(initialUsers)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

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

  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false)
  const [aEmail, setAEmail] = useState('')
  const [aName, setAName] = useState('')
  const [aJobTitle, setAJobTitle] = useState('')
  const [aRole, setARole] = useState<'admin' | 'manager' | 'operator'>('operator')
  const [aLoading, setALoading] = useState(false)
  const [aErr, setAErr] = useState<string | null>(null)
  const [aSuccess, setASuccess] = useState(false)

  const [suspendingUserId, setSuspendingUserId] = useState<string | null>(null)
  const [reinvitingId, setReinvitingId] = useState<string | null>(null)

  const maxU = initial.max_users ?? 3
  const activeCount = users.filter((u) => !u.deleted_at).length
  const capacityPct = maxU > 0 ? Math.min(100, Math.round((activeCount / maxU) * 100)) : 0
  const atLimit = maxU > 0 && activeCount >= maxU

  const showToast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  // Close invite modal on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setInviteOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function toggleSuspendUser(userId: string, suspend: boolean) {
    setSuspendingUserId(userId)
    try {
      const res = await fetch(`/api/pulse-admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspend }),
      })
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, deleted_at: suspend ? new Date().toISOString() : null }
              : u
          )
        )
        showToast(suspend ? 'Usuario suspendido' : 'Usuario reactivado')
      }
    } finally {
      setSuspendingUserId(null)
    }
  }

  async function reinviteUser(u: UserRow) {
    setReinvitingId(u.id)
    try {
      const res = await fetch('/api/users/reinvite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id, email: u.email }),
      })
      if (res.ok) showToast('Invitación reenviada a ' + u.email)
      else showToast('No se pudo reenviar la invitación', 'err')
    } finally {
      setReinvitingId(null)
    }
  }

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
      if (!res.ok) { setErr(data.error ?? 'Error al guardar'); return }
      showToast('Guardado correctamente')
      router.refresh()
    } catch {
      setErr('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  function saveGeneral(e: React.FormEvent) {
    e.preventDefault()
    if (!gen.name.trim()) { setErr('El nombre es obligatorio'); return }
    if (gen.tax_id.trim() && !/^\d{13}$/.test(gen.tax_id.trim())) { setErr('RUC: 13 dígitos'); return }
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

  function openInvite() {
    setAEmail(''); setAName(''); setAJobTitle(''); setARole('operator')
    setAErr(null); setASuccess(false)
    setInviteOpen(true)
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
          job_title: aJobTitle.trim() || null,
          role: aRole,
          company_id: initial.id,
          is_pulse_admin_creating: true,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) { setAErr(data.error ?? 'Error'); return }
      setASuccess(true)
      // Optimistic update: add user to list as pending
      setUsers((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          full_name: aName.trim(),
          email: aEmail.trim(),
          role: aRole,
          last_seen_at: null,
          deleted_at: null,
        },
      ])
      setTimeout(() => {
        setInviteOpen(false)
        showToast('Invitación enviada a ' + aEmail.trim())
        router.refresh()
      }, 1400)
    } catch {
      setAErr('Error de conexión')
    } finally {
      setALoading(false)
    }
  }

  function toggleModule(id: string) {
    setModules((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const money = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(kpis.totalSales)

  const tabs: { id: typeof tab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'users', label: `Usuarios (${activeCount}/${maxU})` },
    { id: 'modules', label: 'Módulos' },
    { id: 'notas', label: 'Notas' },
  ]

  return (
    <div style={{ padding: '14px 16px', maxWidth: 960, position: 'relative' }}>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed', top: 20, right: 20, zIndex: 200,
            background: toast.type === 'ok' ? 'rgba(5,150,105,0.12)' : 'rgba(220,38,38,0.12)',
            border: `1px solid ${toast.type === 'ok' ? 'rgba(5,150,105,0.3)' : 'rgba(220,38,38,0.3)'}`,
            color: toast.type === 'ok' ? 'var(--green)' : 'var(--red)',
            padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <span>{toast.type === 'ok' ? '✓' : '✕'}</span>
          {toast.msg}
        </div>
      )}

      <Link href="/pulse-admin/companies" style={{ fontSize: 12, color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>
        ← Volver a empresas
      </Link>
      <h1 className="font-syne font-bold" style={{ fontSize: 20, color: 'var(--text)', marginTop: 10, marginBottom: 2 }}>
        {initial.name}
      </h1>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>ID {initial.id}</p>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'Ventas totales', value: money, icon: '💰' },
          { label: 'Clientes', value: String(kpis.customerCount), icon: '🤝' },
          { label: 'Productos', value: String(kpis.productCount), icon: '📦' },
          { label: 'Insights IA', value: String(kpis.insightCount), icon: '✨' },
        ].map((k) => (
          <div key={k.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>{k.icon} {k.label}</div>
            <div className="font-syne font-bold" style={{ fontSize: 18, color: 'var(--text)' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: '1px solid var(--border)' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="font-syne"
            style={{
              padding: '8px 14px', fontSize: 12,
              fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? 'var(--text)' : 'var(--muted)',
              background: tab === t.id ? 'var(--card)' : 'transparent',
              border: '1px solid', borderColor: tab === t.id ? 'var(--border)' : 'transparent',
              borderBottom: tab === t.id ? '1px solid var(--card)' : 'none',
              marginBottom: -1, borderRadius: '8px 8px 0 0', cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {err && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{err}</p>}

      {/* ── GENERAL ── */}
      {tab === 'general' && (
        <form onSubmit={saveGeneral} style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 520 }}>
          <div>
            <label style={labelStyle}>Nombre de la empresa</label>
            <input value={gen.name} onChange={(e) => setGen((g) => ({ ...g, name: e.target.value }))} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>RUC (13 dígitos)</label>
            <input value={gen.tax_id} onChange={(e) => setGen((g) => ({ ...g, tax_id: e.target.value.replace(/\D/g, '').slice(0, 13) }))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Sector</label>
            <input value={gen.sector} onChange={(e) => setGen((g) => ({ ...g, sector: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={labelStyle}>Plan</label>
              <select value={gen.plan} onChange={(e) => setGen((g) => ({ ...g, plan: e.target.value }))} style={inputStyle}>
                <option value="trial">Trial</option>
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="pro">Pro</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Estado</label>
              <select value={gen.status} onChange={(e) => setGen((g) => ({ ...g, status: e.target.value }))} style={inputStyle}>
                <option value="trial">Trial</option>
                <option value="active">Activo</option>
                <option value="suspended">Suspendido</option>
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Máximo de usuarios</label>
            <input type="number" min={0} value={gen.max_users} onChange={(e) => setGen((g) => ({ ...g, max_users: Math.max(0, parseInt(e.target.value, 10) || 0) }))} style={inputStyle} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)' }}>
            <input type="checkbox" checked={gen.allow_user_invites} onChange={(e) => setGen((g) => ({ ...g, allow_user_invites: e.target.checked }))} />
            Permitir invitar usuarios
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={labelStyle}>Expira (trial)</label>
              <input type="date" value={gen.trial_expires_at} onChange={(e) => setGen((g) => ({ ...g, trial_expires_at: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Operando desde</label>
              <input type="date" value={gen.operational_since} onChange={(e) => setGen((g) => ({ ...g, operational_since: e.target.value }))} style={inputStyle} />
            </div>
          </div>
          <button type="submit" disabled={saving} className="font-syne font-bold"
            style={{ alignSelf: 'flex-start', marginTop: 6, padding: '8px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#F5C842,#F09A1A)', color: '#1A1B2E', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Guardando…' : 'Guardar general'}
          </button>
        </form>
      )}

      {/* ── USERS ── */}
      {tab === 'users' && (
        <div>
          {/* Capacity bar */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <span className="font-syne font-bold" style={{ fontSize: 14, color: 'var(--text)' }}>
                  {activeCount} <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 12 }}>de {maxU} slots usados</span>
                </span>
                {atLimit && (
                  <span style={{ marginLeft: 10, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: 'rgba(220,38,38,0.1)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)' }}>
                    LÍMITE ALCANZADO
                  </span>
                )}
              </div>
              <button type="button" onClick={openInvite}
                className="font-syne font-bold"
                style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Invitar usuario
              </button>
            </div>
            {/* Progress bar */}
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3, transition: 'width 0.4s ease',
                width: `${capacityPct}%`,
                background: capacityPct >= 100 ? '#DC2626' : capacityPct >= 75 ? '#F97316' : 'linear-gradient(90deg,#7C3AED,#4F46E5)',
              }} />
            </div>
          </div>

          {/* Users list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {users.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                No hay usuarios en esta empresa
              </div>
            ) : (
              users.map((u) => {
                const rc = roleColor(u.role)
                const isSuspended = !!u.deleted_at
                const isPending = !u.last_seen_at && !isSuspended
                const initials = getInitials(u.full_name)
                return (
                  <div
                    key={u.id}
                    style={{
                      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
                      padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12,
                      opacity: isSuspended ? 0.65 : 1,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: rc.bg, border: `1.5px solid ${rc.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: rc.color, letterSpacing: '-0.3px',
                    }}>
                      {initials || '?'}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span className="font-syne" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                          {u.full_name}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 4,
                          background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`,
                          textTransform: 'capitalize',
                        }}>
                          {rc.label}
                        </span>
                        {isSuspended && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 4, background: 'rgba(220,38,38,0.1)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)' }}>
                            SUSPENDIDO
                          </span>
                        )}
                        {isPending && (
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 4, background: 'rgba(217,119,6,0.1)', color: '#B45309', border: '1px solid rgba(217,119,6,0.2)' }}>
                            Pendiente activación
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, display: 'flex', gap: 10 }}>
                        <span>{u.email}</span>
                        {u.last_seen_at && (
                          <span style={{ color: 'var(--border2)' }}>·</span>
                        )}
                        {u.last_seen_at && (
                          <span>Visto {relativeTime(u.last_seen_at)}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                      {isPending && (
                        <button
                          type="button"
                          disabled={reinvitingId === u.id}
                          onClick={() => reinviteUser(u)}
                          style={{
                            fontSize: 11, padding: '4px 10px', borderRadius: 6,
                            border: '1px solid rgba(217,119,6,0.3)', background: 'rgba(217,119,6,0.08)',
                            color: '#B45309', cursor: reinvitingId === u.id ? 'not-allowed' : 'pointer',
                            opacity: reinvitingId === u.id ? 0.5 : 1, whiteSpace: 'nowrap', fontWeight: 600,
                          }}
                        >
                          {reinvitingId === u.id ? '…' : '↻ Reenviar'}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={suspendingUserId === u.id}
                        onClick={() => toggleSuspendUser(u.id, !isSuspended)}
                        style={{
                          fontSize: 11, padding: '4px 10px', borderRadius: 6, fontWeight: 600,
                          border: isSuspended ? '1px solid rgba(5,150,105,0.3)' : '1px solid rgba(220,38,38,0.25)',
                          background: isSuspended ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.05)',
                          color: isSuspended ? 'var(--green)' : 'var(--red)',
                          cursor: suspendingUserId === u.id ? 'not-allowed' : 'pointer',
                          opacity: suspendingUserId === u.id ? 0.5 : 1, whiteSpace: 'nowrap',
                        }}
                      >
                        {suspendingUserId === u.id ? '…' : isSuspended ? '✓ Reactivar' : 'Suspender'}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ── MODULES ── */}
      {tab === 'modules' && (
        <div style={{ maxWidth: 480 }}>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
            Activa o desactiva módulos disponibles para esta empresa.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {PULSE_COMPANY_MODULE_OPTIONS.map((m) => (
              <label key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text)',
                padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--card)', cursor: 'pointer',
              }}>
                <input type="checkbox" checked={modules.includes(m.id)} onChange={() => toggleModule(m.id)} />
                {m.label} <span style={{ fontSize: 10, color: 'var(--muted)' }}>({m.id})</span>
              </label>
            ))}
          </div>
          <button type="button" onClick={() => patchBody({ active_modules: modules.length ? modules : [] })} disabled={saving} className="font-syne font-bold"
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#F5C842,#F09A1A)', color: '#1A1B2E', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Guardando…' : 'Guardar módulos'}
          </button>
        </div>
      )}

      {/* ── NOTAS ── */}
      {tab === 'notas' && (
        <div style={{ maxWidth: 520 }}>
          <label style={labelStyle}>Notas internas de Pulse</label>
          <textarea rows={8} value={notas} onChange={(e) => setNotas(e.target.value)}
            style={{ ...inputStyle, minHeight: 160, resize: 'vertical' as const }} />
          <button type="button" onClick={() => patchBody({ pulse_notes: notas || null })} disabled={saving} className="font-syne font-bold"
            style={{ marginTop: 10, padding: '8px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#F5C842,#F09A1A)', color: '#1A1B2E', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Guardando…' : 'Guardar notas'}
          </button>
        </div>
      )}

      {/* ── INVITE MODAL ── */}
      {inviteOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.55)', padding: 16, backdropFilter: 'blur(4px)',
          }}
          onClick={() => setInviteOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 14, width: '100%', maxWidth: 440,
              boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
              overflow: 'hidden',
            }}
          >
            {/* Modal header */}
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="font-syne font-bold" style={{ fontSize: 15, margin: 0, color: 'var(--text)' }}>
                  Invitar usuario
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--muted)' }}>
                  {initial.name} · {activeCount}/{maxU} slots
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: 4 }}
              >
                ×
              </button>
            </div>

            {aSuccess ? (
              /* Success state */
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✉️</div>
                <p className="font-syne font-bold" style={{ fontSize: 15, color: 'var(--text)', margin: '0 0 4px' }}>
                  Invitación enviada
                </p>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {aEmail} recibirá un correo para activar su cuenta.
                </p>
              </div>
            ) : (
              <form onSubmit={sendInvite} style={{ padding: '16px 20px 20px' }}>
                {aErr && (
                  <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 7, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: 'var(--red)', fontSize: 12 }}>
                    {aErr}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Nombre completo</label>
                    <input required value={aName} onChange={(e) => setAName(e.target.value)} style={inputStyle} placeholder="Ej: María García" autoFocus />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Correo electrónico</label>
                    <input type="email" required value={aEmail} onChange={(e) => setAEmail(e.target.value)} style={inputStyle} placeholder="maria@empresa.com" />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Cargo (opcional)</label>
                    <input value={aJobTitle} onChange={(e) => setAJobTitle(e.target.value)} style={inputStyle} placeholder="Ej: Contador, Bodeguero…" />
                  </div>
                </div>

                {/* Role selector cards */}
                <label style={{ ...labelStyle, marginBottom: 8 }}>Rol</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
                  {ROLES.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setARole(r.id)}
                      style={{
                        textAlign: 'left', cursor: 'pointer', borderRadius: 8, padding: '8px 12px',
                        border: `1.5px solid ${aRole === r.id ? r.border : 'var(--border)'}`,
                        background: aRole === r.id ? r.bg : 'transparent',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: aRole === r.id ? r.color : 'var(--text)' }}>
                          {r.label}
                        </span>
                        {aRole === r.id && (
                          <span style={{ fontSize: 11, color: r.color }}>✓</span>
                        )}
                      </div>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--muted)' }}>{r.desc}</p>
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setInviteOpen(false)}
                    style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 13, cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={aLoading}
                    className="font-syne font-bold"
                    style={{
                      flex: 2, padding: '9px 0', borderRadius: 8, border: 'none',
                      background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', color: '#fff',
                      fontSize: 13, cursor: aLoading ? 'not-allowed' : 'pointer', opacity: aLoading ? 0.7 : 1,
                    }}
                  >
                    {aLoading ? 'Enviando…' : 'Enviar invitación'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
