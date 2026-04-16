import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import AiInsightBox from '@/components/ui/AiInsightBox'
import GenerateInsightButton from '@/components/ai-insights/GenerateInsightButton'
import RequestCorrectionButton from '@/components/ai-insights/RequestCorrectionButton'

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

// ── Helper: renders el playbook en ambas vistas ───────────────
function PlaybookSection({
  playbook,
  title = '✦ Playbook — Acciones priorizadas',
}: {
  playbook: PlaybookItem[]
  title?: string
}) {
  if (!playbook.length) return null
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '14px 16px',
    }}>
      <h3 className="font-syne font-bold" style={{
        fontSize: 13, color: 'var(--text)', marginBottom: 12,
      }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {playbook.map((item, i) => (
          <div key={i} style={{
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
          }}>
            <div style={{
              fontSize: 10,
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
            }}>
              {item.timeframe?.toUpperCase() ?? (
                item.priority === 'urgent' ? 'HOY'
                  : item.priority === 'soon' ? 'SEMANA'
                    : 'MES'
              )}
            </div>
            <div>
              <div style={{
                fontSize: 12, fontWeight: 600,
                color: 'var(--text)', marginBottom: 2,
              }}>
                {item.action}
              </div>
              {item.reason && (
                <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
                  {item.reason}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default async function AiInsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; year?: string; view?: string }>
}) {
  const rawParams = await searchParams

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

  // 2. Semana ISO actual
  const now = new Date()
  const currentYear = now.getUTCFullYear()

  const jan4 = new Date(Date.UTC(now.getUTCFullYear(), 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  const week1Mon = new Date(jan4.getTime() - (jan4Day - 1) * 86400000)
  const diffDays = Math.floor((now.getTime() - week1Mon.getTime()) / 86400000)
  const currentWeekNumber = Math.floor(diffDays / 7) + 1

  const defaultTargetWeek = currentWeekNumber - 1
  const defaultTargetYear = currentYear

  const parsedWeek = rawParams.week ? Number.parseInt(rawParams.week, 10) : NaN
  const parsedYear = rawParams.year ? Number.parseInt(rawParams.year, 10) : NaN

  const selectedWeek =
    Number.isFinite(parsedWeek) && parsedWeek >= 1 && parsedWeek <= 53
      ? parsedWeek
      : defaultTargetWeek
  const selectedYear =
    Number.isFinite(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100
      ? parsedYear
      : defaultTargetYear

  // Sin empresa asignada
  if (!companyId) {
    return (
      <>
        <Topbar pageTitle="IA Insights" pageSubtitle="Análisis de tu negocio" />
        <div style={{ padding: '14px 16px' }}>
          <p style={{ fontFamily: 'var(--font-syne)', color: 'var(--muted)', fontSize: 14 }}>
            No tienes una empresa asignada.
          </p>
        </div>
      </>
    )
  }

  // 3. Análisis inicial (type='initial') — punto de partida del cliente
  const { data: initialInsight } = await supabase
    .from('ai_insights')
    .select(
      'id, executive_summary, insight_sales, insight_campaigns, insight_inventory, insight_finance, playbook, created_at'
    )
    .eq('company_id', companyId)
    .eq('type', 'initial')
    .maybeSingle()

  // Vista activa: si no hay parámetro, mostrar initial si existe, si no la semana
  const activeView = rawParams.view ?? (initialInsight ? 'initial' : 'weekly')

  // 4. Snapshots disponibles (para stale detection)
  const { data: snapsData } = await supabase
    .from('weekly_snapshots')
    .select('week_number, year, updated_at')
    .eq('company_id', companyId)
    .gt('total_sales', 0)
    .order('year', { ascending: false })
    .order('week_number', { ascending: false })
    .limit(20)

  const rawWeeks = snapsData ?? []

  // 5. Insight de la semana seleccionada
  const { data: currentInsight } = await supabase
    .from('ai_insights')
    .select(
      'id, week_number, year, insight_sales, insight_campaigns, insight_inventory, insight_finance, playbook, executive_summary, viewed_at, created_at'
    )
    .eq('company_id', companyId)
    .eq('week_number', selectedWeek)
    .eq('year', selectedYear)
    .neq('type', 'initial')
    .maybeSingle()

  // Detectar si el insight quedó desactualizado vs el snapshot
  const snapRowForStale = rawWeeks.find(
    (w) => w.week_number === selectedWeek && w.year === selectedYear
  )
  const insightIsStale = Boolean(
    currentInsight &&
      snapRowForStale?.updated_at &&
      new Date(currentInsight.created_at).getTime() <
        new Date(snapRowForStale.updated_at).getTime()
  )

  const canGenerate = (userRole === 'admin' || isPulseAdmin) && !currentInsight

  // 6. Historial de últimos 12 insights semanales
  const { data: insightHistory } = await supabase
    .from('ai_insights')
    .select('id, week_number, year, executive_summary, created_at, viewed_at')
    .eq('company_id', companyId)
    .neq('type', 'initial')
    .order('year', { ascending: false })
    .order('week_number', { ascending: false })
    .limit(12)

  const history = insightHistory ?? []

  // 7. Marcar como visto si se está viendo la semana y no estaba marcado
  if (activeView !== 'initial' && currentInsight && !currentInsight.viewed_at) {
    await supabase
      .from('ai_insights')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', currentInsight.id)
  }

  // 8. Datos suficientes para generar
  const { count: salesCount } = await supabase
    .from('sales')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .is('deleted_at', null)

  const hasEnoughData = (salesCount ?? 0) >= 1

  // Subtítulo dinámico del Topbar según vista activa
  const topbarSubtitle =
    activeView === 'initial'
      ? 'Diagnóstico inicial · Análisis 360° del historial'
      : `Análisis semanal · Semana ${selectedWeek}/${selectedYear}${
          selectedWeek === currentWeekNumber && selectedYear === currentYear
            ? ' · semana actual'
            : ''
        }`

  // Semanas semanales filtradas (week_number > 0)
  const weeklyHistory = history.filter((h) => h.week_number > 0)

  // Semanas con snapshot pero sin análisis aún
  const analyzedKeys = new Set(weeklyHistory.map((h) => `${h.year}-${h.week_number}`))
  const snapshotKeys = new Set(rawWeeks.map((w) => `${w.year}-${w.week_number}`))
  const pendingWeeks = rawWeeks
    .filter((w) => !analyzedKeys.has(`${w.year}-${w.week_number}`))
    .slice(0, 6)

  // Semanas del calendario sin snapshot ni análisis entre la última semana con datos
  // y la semana actual-1 (solo dentro del mismo año para simplificar)
  const lastSnapshotWeek = rawWeeks[0]?.week_number ?? 0
  const lastSnapshotYear = rawWeeks[0]?.year ?? defaultTargetYear
  const calendarGap: { week_number: number; year: number }[] = []
  if (lastSnapshotYear === defaultTargetYear && lastSnapshotWeek < defaultTargetWeek) {
    for (let w = lastSnapshotWeek + 1; w <= defaultTargetWeek; w++) {
      const key = `${defaultTargetYear}-${w}`
      if (!analyzedKeys.has(key) && !snapshotKeys.has(key)) {
        calendarGap.push({ week_number: w, year: defaultTargetYear })
      }
    }
  }

  return (
    <>
      <Topbar pageTitle="IA Insights" pageSubtitle={topbarSubtitle} />

      {/* Layout tipo inbox: columna izquierda scrolleable + columna derecha sticky */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 300px',
        gap: 14,
        padding: '14px 16px',
        alignItems: 'start',
      }}>

        {/* ── COLUMNA IZQUIERDA — contenido principal ─────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Vista: Diagnóstico Inicial */}
          {activeView === 'initial' && (
            initialInsight ? (
              <>
                {/* Header */}
                <div style={{
                  background: 'var(--card)',
                  border: '1px solid var(--gold-bdr)',
                  borderRadius: 12,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '14px 16px',
                    background: 'var(--gold-bg)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div>
                      <h2 className="font-syne font-bold" style={{
                        fontSize: 18, color: 'var(--text)',
                      }}>
                        Diagnóstico inicial de tu negocio
                      </h2>
                      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                        Generado el {formatDate(initialInsight.created_at)}
                        {' · '}Análisis 360° del historial completo
                      </p>
                    </div>
                  </div>

                  {/* Resumen ejecutivo */}
                  {initialInsight.executive_summary && (
                    <div style={{ padding: '16px 16px 0' }}>
                      <AiInsightBox
                        variant="gold"
                        title="✦ Diagnóstico ejecutivo"
                        text={initialInsight.executive_summary}
                      />
                    </div>
                  )}
                  <div style={{ height: 16 }} />
                </div>

                {/* 4 bloques de análisis */}
                {initialInsight.insight_sales && (
                  <div style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '14px 16px',
                  }}>
                    <h3 className="font-syne font-bold" style={{
                      fontSize: 13, color: 'var(--text)', marginBottom: 12,
                    }}>
                      💰 Análisis de Ventas
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
                      {initialInsight.insight_sales}
                    </p>
                  </div>
                )}

                {initialInsight.insight_campaigns && (
                  <div style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '14px 16px',
                  }}>
                    <h3 className="font-syne font-bold" style={{
                      fontSize: 13, color: 'var(--text)', marginBottom: 12,
                    }}>
                      📣 Análisis de Pautas
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
                      {initialInsight.insight_campaigns}
                    </p>
                  </div>
                )}

                {initialInsight.insight_inventory && (
                  <div style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '14px 16px',
                  }}>
                    <h3 className="font-syne font-bold" style={{
                      fontSize: 13, color: 'var(--text)', marginBottom: 12,
                    }}>
                      📦 Análisis de Inventario
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
                      {initialInsight.insight_inventory}
                    </p>
                  </div>
                )}

                {initialInsight.insight_finance && (
                  <div style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '14px 16px',
                  }}>
                    <h3 className="font-syne font-bold" style={{
                      fontSize: 13, color: 'var(--text)', marginBottom: 12,
                    }}>
                      🏦 Análisis Financiero
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
                      {initialInsight.insight_finance}
                    </p>
                  </div>
                )}

                {/* Playbook estratégico */}
                {initialInsight.playbook &&
                  Array.isArray(initialInsight.playbook) && (
                  <PlaybookSection
                    playbook={initialInsight.playbook as PlaybookItem[]}
                    title="✦ Plan de acción — próximos 30–90 días"
                  />
                )}
              </>
            ) : (
              /* Estado vacío cuando se navega a 'initial' pero no existe */
              <div style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 40,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
                <h2 className="font-syne font-bold" style={{
                  fontSize: 18, color: 'var(--text)', marginBottom: 8,
                }}>
                  Sin diagnóstico inicial
                </h2>
                <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 360, margin: '0 auto' }}>
                  El diagnóstico inicial es generado por el equipo de Pulse durante
                  el proceso de onboarding.
                </p>
              </div>
            )
          )}

          {/* Vista: Análisis semanal */}
          {activeView !== 'initial' && (
            <>
              {currentInsight ? (
                <>
                  {/* Header del insight semanal */}
                  <div style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '14px 16px',
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 12,
                    }}>
                      <div>
                        <h2 className="font-syne font-bold" style={{
                          fontSize: 18, color: 'var(--text)',
                        }}>
                          Análisis · Semana {currentInsight.week_number}
                        </h2>
                        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                          Generado el {formatDate(currentInsight.created_at)}
                        </p>
                      </div>
                      {/* Pulse Admin fuerza regeneración; cliente solicita corrección */}
                      {isPulseAdmin ? (
                        <GenerateInsightButton
                          companyId={companyId}
                          weekNumber={selectedWeek}
                          year={selectedYear}
                          hasExisting={true}
                          hasEnoughData={hasEnoughData}
                          label="↻ Forzar regeneración"
                          variant="ghost"
                        />
                      ) : (
                        <RequestCorrectionButton
                          companyId={companyId}
                          weekNumber={selectedWeek}
                          year={selectedYear}
                        />
                      )}
                    </div>

                    {insightIsStale && (
                      <div style={{ marginBottom: 12 }}>
                        <AiInsightBox
                          variant="blue"
                          title="⚠ Análisis desactualizado"
                          text="Los datos de esta semana fueron actualizados después de generar este análisis. Regenera para obtener el análisis correcto."
                        />
                      </div>
                    )}

                    {currentInsight.executive_summary && (
                      <AiInsightBox
                        variant="gold"
                        title="✦ Resumen ejecutivo"
                        text={currentInsight.executive_summary}
                      />
                    )}
                  </div>

                  {/* 4 módulos de análisis semanal */}
                  {currentInsight.insight_sales && (
                    <div style={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: '14px 16px',
                    }}>
                      <h3 className="font-syne font-bold" style={{
                        fontSize: 13, color: 'var(--text)', marginBottom: 12,
                      }}>
                        💰 Análisis de Ventas
                      </h3>
                      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
                        {currentInsight.insight_sales}
                      </p>
                    </div>
                  )}

                  {currentInsight.insight_campaigns && (
                    <div style={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: '14px 16px',
                    }}>
                      <h3 className="font-syne font-bold" style={{
                        fontSize: 13, color: 'var(--text)', marginBottom: 12,
                      }}>
                        📣 Análisis de Pautas
                      </h3>
                      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
                        {currentInsight.insight_campaigns}
                      </p>
                    </div>
                  )}

                  {currentInsight.insight_inventory && (
                    <div style={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: '14px 16px',
                    }}>
                      <h3 className="font-syne font-bold" style={{
                        fontSize: 13, color: 'var(--text)', marginBottom: 12,
                      }}>
                        📦 Análisis de Inventario
                      </h3>
                      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
                        {currentInsight.insight_inventory}
                      </p>
                    </div>
                  )}

                  {currentInsight.insight_finance && (
                    <div style={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: '14px 16px',
                    }}>
                      <h3 className="font-syne font-bold" style={{
                        fontSize: 13, color: 'var(--text)', marginBottom: 12,
                      }}>
                        🏦 Análisis Financiero
                      </h3>
                      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
                        {currentInsight.insight_finance}
                      </p>
                    </div>
                  )}

                  {currentInsight.playbook &&
                    Array.isArray(currentInsight.playbook) && (
                    <PlaybookSection
                      playbook={currentInsight.playbook as PlaybookItem[]}
                      title="✦ Playbook — Acciones priorizadas"
                    />
                  )}
                </>
              ) : (
                /* Estado vacío: no hay análisis para la semana seleccionada */
                <div style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 40,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
                  <h2 className="font-syne font-bold" style={{
                    fontSize: 18, color: 'var(--text)', marginBottom: 8,
                  }}>
                    Sin análisis esta semana
                  </h2>
                  <p style={{
                    fontSize: 13,
                    color: 'var(--muted)',
                    margin: '0 auto 24px',
                    maxWidth: 380,
                  }}>
                    {hasEnoughData
                      ? `Genera el análisis de la semana ${selectedWeek}/${selectedYear} para ver insights personalizados de tu negocio.`
                      : 'Registra al menos una venta para poder generar tu primer análisis de IA.'}
                  </p>
                  {canGenerate && hasEnoughData && (
                    <GenerateInsightButton
                      companyId={companyId}
                      weekNumber={selectedWeek}
                      year={selectedYear}
                      hasExisting={false}
                      hasEnoughData={hasEnoughData}
                      label={`✦ Generar análisis semana ${selectedWeek}/${selectedYear}`}
                      variant="primary"
                    />
                  )}
                  {!canGenerate && !currentInsight && (
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                      El análisis de la semana {selectedWeek} aún no ha sido
                      generado. Disponible para administradores.
                    </p>
                  )}
                  {!hasEnoughData && (
                    <AiInsightBox
                      variant="blue"
                      title="Datos insuficientes"
                      text="Registra ventas, pautas y movimientos bancarios para que la IA pueda analizar tu negocio con precisión."
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── COLUMNA DERECHA — navegación fija tipo inbox ────── */}
        <div style={{
          position: 'sticky',
          top: 52,
          height: 'calc(100vh - 66px)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>

          {/* Diagnóstico Inicial */}
          <div style={{
            background: 'var(--card)',
            border: `1px solid ${
              activeView === 'initial' ? 'var(--gold-bdr)' : 'var(--border)'
            }`,
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 14px',
              background: activeView === 'initial' ? 'var(--gold-bg)' : 'transparent',
              borderLeft: activeView === 'initial'
                ? '3px solid var(--gold)' : '3px solid transparent',
            }}>
              <div style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--gold)',
                fontWeight: 700,
                marginBottom: 5,
                fontFamily: 'var(--font-syne)',
              }}>
                ✦ Diagnóstico Inicial
              </div>
              {initialInsight ? (
                <a href="?view=initial" style={{ display: 'block', textDecoration: 'none' }}>
                  <div style={{
                    fontSize: 12,
                    color: activeView === 'initial' ? 'var(--gold)' : 'var(--text)',
                    fontWeight: 600,
                    marginBottom: 2,
                  }}>
                    Análisis 360° del historial
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    Generado el {formatDate(initialInsight.created_at)}
                  </div>
                </a>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Pendiente — generado por Pulse
                </div>
              )}
            </div>
          </div>

          {/* Historial semanal */}
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
            flex: 1,
          }}>
            <div style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--border)',
            }}>
              <h3 className="font-syne font-bold" style={{
                fontSize: 10,
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}>
                Análisis semanales ({weeklyHistory.length})
              </h3>
            </div>

            {weeklyHistory.length === 0 && pendingWeeks.length === 0 && calendarGap.length === 0 ? (
              <div style={{ padding: 14, fontSize: 12, color: 'var(--muted)' }}>
                Sin análisis generados aún
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>

                {/* Semanas recientes del calendario sin datos (brecha entre última semana con data y hoy) */}
                {calendarGap.map((w) => {
                  const isCalGapSelected =
                    activeView !== 'initial' &&
                    w.week_number === selectedWeek &&
                    w.year === selectedYear
                  return (
                    <a
                      key={`gap-${w.year}-${w.week_number}`}
                      href={`?week=${w.week_number}&year=${w.year}&view=weekly`}
                      style={{
                        display: 'block',
                        padding: '10px 14px',
                        textDecoration: 'none',
                        borderBottom: '1px solid var(--border)',
                        background: isCalGapSelected
                          ? 'rgba(37,99,235,0.06)'
                          : 'rgba(37,99,235,0.02)',
                        borderLeft: isCalGapSelected
                          ? '3px solid var(--blue)'
                          : '3px solid rgba(37,99,235,0.2)',
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 2,
                      }}>
                        <span className="font-syne font-bold" style={{
                          fontSize: 12,
                          color: isCalGapSelected ? 'var(--blue)' : 'var(--text)',
                        }}>
                          Semana {w.week_number}/{w.year}
                        </span>
                        <span style={{
                          fontSize: 9,
                          padding: '1px 6px',
                          borderRadius: 3,
                          fontWeight: 700,
                          background: 'rgba(37,99,235,0.1)',
                          color: 'var(--blue)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}>
                          Sin datos
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
                        No se cargaron ventas esta semana
                      </div>
                    </a>
                  )
                })}

                {/* Semanas con snapshot pero sin análisis — se muestran después */}
                {pendingWeeks.map((w, idx) => {
                  const isPendingSelected =
                    activeView !== 'initial' &&
                    w.week_number === selectedWeek &&
                    w.year === selectedYear
                  return (
                    <a
                      key={`pending-${w.year}-${w.week_number}`}
                      href={`?week=${w.week_number}&year=${w.year}&view=weekly`}
                      style={{
                        display: 'block',
                        padding: '10px 14px',
                        textDecoration: 'none',
                        borderBottom: '1px solid var(--border)',
                        background: isPendingSelected
                          ? 'rgba(232,165,0,0.06)'
                          : 'rgba(232,165,0,0.03)',
                        borderLeft: isPendingSelected
                          ? '3px solid var(--gold)'
                          : '3px solid rgba(232,165,0,0.3)',
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 2,
                      }}>
                        <span className="font-syne font-bold" style={{
                          fontSize: 12,
                          color: isPendingSelected ? 'var(--gold)' : 'var(--text)',
                        }}>
                          Semana {w.week_number}/{w.year}
                        </span>
                        <span style={{
                          fontSize: 9,
                          padding: '1px 6px',
                          borderRadius: 3,
                          fontWeight: 700,
                          background: 'rgba(232,165,0,0.12)',
                          color: 'var(--gold)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}>
                          Pendiente
                        </span>
                      </div>
                      {canGenerate && (
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
                          {idx === 0 ? 'Haz clic para generar el análisis' : 'Sin análisis generado'}
                        </div>
                      )}
                    </a>
                  )
                })}

                {/* Semanas con análisis generado */}
                {weeklyHistory.map((h, idx) => {
                  const isSelected =
                    activeView !== 'initial' &&
                    h.week_number === selectedWeek &&
                    h.year === selectedYear
                  return (
                    <a
                      key={h.id}
                      href={`?week=${h.week_number}&year=${h.year}&view=weekly`}
                      style={{
                        display: 'block',
                        padding: '10px 14px',
                        textDecoration: 'none',
                        borderBottom:
                          idx < weeklyHistory.length - 1
                            ? '1px solid var(--border)'
                            : 'none',
                        background: isSelected ? 'var(--gold-bg)' : 'transparent',
                        borderLeft: isSelected
                          ? '3px solid var(--gold)'
                          : '3px solid transparent',
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 3,
                      }}>
                        <span className="font-syne font-bold" style={{
                          fontSize: 12,
                          color: isSelected ? 'var(--gold)' : 'var(--text)',
                        }}>
                          Semana {h.week_number}/{h.year}
                        </span>
                        {/* Punto dorado si aún no fue visto */}
                        {!h.viewed_at && (
                          <span style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: 'var(--gold)',
                            flexShrink: 0,
                            display: 'inline-block',
                          }} />
                        )}
                      </div>
                      {h.executive_summary && (
                        <p style={{
                          fontSize: 11,
                          color: 'var(--text2)',
                          lineHeight: 1.4,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          margin: 0,
                        }}>
                          {h.executive_summary}
                        </p>
                      )}
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
                        {formatDate(h.created_at)}
                      </div>
                    </a>
                  )
                })}
              </div>
            )}

            {/* Footer: generar la semana pendiente seleccionada */}
            {canGenerate && !currentInsight && activeView !== 'initial' && (
              <div style={{
                padding: '10px 14px',
                borderTop: '1px solid var(--border)',
                background: 'rgba(232,165,0,0.04)',
              }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
                  S{selectedWeek}/{selectedYear} · sin análisis
                </div>
                <GenerateInsightButton
                  companyId={companyId}
                  weekNumber={selectedWeek}
                  year={selectedYear}
                  hasExisting={false}
                  hasEnoughData={hasEnoughData}
                  label="✦ Generar análisis"
                  variant="primary"
                />
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  )
}
