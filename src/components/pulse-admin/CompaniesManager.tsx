'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import NewCompanyForm from '@/components/pulse-admin/NewCompanyForm'

export type CompanyListRow = {
  id: string
  name: string
  tax_id: string | null
  sector: string | null
  plan: string
  status: string
  max_users: number
  allow_user_invites: boolean
  trial_expires_at: string | null
  created_at: string | null
  pulse_notes: string | null
  operational_since: string | null
  user_count: number
}

const PLAN_LABELS: Record<string, string> = {
  trial: 'Trial',
  basic: 'Basic',
  standard: 'Standard',
  pro: 'Pro',
}

const STATUS_LABELS: Record<string, string> = {
  trial: 'Trial',
  active: 'Activo',
  suspended: 'Suspendido',
}

type BadgeKey =
  | 'trial'
  | 'active'
  | 'suspended'
  | 'muted'
  | 'basic'
  | 'standard'
  | 'pro'

function badgeStyle(kind: BadgeKey): React.CSSProperties {
  const map: Record<BadgeKey, { bg: string; color: string; border: string }> = {
    trial: { bg: 'rgba(217,119,6,0.12)', color: '#B45309', border: 'rgba(217,119,6,0.25)' },
    active: { bg: 'rgba(5,150,105,0.1)', color: '#059669', border: 'rgba(5,150,105,0.2)' },
    suspended: { bg: 'rgba(220,38,38,0.08)', color: '#DC2626', border: 'rgba(220,38,38,0.2)' },
    muted: { bg: 'var(--hover)', color: 'var(--muted)', border: 'var(--border)' },
    basic: { bg: 'rgba(59,130,246,0.1)', color: '#2563EB', border: 'rgba(59,130,246,0.25)' },
    standard: { bg: 'rgba(5,150,105,0.1)', color: '#047857', border: 'rgba(5,150,105,0.2)' },
    pro: { bg: 'rgba(124,58,237,0.1)', color: '#6D28D9', border: 'rgba(124,58,237,0.25)' },
  }
  const s = map[kind]
  return {
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 5,
    background: s.bg,
    color: s.color,
    border: `1px solid ${s.border}`,
  }
}

function planBadgeKey(p: string): BadgeKey {
  if (p === 'basic' || p === 'standard' || p === 'pro' || p === 'trial') return p
  return 'muted'
}

function statusBadgeKey(s: string): 'trial' | 'active' | 'suspended' | 'muted' {
  if (s === 'active' || s === 'suspended' || s === 'trial') return s
  return 'muted'
}

