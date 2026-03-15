import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import KpiCard from '@/components/ui/KpiCard'
import AiInsightBox from '@/components/ui/AiInsightBox'

// ── Badge de estado para empresa ───────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s = (status ?? '').toLowerCase()
  let bg: string
  let color: string
  let label: string

  if (s === 'active') {
    bg = 'rgba(5,150,105,0.15)'
    color = '#34D399'
    label = 'Activa'
  } else if (s === 'trial') {
    bg = 'rgba(217,119,6,0.15)'
    color = '#FCD34D'
    label = 'Prueba'
  } else if (s === 'suspended') {
    bg = 'rgba(220,38,38,0.15)'
    color = '#F87171'
    label = 'Suspendida'
  } else {
    bg = 'rgba(255,255,255,0.06)'
    color = 'rgba(255,255,255,0.4)'
    label = status || '—'
  }

  return (
    <span
      style={{
        display:      'inline-block',
        padding:      '2px 8px',
        borderRadius: 6,
        background:   bg,
        color,
        fontSize:     11,
        fontWeight:   500,
      }}
    >
      {label}
    </span>
  )
}

// ── Formatea fecha ──────────────────────────────────────────
function formatDate(iso: string | null) {
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

// ── Página principal del Panel Pulse Admin ─────────────────
export default async function PulseAdminPage() {
  const supabase = await createClient()

  const { count: companiesCount } = await supabase
    .from('companies')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)

  const { count: usersCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)

  const { data: pulseMetrics } = await supabase
    .from('pulse_metrics')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: companiesList } = await supabase
    .from('companies')
    .select('id, name, plan, status, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const companies = companiesList ?? []
  void pulseMetrics

  return (
    <>
      <div
        style={{
          background:   '#0F1020',
          borderBottom: '1px solid rgba(245,200,66,0.15)',
        }}
      >
        <Topbar
          pageTitle="Panel Pulse"
          pageSubtitle="Visión global de todas las empresas"
        />
      </div>

      <div
        style={{
          padding:        20,
          display:        'flex',
          flexDirection:  'column',
          gap:            20,
        }}
      >
        <AiInsightBox
          variant="gold"
          title="North Star Metric"
          text="Panel de control de Pulse. Monitorea el estado de todas las empresas cliente. Aquí verás activación, retención y MRR en tiempo real cuando haya datos disponibles."
        />

        <div
          style={{
            display:               'grid',
            gridTemplateColumns:   'repeat(4, 1fr)',
            gap:                   10,
          }}
        >
          <KpiCard
            label="Empresas activas"
            value={companiesCount ?? 0}
          />
          <KpiCard
            label="Usuarios totales"
            value={usersCount ?? 0}
          />
          <KpiCard
            label="MRR"
            prefix="$"
            value={0}
            compare="Meta mes 3: $1,000"
          />
          <KpiCard
            label="Churn"
            suffix="%"
            value={0}
            compare="Meta: <5%"
          />
        </div>

        <div
          style={{
            borderRadius: 12,
            background:   'rgba(255,255,255,0.04)',
            border:       '1px solid rgba(245,200,66,0.12)',
            padding:      20,
          }}
        >
          <h2
            className="font-syne font-bold"
            style={{
              fontSize:     14,
              color:        '#E8E8F0',
              marginBottom: 16,
            }}
          >
            Empresas registradas
          </h2>

          {companies.length === 0 ? (
            <p
              style={{
                textAlign: 'center',
                color:     'rgba(255,255,255,0.3)',
                fontSize:  13,
                padding:   32,
              }}
            >
              No hay empresas registradas todavía
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width:           '100%',
                  borderCollapse:  'collapse',
                  fontSize:        12,
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {['Empresa', 'Plan', 'Estado', 'Desde'].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign:  'left',
                          padding:    '10px 12px',
                          color:      'rgba(255,255,255,0.35)',
                          fontWeight: 600,
                          fontSize:   11,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <td
                        style={{
                          padding:    '10px 12px',
                          color:      '#E8E8F0',
                          fontWeight: 500,
                        }}
                      >
                        {c.name}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          color:   'rgba(255,255,255,0.45)',
                        }}
                      >
                        {c.plan ?? '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <StatusBadge status={c.status} />
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          color:   'rgba(255,255,255,0.35)',
                        }}
                      >
                        {formatDate(c.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
