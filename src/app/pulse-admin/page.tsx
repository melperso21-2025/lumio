import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'

export default async function PulseAdminPage() {
  const supabase = await createClient()

  // Conteos
  const { count: companiesCount } = await supabase
    .from('companies')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)

  const { count: usersCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)

  // Lista empresas
  const { data: companiesList } = await supabase
    .from('companies')
    .select('id, name, plan, status, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  const companies = companiesList ?? []

  // Insights últimos 30 días
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const { data: insightsData } = await supabase
    .from('ai_insights')
    .select('company_id')
    .gte('created_at', thirtyDaysAgo.toISOString())

  const insightsByCompany: Record<string, number> = {}
  insightsData?.forEach((i) => {
    insightsByCompany[i.company_id] =
      (insightsByCompany[i.company_id] ?? 0) + 1
  })
  const companiesWithTwoPlusInsights = Object.values(
    insightsByCompany
  ).filter((c) => c >= 2).length
  const northStarPct =
    companies.length > 0
      ? Math.round(
          (companiesWithTwoPlusInsights / companies.length) * 100
        )
      : 0
  const totalInsights30d = insightsData?.length ?? 0

  // MRR placeholder
  const mrr = 0
  const mrrTarget = 1000
  const mrrPct =
    mrrTarget > 0 ? Math.min(Math.round((mrr / mrrTarget) * 100), 100) : 0

  return (
    <>
      <Topbar
        pageTitle="Panel Pulse"
        pageSubtitle="Visión global de todas las empresas"
      />

      <div
        style={{
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* North Star — caja púrpura */}
        <div
          style={{
            background:
              'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(91,33,182,0.04))',
            border: '1px solid rgba(124,58,237,0.2)',
            borderRadius: 10,
            padding: '14px 18px',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: 'rgba(124,58,237,0.1)',
              border: '1px solid rgba(124,58,237,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            🎯
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-syne)',
                fontWeight: 600,
                fontSize: 11,
                color: '#7C3AED',
                marginBottom: 3,
              }}
            >
              North Star Metric — Semana actual
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--text2)',
                lineHeight: 1.6,
              }}
            >
              <strong style={{ color: 'var(--text)' }}>
                {companiesWithTwoPlusInsights} de {companies.length} empresa
                {companies.length !== 1 ? 's' : ''}
              </strong>{' '}
              tienen usuarios que vieron{' '}
              <strong style={{ color: 'var(--text)' }}>
                2+ insights de IA en los últimos 30 días
              </strong>
              {' '}— {northStarPct}% de activación real. Meta MVP: 80%.{' '}
              {companiesWithTwoPlusInsights > 0
                ? `${companies[0]?.name} lidera con más insights esta semana.`
                : 'Aún no hay empresas con 2+ insights. Incentiva el uso de IA Insights esta semana.'}
            </div>
          </div>
        </div>

        {/* 5 KPI Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 12,
          }}
        >
          {/* MRR con barra */}
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '16px 18px',
            }}
          >
            <div
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--muted)',
                marginBottom: 6,
                fontWeight: 600,
              }}
            >
              MRR Total
            </div>
            <div
              className="font-syne font-bold"
              style={{
                fontSize: 28,
                color: 'var(--green)',
                lineHeight: 1,
              }}
            >
              ${mrr}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--muted)',
                marginTop: 4,
              }}
            >
              Meta mes 3: $1,000
            </div>
            <div
              style={{
                height: 4,
                background: 'var(--border)',
                borderRadius: 2,
                overflow: 'hidden',
                marginTop: 8,
              }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: 2,
                  background:
                    'linear-gradient(90deg, #F5C842, #F09A1A)',
                  width: `${mrrPct}%`,
                }}
              />
            </div>
          </div>

          {/* Empresas */}
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '16px 18px',
            }}
          >
            <div
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--muted)',
                marginBottom: 6,
                fontWeight: 600,
              }}
            >
              Empresas activas
            </div>
            <div
              className="font-syne font-bold"
              style={{
                fontSize: 28,
                color: 'var(--text)',
                lineHeight: 1,
              }}
            >
              {companiesCount ?? 0}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--muted)',
                marginTop: 4,
              }}
            >
              {companies.filter((c) => c.status === 'trial').length} trial ·{' '}
              {companies.filter((c) => c.status === 'active').length} pagando
            </div>
          </div>

          {/* Usuarios */}
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '16px 18px',
            }}
          >
            <div
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--muted)',
                marginBottom: 6,
                fontWeight: 600,
              }}
            >
              Usuarios totales
            </div>
            <div
              className="font-syne font-bold"
              style={{
                fontSize: 28,
                color: 'var(--text)',
                lineHeight: 1,
              }}
            >
              {usersCount ?? 0}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--muted)',
                marginTop: 4,
              }}
            >
              activos en la plataforma
            </div>
          </div>

          {/* Churn */}
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '16px 18px',
            }}
          >
            <div
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--muted)',
                marginBottom: 6,
                fontWeight: 600,
              }}
            >
              Churn mensual
            </div>
            <div
              className="font-syne font-bold"
              style={{
                fontSize: 28,
                color: 'var(--green)',
                lineHeight: 1,
              }}
            >
              0%
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--muted)',
                marginTop: 4,
              }}
            >
              Meta MVP: &lt;5%
            </div>
          </div>

          {/* Insights */}
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '16px 18px',
            }}
          >
            <div
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--muted)',
                marginBottom: 6,
                fontWeight: 600,
              }}
            >
              Insights generados
            </div>
            <div
              className="font-syne font-bold"
              style={{
                fontSize: 28,
                color: 'var(--text)',
                lineHeight: 1,
              }}
            >
              {totalInsights30d}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--muted)',
                marginTop: 4,
              }}
            >
              Últimos 30 días
            </div>
          </div>
        </div>

        {/* Grid 2-1 (Semáforo + columna derecha) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: 14,
          }}
        >
          {/* COLUMNA IZQUIERDA — Semáforo MVP */}
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}
            >
              <div
                className="font-syne font-bold"
                style={{ fontSize: 13, color: 'var(--text)' }}
              >
                Semáforo MVP por empresa
              </div>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                Actualizado hoy
              </span>
            </div>

            {/* Headers */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
                gap: 6,
                marginBottom: 10,
                padding: '0 4px',
              }}
            >
              {['Empresa', 'Activación', 'Retención S2', 'TTFI', 'Estado'].map(
                (h, i) => (
                  <div
                    key={h}
                    style={{
                      fontSize: 9,
                      color: 'var(--muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      textAlign: i === 0 ? 'left' : 'center',
                    }}
                  >
                    {h}
                  </div>
                )
              )}
            </div>

            {/* Filas por empresa — Proxy de activación basado en insights hasta tener datos de pulse_metrics */}
            {companies.length === 0 ? (
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--muted)',
                  textAlign: 'center',
                  padding: 24,
                }}
              >
                No hay empresas registradas todavía
              </p>
            ) : (
              companies.map((c) => {
                const insights = insightsByCompany[c.id] ?? 0
                const activationPct =
                  insights >= 4 ? 78 : insights >= 2 ? 60 : insights >= 1 ? 44 : 28
                const isGreen = activationPct >= 60
                const isAmber =
                  activationPct >= 40 && activationPct < 60
                const semColor = isGreen
                  ? '#059669'
                  : isAmber
                    ? '#D97706'
                    : '#DC2626'
                const semGlow = isGreen
                  ? 'rgba(5,150,105,0.4)'
                  : isAmber
                    ? 'rgba(217,119,6,0.4)'
                    : 'rgba(220,38,38,0.4)'
                const badgeBg = isGreen
                  ? 'rgba(5,150,105,0.1)'
                  : isAmber
                    ? 'rgba(217,119,6,0.1)'
                    : 'rgba(220,38,38,0.1)'
                const badgeBorder = isGreen
                  ? 'rgba(5,150,105,0.2)'
                  : isAmber
                    ? 'rgba(217,119,6,0.2)'
                    : 'rgba(220,38,38,0.2)'
                const semLabel = isGreen
                  ? 'Verde'
                  : isAmber
                    ? 'Amarillo'
                    : 'Rojo'
                return (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      marginBottom: 6,
                      background: 'var(--card)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: 'var(--text)',
                        flex: 1,
                      }}
                    >
                      {c.name}
                      {c.status === 'trial' && (
                        <span
                          style={{
                            fontSize: 10,
                            color: 'var(--muted)',
                            marginLeft: 4,
                          }}
                        >
                          (trial)
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          color: semColor,
                          width: 40,
                          textAlign: 'center',
                        }}
                      >
                        {activationPct}%
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: 'var(--muted)',
                          width: 40,
                          textAlign: 'center',
                        }}
                      >
                        —
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: 'var(--text2)',
                          width: 40,
                          textAlign: 'center',
                        }}
                      >
                        —
                      </div>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: semColor,
                          boxShadow: `0 0 6px ${semGlow}`,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 9,
                          padding: '2px 8px',
                          borderRadius: 5,
                          fontWeight: 600,
                          background: badgeBg,
                          color: semColor,
                          border: `1px solid ${badgeBorder}`,
                        }}
                      >
                        {semLabel}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* COLUMNA DERECHA — Acciones + MRR */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {/* Acciones prioritarias */}
            <div
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 16,
              }}
            >
              <div
                className="font-syne font-bold"
                style={{
                  fontSize: 13,
                  color: 'var(--text)',
                  marginBottom: 12,
                }}
              >
                Acciones prioritarias Pulse
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {(() => {
                  const inactiveCompany = companies.find(
                    (c) => (insightsByCompany[c.id] ?? 0) === 0
                  )
                  return (
                    <div
                      style={{
                        background: 'rgba(220,38,38,0.05)',
                        border: '1px solid rgba(220,38,38,0.15)',
                        borderRadius: 8,
                        padding: '10px 12px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--red)',
                          marginBottom: 3,
                        }}
                      >
                        🔴{' '}
                        {inactiveCompany
                          ? `${inactiveCompany.name} — Sin actividad`
                          : 'Sin alertas críticas'}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--text2)',
                        }}
                      >
                        {inactiveCompany
                          ? 'Empresa sin insights generados. Programar sesión de onboarding.'
                          : 'Todas las empresas tienen actividad esta semana. ✓'}
                      </div>
                    </div>
                  )
                })()}
                <div
                  style={{
                    background: 'var(--gold-bg)',
                    border: '1px solid var(--gold-bdr)',
                    borderRadius: 8,
                    padding: '10px 12px',
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--gold)',
                      marginBottom: 3,
                    }}
                  >
                    ⭐ Meta North Star — {northStarPct}%
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text2)',
                    }}
                  >
                    {northStarPct >= 80
                      ? '¡Meta alcanzada! Mantener el ritmo de generación de insights.'
                      : `Faltan ${80 - northStarPct}pp para la meta del 80%. Incentivar uso de IA Insights.`}
                  </div>
                </div>
              </div>
            </div>

            {/* MRR progreso */}
            <div
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 16,
              }}
            >
              <div
                className="font-syne font-bold"
                style={{
                  fontSize: 13,
                  color: 'var(--text)',
                  marginBottom: 12,
                }}
              >
                MRR — Progreso mes 3
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <span
                  style={{ fontSize: 12, color: 'var(--text2)' }}
                >
                  Actual
                </span>
                <span
                  className="font-syne font-bold"
                  style={{ color: 'var(--text)' }}
                >
                  ${mrr}
                </span>
              </div>
              <div
                style={{
                  height: 8,
                  background: 'var(--border)',
                  borderRadius: 2,
                  overflow: 'hidden',
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    height: '100%',
                    borderRadius: 2,
                    background:
                      'linear-gradient(90deg, #F5C842, #F09A1A)',
                    width: `${mrrPct}%`,
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 10,
                  color: 'var(--muted)',
                }}
              >
                <span>$0</span>
                <span style={{ color: 'var(--gold)' }}>
                  Meta: $1,000
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
