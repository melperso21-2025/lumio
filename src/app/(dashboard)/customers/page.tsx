import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import KpiCard from '@/components/ui/KpiCard'
import AiInsightBox from '@/components/ui/AiInsightBox'
import NewCustomerForm from '@/components/customers/NewCustomerForm'

// ── Configuración de badges por customer_type ─────────────────
const typeConfig: Record<string, { bg: string; color: string; label: string }> = {
  retail:     { bg: 'rgba(37,99,235,0.1)',   color: 'var(--blue)',   label: 'Retail'     },
  wholesale:  { bg: 'rgba(124,58,237,0.1)',  color: '#7C3AED',       label: 'Mayorista'  },
  occasional: { bg: 'rgba(146,148,172,0.1)', color: 'var(--muted)', label: 'Eventual'   },
  b2b:        { bg: 'rgba(5,150,105,0.1)',   color: 'var(--green)', label: 'B2B'        },
}

// ── Configuración de badges por label ──────────────────────────
const labelConfig: Record<string, { bg: string; color: string; label: string }> = {
  vip:       { bg: 'var(--gold-bg)',           color: 'var(--gold)',   label: 'VIP'         },
  frequent:  { bg: 'rgba(5,150,105,0.1)',      color: 'var(--green)', label: 'Frecuente'   },
  new:       { bg: 'rgba(37,99,235,0.1)',      color: 'var(--blue)',  label: 'Nuevo'       },
  recovery:  { bg: 'rgba(217,119,6,0.1)',      color: 'var(--orange)', label: 'Recuperar' },
}

// ── Formatea fecha para mostrar ───────────────────────────────
function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('es-EC', {
      day:   '2-digit',
      month: '2-digit',
      year:  'numeric',
    })
  } catch {
    return '—'
  }
}

export default async function CustomersPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const companyId = userData?.company_id

  if (!companyId) {
    return (
      <>
        <Topbar pageTitle="Clientes" pageSubtitle="CRM básico" />
        <div style={{ padding: 20 }}>
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

  const { data: customersList } = await supabase
    .from('customers')
    .select('id, full_name, phone, email, customer_type, label, lifetime_value, last_purchase_at, registered_since, created_at')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100)

  const customers = customersList ?? []

  const total_customers = customers.length
  const vip_count = customers.filter((c) => c.label === 'vip').length
  const wholesale_count = customers.filter((c) => c.customer_type === 'wholesale').length
  const total_ltv = customers.reduce((sum, c) => sum + (c.lifetime_value ?? 0), 0)

  return (
    <>
      <Topbar pageTitle="Clientes" pageSubtitle="CRM básico" />

      <div
        style={{
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Grid 4 KpiCards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
          }}
        >
          <KpiCard label="Total clientes" value={total_customers} />
          <KpiCard label="VIP" value={vip_count} isGold />
          <KpiCard label="Mayoristas" value={wholesale_count} />
          <KpiCard label="LTV total" prefix="$" value={total_ltv.toFixed(2)} />
        </div>

        {/* Card tabla de clientes */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <h2
              className="font-syne font-bold"
              style={{ fontSize: 16, color: 'var(--text)' }}
            >
              Directorio de clientes
            </h2>
            <NewCustomerForm />
          </div>

          {customers.length === 0 ? (
            <AiInsightBox
              variant="blue"
              title="Sin clientes registrados"
              text="Aún no hay clientes en el directorio. Usa el botón '+ Nuevo cliente' para agregar el primero."
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
                    {['Nombre', 'Teléfono', 'Tipo', 'Etiqueta', 'LTV', 'Última compra', 'Cliente desde'].map((h) => (
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
                  {customers.map((c) => {
                    const typeCfg = typeConfig[c.customer_type ?? ''] ?? {
                      bg: 'var(--hover)',
                      color: 'var(--text2)',
                      label: c.customer_type ?? '—',
                    }
                    const labelCfg = labelConfig[c.label ?? ''] ?? {
                      bg: 'var(--hover)',
                      color: 'var(--text2)',
                      label: c.label ?? '—',
                    }
                    const ltv = c.lifetime_value ?? 0
                    return (
                      <tr
                        key={c.id}
                        style={{
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        <td style={{ fontSize: 12, padding: '10px 12px', color: 'var(--text)' }}>
                          {c.full_name}
                        </td>
                        <td style={{ fontSize: 12, padding: '10px 12px', color: 'var(--text2)' }}>
                          {c.phone ?? '—'}
                        </td>
                        <td style={{ fontSize: 12, padding: '10px 12px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 500,
                              background: typeCfg.bg,
                              color: typeCfg.color,
                            }}
                          >
                            {typeCfg.label}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, padding: '10px 12px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 500,
                              background: labelCfg.bg,
                              color: labelCfg.color,
                            }}
                          >
                            {labelCfg.label}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, padding: '10px 12px' }}>
                          {ltv > 0 ? (
                            <span
                              className="font-syne"
                              style={{ fontWeight: 700, color: 'var(--gold)' }}
                            >
                              $ {ltv.toLocaleString('es-EC')}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--muted)' }}>—</span>
                          )}
                        </td>
                        <td style={{ fontSize: 12, padding: '10px 12px', color: 'var(--text2)' }}>
                          {formatDate(c.last_purchase_at)}
                        </td>
                        <td style={{ fontSize: 12, padding: '10px 12px', color: 'var(--text2)' }}>
                          {formatDate(c.registered_since)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