export default function CompaniesManager({
  initialCompanies,
}: {
  initialCompanies: CompanyListRow[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [q, setQ] = useState('')
  const [planF, setPlanF] = useState<string>('all')
  const [statusF, setStatusF] = useState<string>('all')
  const [newOpen, setNewOpen] = useState(false)
  const [editRow, setEditRow] = useState<CompanyListRow | null>(null)
  const [adminRow, setAdminRow] = useState<CompanyListRow | null>(null)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminName, setAdminName] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager' | 'operator'>('operator')
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminErr, setAdminErr] = useState<string | null>(null)
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null)

  async function toggleCompanyStatus(c: CompanyListRow) {
    const nextStatus = c.status === 'suspended' ? 'active' : 'suspended'
    setTogglingStatusId(c.id)
    try {
      await fetch(`/api/pulse-admin/companies/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      router.refresh()
    } finally {
      setTogglingStatusId(null)
    }
  }

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setNewOpen(true)
      router.replace('/pulse-admin/companies', { scroll: false })
    }
  }, [searchParams, router])

  const filtered = useMemo(() => {
    return initialCompanies.filter((c) => {
      if (q.trim() && !c.name.toLowerCase().includes(q.trim().toLowerCase())) return false
      if (planF !== 'all' && c.plan !== planF) return false
      if (statusF !== 'all' && c.status !== statusF) return false
      return true
    })
  }, [initialCompanies, q, planF, statusF])

  async function submitInviteUser(e: React.FormEvent) {
    e.preventDefault()
    if (!adminRow) return
    setAdminErr(null)
    setAdminLoading(true)
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEmail.trim(),
          full_name: adminName.trim(),
          role: inviteRole,
          company_id: adminRow.id,
          is_pulse_admin_creating: true,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setAdminErr(data.error ?? 'Error')
        setAdminLoading(false)
        return
      }
      setAdminRow(null)
      setAdminEmail('')
      setAdminName('')
      setInviteRole('operator')
      router.refresh()
    } catch {
      setAdminErr('Error de conexión')
    } finally {
      setAdminLoading(false)
    }
  }

  function userBar(c: CompanyListRow) {
    const max = c.max_users ?? 3
    const n = c.user_count
    if (max === 0) {
      return (
        <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>
          Sin acceso a usuarios
        </span>
      )
    }
    const pct = Math.min(100, (n / max) * 100)
    const over = n >= max
    return (
      <div style={{ minWidth: 120 }}>
        <div style={{ fontSize: 11, color: over ? 'var(--red)' : 'var(--text)', marginBottom: 4 }}>
          {n} / {max}
        </div>
        <div
          style={{
            height: 4,
            borderRadius: 2,
            background: 'var(--border)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              borderRadius: 2,
              background: over
                ? 'linear-gradient(90deg, #DC2626, #F87171)'
                : 'linear-gradient(90deg, #059669, #34D399)',
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 10,
          marginBottom: 14,
        }}
      >
        <input
          type="search"
          placeholder="Buscar por nombre…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{
            flex: '1 1 200px',
            maxWidth: 280,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--card)',
            fontSize: 13,
            color: 'var(--text)',
            fontFamily: 'var(--font-jakarta)',
          }}
        />
        <select
          value={planF}
          onChange={(e) => setPlanF(e.target.value)}
          style={{
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--card)',
            fontSize: 12,
            color: 'var(--text2)',
          }}
        >
          <option value="all">Plan: todos</option>
          <option value="trial">Trial</option>
          <option value="basic">Basic</option>
          <option value="standard">Standard</option>
          <option value="pro">Pro</option>
        </select>
        <select
          value={statusF}
          onChange={(e) => setStatusF(e.target.value)}
          style={{
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--card)',
            fontSize: 12,
            color: 'var(--text2)',
          }}
        >
          <option value="all">Estado: todos</option>
          <option value="trial">Trial</option>
          <option value="active">Activo</option>
          <option value="suspended">Suspendido</option>
        </select>
        <button
          type="button"
          className="font-syne font-bold"
          onClick={() => setNewOpen(true)}
          style={{
            marginLeft: 'auto',
            padding: '8px 16px',
            borderRadius: 8,
            background: 'linear-gradient(135deg, #F5C842, #F09A1A)',
            color: '#1A1B2E',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          + Nueva empresa
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
            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              {['Empresa', 'Plan', 'Estado', 'Usuarios', 'Trial expira', 'Acciones'].map(
                (h) => (
                  <th
                    key={h}
                    scope="col"
                    style={{
                      padding: '10px 12px',
                      fontSize: 9,
                      color: 'var(--muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      fontWeight: 600,
                    }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 28, textAlign: 'center', color: 'var(--muted)' }}>
                  No hay empresas que coincidan
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
                    {c.tax_id && (
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>RUC {c.tax_id}</div>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={badgeStyle(planBadgeKey(c.plan))}>
                      {PLAN_LABELS[c.plan] ?? c.plan}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={badgeStyle(statusBadgeKey(c.status))}>
                      {STATUS_LABELS[c.status] ?? c.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>{userBar(c)}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text2)', fontSize: 11 }}>
                    {c.trial_expires_at
                      ? c.trial_expires_at.slice(0, 10)
                      : '—'}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      <Link
                        href={`/pulse-admin/companies/${c.id}`}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                          padding: '4px 9px', borderRadius: 6, textDecoration: 'none',
                          border: '1px solid rgba(245,200,66,0.35)',
                          background: 'rgba(245,200,66,0.07)',
                          color: 'var(--gold)',
                        }}
                      >
                        <span style={{ fontSize: 10 }}>↗</span> Ver
                      </Link>
                      <button
                        type="button"
                        onClick={() => setEditRow(c)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap',
                          padding: '4px 9px', borderRadius: 6, cursor: 'pointer',
                          border: '1px solid var(--border)',
                          background: 'var(--hover)',
                          color: 'var(--text2)',
                        }}
                      >
                        <span style={{ fontSize: 10 }}>✎</span> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminRow(c)
                          setAdminErr(null)
                          setInviteRole('operator')
                        }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                          padding: '4px 9px', borderRadius: 6, cursor: 'pointer',
                          border: '1px solid rgba(124,58,237,0.3)',
                          background: 'rgba(124,58,237,0.07)',
                          color: '#7C3AED',
                        }}
                      >
                        <span style={{ fontSize: 11 }}>+</span> Invitar
                      </button>
                      <button
                        type="button"
                        disabled={togglingStatusId === c.id}
                        onClick={() => toggleCompanyStatus(c)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                          padding: '4px 9px', borderRadius: 6,
                          border: c.status === 'suspended'
                            ? '1px solid rgba(5,150,105,0.3)'
                            : '1px solid rgba(220,38,38,0.25)',
                          background: c.status === 'suspended'
                            ? 'rgba(5,150,105,0.07)'
                            : 'rgba(220,38,38,0.05)',
                          color: c.status === 'suspended' ? 'var(--green)' : 'var(--red)',
                          cursor: togglingStatusId === c.id ? 'not-allowed' : 'pointer',
                          opacity: togglingStatusId === c.id ? 0.5 : 1,
                        }}
                      >
                        {togglingStatusId === c.id
                          ? '…'
                          : c.status === 'suspended'
                            ? '✓ Activar'
                            : '⊘ Suspender'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {newOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Nueva empresa"
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
          onClick={() => setNewOpen(false)}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 22,
              width: '100%',
              maxWidth: 480,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="font-syne font-bold"
              style={{ fontSize: 16, marginBottom: 14, color: 'var(--text)' }}
            >
              Nueva empresa
            </h3>
            <NewCompanyForm
              mode="create"
              onClose={() => setNewOpen(false)}
              onSuccess={() => router.refresh()}
            />
          </div>
        </div>
      )}

      {editRow && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Editar empresa"
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
          onClick={() => setEditRow(null)}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 22,
              width: '100%',
              maxWidth: 480,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="font-syne font-bold"
              style={{ fontSize: 16, marginBottom: 14, color: 'var(--text)' }}
            >
              Editar {editRow.name}
            </h3>
            <NewCompanyForm
              mode="edit"
              initial={{
                id: editRow.id,
                name: editRow.name,
                tax_id: editRow.tax_id ?? '',
                sector: editRow.sector ?? '',
                plan: editRow.plan,
                status: editRow.status,
                max_users: editRow.max_users,
                allow_user_invites: editRow.allow_user_invites,
                trial_expires_at: editRow.trial_expires_at ?? '',
                operational_since: editRow.operational_since ?? '',
                pulse_notes: editRow.pulse_notes ?? '',
              }}
              onClose={() => setEditRow(null)}
              onSuccess={() => router.refresh()}
            />
          </div>
        </div>
      )}

      {adminRow && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Invitar usuario a la empresa"
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
          onClick={() => setAdminRow(null)}
        >
          <form
            onSubmit={submitInviteUser}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 22,
              width: '100%',
              maxWidth: 400,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="font-syne font-bold"
              style={{ fontSize: 15, marginBottom: 4, color: 'var(--text)' }}
            >
              Invitar usuario
            </h3>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
              {adminRow.name}
            </p>
            {adminErr && (
              <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10 }}>{adminErr}</p>
            )}
            <div style={{ marginBottom: 10 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 9,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                Nombre completo
              </label>
              <input
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border2)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                }}
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 9,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                Email
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border2)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 9,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                Rol
              </label>
              <select
                value={inviteRole}
                onChange={(e) =>
                  setInviteRole(e.target.value as 'admin' | 'manager' | 'operator')
                }
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border2)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                }}
              >
                <option value="admin">Administrador</option>
                <option value="manager">Gerente</option>
                <option value="operator">Operativo</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setAdminRow(null)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--hover)',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={adminLoading}
                className="font-syne font-bold"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(135deg, #F5C842, #F09A1A)',
                  color: '#1A1B2E',
                  cursor: adminLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {adminLoading ? 'Enviando…' : 'Enviar invitación'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
