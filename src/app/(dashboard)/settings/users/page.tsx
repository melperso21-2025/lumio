import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import KpiCard from '@/components/ui/KpiCard'
import AiInsightBox from '@/components/ui/AiInsightBox'
import InviteUserForm from '@/components/settings/InviteUserForm'
import EditUserRoleForm from '@/components/settings/EditUserRoleForm'

// ── Configuración de badges por rol ───────────────────────────
const roleConfig: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  admin: {
    bg: 'var(--gold-bg)',
    color: 'var(--gold)',
    label: 'Admin',
  },
  manager: {
    bg: 'rgba(37,99,235,0.1)',
    color: 'var(--blue)',
    label: 'Gerente',
  },
  operator: {
    bg: 'rgba(146,148,172,0.1)',
    color: 'var(--muted)',
    label: 'Operativo',
  },
}

// ── Formatea fecha para mostrar ───────────────────────────────
function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

export default async function SettingsUsersPage() {
  // 1. Auth
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('company_id, role, is_pulse_admin')
    .eq('id', user.id)
    .single()

  const companyId = userData?.company_id
  const currentUserRole = userData?.role
  const isPulseAdmin = userData?.is_pulse_admin ?? false

  // Solo admin puede gestionar usuarios
  const canManage = currentUserRole === 'admin' || isPulseAdmin

  // Si no hay companyId → mensaje igual que otros módulos
  if (!companyId) {
    return (
      <>
        <Topbar
          pageTitle="Usuarios & Roles"
          pageSubtitle="Gestión de accesos"
        />
        <div style={{ padding: '14px 16px' }}>
          <p
            style={{
              fontFamily: 'var(--font-syne)',
              color: 'var(--muted)',
              fontSize: 14,
            }}
          >
            No tienes una empresa asignada.
          </p>
        </div>
      </>
    )
  }

  // 2. Obtener todos los usuarios de la empresa
  const { data: usersList } = await supabase
    .from('users')
    .select(
      'id, full_name, email, role, job_title, last_seen_at, created_at, deleted_at'
    )
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  const users = usersList ?? []

  // 3. KPIs
  const total_users = users.length
  const admin_count = users.filter((u) => u.role === 'admin').length
  const manager_count = users.filter((u) => u.role === 'manager').length
  const operator_count = users.filter((u) => u.role === 'operator').length

  return (
    <>
      <Topbar
        pageTitle="Usuarios & Roles"
        pageSubtitle="Gestión de accesos"
      />

      <div
        style={{
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {/* Sección 2 — AiInsightBox si el usuario no es admin */}
        {!canManage && (
          <AiInsightBox
            variant="blue"
            title="Acceso restringido"
            text="Solo los administradores pueden gestionar usuarios. Contacta al administrador de tu empresa."
          />
        )}

        {/* Sección 3 — Grid 4 KpiCards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
          }}
        >
          <KpiCard label="Total usuarios" value={total_users} />
          <KpiCard label="Administradores" value={admin_count} isGold />
          <KpiCard label="Gerentes" value={manager_count} />
          <KpiCard label="Operativos" value={operator_count} />
        </div>

        {/* Sección 4 — Card tabla de usuarios */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '14px 16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <h2
              className="font-syne font-bold"
              style={{ fontSize: 16, color: 'var(--text)' }}
            >
              Equipo
            </h2>
            {canManage && (
              <InviteUserForm companyId={companyId} />
            )}
          </div>

          {users.length === 0 ? (
            <AiInsightBox
              variant="blue"
              title="Sin usuarios registrados"
              text="No hay usuarios en esta empresa todavía."
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                }}
              >
                <thead>
                  <tr>
                    {[
                      'Usuario',
                      'Email',
                      'Cargo',
                      'Rol',
                      'Último acceso',
                      'Acciones',
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          fontSize: 11,
                          color: 'var(--muted)',
                          fontWeight: 600,
                          padding: '10px 12px',
                          textAlign: 'left',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const roleCfg =
                      roleConfig[u.role ?? ''] ?? roleConfig.operator
                    const isCurrentUser = u.id === user.id
                    return (
                      <tr
                        key={u.id}
                        style={{
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        <td
                          style={{
                            fontSize: 12,
                            padding: '10px 12px',
                            color: 'var(--text)',
                          }}
                        >
                          {u.full_name}
                        </td>
                        <td
                          style={{
                            fontSize: 12,
                            padding: '10px 12px',
                            color: 'var(--text2)',
                          }}
                        >
                          {u.email}
                        </td>
                        <td
                          style={{
                            fontSize: 12,
                            padding: '10px 12px',
                            color: 'var(--text2)',
                          }}
                        >
                          {u.job_title ?? '—'}
                        </td>
                        <td style={{ fontSize: 12, padding: '10px 12px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 500,
                              background: roleCfg.bg,
                              color: roleCfg.color,
                            }}
                          >
                            {roleCfg.label}
                          </span>
                        </td>
                        <td
                          style={{
                            fontSize: 12,
                            padding: '10px 12px',
                            color: u.last_seen_at
                              ? 'var(--text2)'
                              : 'var(--muted)',
                          }}
                        >
                          {u.last_seen_at
                            ? formatDate(u.last_seen_at)
                            : 'Nunca'}
                        </td>
                        <td style={{ fontSize: 12, padding: '10px 12px' }}>
                          {canManage ? (
                            isCurrentUser ? (
                              <span
                                style={{
                                  fontSize: 11,
                                  color: 'var(--muted)',
                                }}
                              >
                                — (tú)
                              </span>
                            ) : (
                              <EditUserRoleForm
                                userId={u.id}
                                currentRole={u.role ?? 'operator'}
                              />
                            )
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sección 5 — Card informativa de roles */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '14px 16px',
            marginTop: 0,
          }}
        >
          <h3
            className="font-syne font-bold"
            style={{
              fontSize: 13,
              color: 'var(--text)',
              marginBottom: 12,
            }}
          >
            Descripción de roles
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
            }}
          >
            <div
              style={{
                padding: 12,
                background: 'var(--bg)',
                borderRadius: 8,
                border: '1px solid var(--border)',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  background: 'var(--gold-bg)',
                  color: 'var(--gold)',
                  marginBottom: 8,
                }}
              >
                Admin
              </span>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text2)',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                Acceso completo. Puede gestionar usuarios, ver finanzas, generar
                análisis de IA y configurar la empresa.
              </p>
            </div>
            <div
              style={{
                padding: 12,
                background: 'var(--bg)',
                borderRadius: 8,
                border: '1px solid var(--border)',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  background: 'rgba(37,99,235,0.1)',
                  color: 'var(--blue)',
                  marginBottom: 8,
                }}
              >
                Gerente
              </span>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text2)',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                Puede ver todos los módulos incluyendo finanzas. No puede
                gestionar usuarios ni generar análisis de IA.
              </p>
            </div>
            <div
              style={{
                padding: 12,
                background: 'var(--bg)',
                borderRadius: 8,
                border: '1px solid var(--border)',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  background: 'rgba(146,148,172,0.1)',
                  color: 'var(--muted)',
                  marginBottom: 8,
                }}
              >
                Operativo
              </span>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text2)',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                Puede registrar ventas, pautas, clientes e inventario. No tiene
                acceso a finanzas ni configuración.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
