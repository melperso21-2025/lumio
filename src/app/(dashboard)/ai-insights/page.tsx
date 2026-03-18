import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import AiInsightBox from '@/components/ui/AiInsightBox'
import KpiCard from '@/components/ui/KpiCard'
import GenerateInsightButton from '@/components/ai-insights/GenerateInsightButton'
import InsightCard from '@/components/ai-insights/InsightCard'

// ── Tipos ─────────────────────────────────────────────────────
interface PlaybookItem {
  action: string
  reason?: string
  priority: 'urgent' | 'soon' | 'later'
  timeframe?: string
}

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

export default async function AiInsightsPage() {
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
  const userRole = userData?.role
  const isPulseAdmin = userData?.is_pulse_admin ?? false
  const canGenerate = userRole === 'admin' || isPulseAdmin

  // Si no hay companyId → mensaje igual que otros módulos
  if (!companyId) {
    return (
      <>
        <Topbar
          pageTitle="IA Insights"
          pageSubtitle="Análisis semanal"
        />
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

  // 2. Semana y año actual
  const now = new Date()
  const currentYear = now.getFullYear()
  const startOfYear = new Date(currentYear, 0, 1)
  const weekNumber = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 +
      startOfYear.getDay() +
      1) /
      7
  )

  // 3. Insight de la semana actual
  const { data: currentInsight } = await supabase
    .from('ai_insights')
    .select(
      'id, week_number, year, insight_sales, insight_campaigns, insight_inventory, insight_finance, playbook, executive_summary, viewed_at, created_at'
    )
    .eq('company_id', companyId)
    .eq('week_number', weekNumber)
    .eq('year', currentYear)
    .single()

  // 4. Historial de últimos 8 insights
  const { data: insightHistory } = await supabase
    .from('ai_insights')
    .select('id, week_number, year, executive_summary, created_at, viewed_at')
    .eq('company_id', companyId)
    .order('year', { ascending: false })
    .order('week_number', { ascending: false })
    .limit(8)

  const history = insightHistory ?? []

  // 5. Marcar como visto si no lo estaba
  if (currentInsight && !currentInsight.viewed_at) {
    await supabase
      .from('ai_insights')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', currentInsight.id)
  }

  // 6. Verificar si hay datos suficientes para generar
  const { count: salesCount } = await supabase
    .from('sales')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .is('deleted_at', null)

  const hasEnoughData = (salesCount ?? 0) >= 1

  return (
    <>
      <Topbar
        pageTitle="IA Insights"
        pageSubtitle={`Análisis semanal · Semana ${weekNumber} · ${currentYear}`}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 280px',
          gap: 20,
          padding: 20,
        }}
      >
        {/* Columna izquierda — Insight actual */}
        {currentInsight ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header del insight */}
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
                  alignItems: 'flex-start',
                  marginBottom: 16,
                }}
              >
                <div>
                  <h2
                    className="font-syne font-bold"
                    style={{ fontSize: 18, color: 'var(--text)' }}
                  >
                    Análisis · Semana {currentInsight.week_number}
                  </h2>
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--muted)',
                      marginTop: 4,
                    }}
                  >
                    Generado el {formatDate(currentInsight.created_at)}
                  </p>
                </div>
                {canGenerate && (
                  <GenerateInsightButton
                    companyId={companyId}
                    weekNumber={weekNumber}
                    year={currentYear}
                    hasExisting={true}
                    hasEnoughData={hasEnoughData}
                    label="↻ Regenerar"
                    variant="ghost"
                  />
                )}
              </div>

              {/* Resumen ejecutivo */}
              {currentInsight.executive_summary && (
                <AiInsightBox
                  variant="gold"
                  title="✦ Resumen ejecutivo"
                  text={currentInsight.executive_summary}
                />
              )}
            </div>

            {/* 4 módulos de análisis */}
            {currentInsight.insight_sales && (
              <div
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 20,
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
                  💰 Análisis de Ventas
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--text2)',
                    lineHeight: 1.7,
                  }}
                >
                  {currentInsight.insight_sales}
                </p>
              </div>
            )}

            {currentInsight.insight_campaigns && (
              <div
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 20,
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
                  📣 Análisis de Pautas
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--text2)',
                    lineHeight: 1.7,
                  }}
                >
                  {currentInsight.insight_campaigns}
                </p>
              </div>
            )}

            {currentInsight.insight_inventory && (
              <div
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 20,
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
                  📦 Análisis de Inventario
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--text2)',
                    lineHeight: 1.7,
                  }}
                >
                  {currentInsight.insight_inventory}
                </p>
              </div>
            )}

            {currentInsight.insight_finance && (
              <div
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 20,
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
                  🏦 Análisis Financiero
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--text2)',
                    lineHeight: 1.7,
                  }}
                >
                  {currentInsight.insight_finance}
                </p>
              </div>
            )}

            {/* Playbook de acciones */}
            {currentInsight.playbook &&
              Array.isArray(currentInsight.playbook) &&
              (currentInsight.playbook as PlaybookItem[]).length > 0 && (
                <div
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 20,
                  }}
                >
                  <h3
                    className="font-syne font-bold"
                    style={{
                      fontSize: 13,
                      color: 'var(--text)',
                      marginBottom: 16,
                    }}
                  >
                    ✦ Playbook — Acciones priorizadas
                  </h3>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    {(currentInsight.playbook as PlaybookItem[]).map(
                      (item, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            gap: 12,
                            padding: '10px 14px',
                            background: 'var(--bg)',
                            borderRadius: 8,
                            border: `1px solid ${
                              item.priority === 'urgent'
                                ? 'rgba(220,38,38,0.2)'
                                : item.priority === 'soon'
                                  ? 'rgba(217,119,6,0.2)'
                                  : 'rgba(232,165,0,0.15)'
                            }`,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 4,
                              height: 'fit-content',
                              flexShrink: 0,
                              background:
                                item.priority === 'urgent'
                                  ? 'rgba(220,38,38,0.1)'
                                  : item.priority === 'soon'
                                    ? 'rgba(217,119,6,0.1)'
                                    : 'rgba(232,165,0,0.1)',
                              color:
                                item.priority === 'urgent'
                                  ? 'var(--red)'
                                  : item.priority === 'soon'
                                    ? 'var(--orange)'
                                    : 'var(--gold)',
                            }}
                          >
                            {item.priority === 'urgent'
                              ? 'HOY'
                              : item.priority === 'soon'
                                ? 'SEMANA'
                                : 'MES'}
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: 'var(--text)',
                                marginBottom: 2,
                              }}
                            >
                              {item.action}
                            </div>
                            {item.reason && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: 'var(--muted)',
                                  lineHeight: 1.5,
                                }}
                              >
                                {item.reason}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 40,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 16 }}>✦</div>
              <h2
                className="font-syne font-bold"
                style={{
                  fontSize: 18,
                  color: 'var(--text)',
                  marginBottom: 8,
                }}
              >
                Sin análisis esta semana
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--muted)',
                  marginBottom: 24,
                  maxWidth: 380,
                  margin: '0 auto 24px',
                }}
              >
                {hasEnoughData
                  ? `Genera el análisis de la semana ${weekNumber} para ver insights personalizados de tu negocio.`
                  : 'Registra al menos una venta para poder generar tu primer análisis de IA.'}
              </p>
              {canGenerate && hasEnoughData && (
                <GenerateInsightButton
                  companyId={companyId}
                  weekNumber={weekNumber}
                  year={currentYear}
                  hasExisting={false}
                  hasEnoughData={hasEnoughData}
                  label="✦ Generar análisis de esta semana"
                  variant="primary"
                />
              )}
              {!hasEnoughData && (
                <AiInsightBox
                  variant="blue"
                  title="Datos insuficientes"
                  text="Registra ventas, pautas y movimientos bancarios para que la IA pueda analizar tu negocio con precisión."
                />
              )}
            </div>
          </div>
        )}

        {/* Columna derecha — Historial y stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Stats rápidos */}
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <h3
              className="font-syne font-bold"
              style={{
                fontSize: 12,
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 12,
              }}
            >
              Esta semana
            </h3>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                }}
              >
                <span style={{ color: 'var(--text2)' }}>Semana actual</span>
                <span
                  className="font-syne font-bold"
                  style={{ color: 'var(--gold)' }}
                >
                  #{weekNumber}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                }}
              >
                <span style={{ color: 'var(--text2)' }}>
                  Análisis generados
                </span>
                <span
                  className="font-syne font-bold"
                  style={{ color: 'var(--text)' }}
                >
                  {history.length}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                }}
              >
                <span style={{ color: 'var(--text2)' }}>Estado semana</span>
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontWeight: 600,
                    background: currentInsight
                      ? 'rgba(5,150,105,0.1)'
                      : 'rgba(217,119,6,0.1)',
                    color: currentInsight
                      ? 'var(--green)'
                      : 'var(--orange)',
                  }}
                >
                  {currentInsight ? '✓ Generado' : 'Pendiente'}
                </span>
              </div>
            </div>
          </div>

          {/* Historial */}
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <h3
              className="font-syne font-bold"
              style={{
                fontSize: 12,
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 12,
              }}
            >
              Historial
            </h3>
            {history.length === 0 ? (
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--muted)',
                  textAlign: 'center',
                  padding: '16px 0',
                }}
              >
                Sin análisis previos
              </p>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {history.map((h) => (
                  <InsightCard
                    key={h.id}
                    weekNumber={h.week_number}
                    year={h.year}
                    summary={h.executive_summary}
                    createdAt={h.created_at}
                    viewedAt={h.viewed_at}
                    isCurrent={
                      h.week_number === weekNumber && h.year === currentYear
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
