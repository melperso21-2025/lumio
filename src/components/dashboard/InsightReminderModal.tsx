'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// ── Tipos ────────────────────────────────────────────────────
interface PlaybookItem {
  action: string
  reason?: string
  priority: 'urgent' | 'soon' | 'later'
  timeframe?: string
}

export type ModalScenario =
  | 'no-data'            // sin datos de ningún tipo
  | 'initial-insight'    // tiene datos + diagnóstico inicial generado
  | 'new-week-insight'   // nueva semana + insights de la semana anterior listos
  | 'new-week-missing'   // nueva semana + sin insights de la semana anterior

interface InsightReminderModalProps {
  scenario: ModalScenario
  companyName?: string
  // Para scenario 'initial-insight'
  initialSummary?: string | null
  initialPlaybook?: PlaybookItem[] | null
  // Para scenario 'new-week-insight' y 'new-week-missing'
  weekNumber?: number
  weekYear?: number
  weeklySummary?: string | null
  weeklyPlaybook?: PlaybookItem[] | null
  // Para 'new-week-missing': distinguir si el problema es sin datos o sin análisis
  hasData?: boolean
  // Clave única de la semana para recordar si ya fue dismissado
  dismissKey: string
}

// ── Badge de prioridad del playbook ─────────────────────────
function PriorityBadge({ priority }: { priority: string }) {
  const configs = {
    urgent: { bg: 'rgba(220,38,38,0.1)', color: 'var(--red)', label: 'HOY' },
    soon:   { bg: 'rgba(217,119,6,0.1)', color: 'var(--orange)', label: 'SEMANA' },
    later:  { bg: 'rgba(232,165,0,0.1)', color: 'var(--gold)', label: 'MES' },
  }
  const cfg = configs[priority as keyof typeof configs] ?? configs.later
  return (
    <span style={{
      fontSize: 9, fontWeight: 700,
      padding: '2px 7px', borderRadius: 3,
      background: cfg.bg, color: cfg.color,
      textTransform: 'uppercase', letterSpacing: '0.06em',
      flexShrink: 0,
    }}>
      {cfg.label}
    </span>
  )
}

export default function InsightReminderModal({
  scenario,
  companyName,
  initialSummary,
  initialPlaybook,
  weekNumber,
  weekYear,
  weeklySummary,
  weeklyPlaybook,
  hasData = true,
  dismissKey,
}: InsightReminderModalProps) {
  const [visible, setVisible] = useState(false)

  // Mostrar una vez por día (clave con fecha + scenario para que cambie si cambia el escenario)
  useEffect(() => {
    const storageKey = `lumio-modal-${dismissKey}-${scenario}`
    try {
      const dismissed = localStorage.getItem(storageKey)
      if (!dismissed) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [dismissKey, scenario])

  function dismiss() {
    setVisible(false)
    const storageKey = `lumio-modal-${dismissKey}-${scenario}`
    try {
      localStorage.setItem(storageKey, '1')
    } catch { /* noop */ }
  }

  // Cerrar con Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') dismiss()
    }
    if (visible) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  if (!visible) return null

  // ── Contenido según escenario ────────────────────────────
  const content = (() => {
    if (scenario === 'no-data') return (
      <NoDataContent companyName={companyName} onDismiss={dismiss} />
    )
    if (scenario === 'initial-insight') return (
      <InitialInsightContent
        summary={initialSummary}
        playbook={initialPlaybook}
        onDismiss={dismiss}
      />
    )
    if (scenario === 'new-week-insight') return (
      <NewWeekInsightContent
        weekNumber={weekNumber!}
        weekYear={weekYear!}
        summary={weeklySummary}
        playbook={weeklyPlaybook}
        onDismiss={dismiss}
      />
    )
    if (scenario === 'new-week-missing') return (
      <NewWeekMissingContent
        weekNumber={weekNumber!}
        weekYear={weekYear!}
        hasData={hasData}
        onDismiss={dismiss}
      />
    )
    return null
  })()

  return (
    <>
      {/* Overlay */}
      <div
        onClick={dismiss}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          background: 'rgba(10,10,20,0.55)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
        }}
      />
      {/* Modal */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 201,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        pointerEvents: 'none',
      }}>
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            pointerEvents: 'auto',
            width: '100%',
            maxWidth: 520,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
            overflow: 'hidden',
            animation: 'lumio-modal-in 0.2s ease',
          }}
        >
          {content}
        </div>
      </div>

      <style>{`
        @keyframes lumio-modal-in {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  )
}

// ── Botón X de cierre reutilizable ───────────────────────────
function CloseButton({ onDismiss }: { onDismiss: () => void }) {
  return (
    <button
      type="button"
      onClick={onDismiss}
      aria-label="Cerrar"
      style={{
        position: 'absolute',
        top: 14, right: 14,
        width: 28, height: 28,
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--hover)',
        color: 'var(--muted)',
        cursor: 'pointer',
        fontSize: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-syne)',
      }}
    >
      ✕
    </button>
  )
}

// ── CASO 1: Sin datos ────────────────────────────────────────
function NoDataContent({
  companyName,
  onDismiss,
}: {
  companyName?: string
  onDismiss: () => void
}) {
  return (
    <div style={{ position: 'relative' }}>
      <CloseButton onDismiss={onDismiss} />
      {/* Header */}
      <div style={{
        padding: '24px 24px 20px',
        background: 'linear-gradient(135deg, rgba(232,165,0,0.08), rgba(245,200,66,0.04))',
        borderBottom: '1px solid var(--gold-bdr)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>✦</div>
        <h2 className="font-syne font-bold" style={{
          fontSize: 18, color: 'var(--text)', marginBottom: 6,
        }}>
          Bienvenido{companyName ? ` a lumio, ${companyName}` : ' a lumio'}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, maxWidth: 380, margin: '0 auto' }}>
          Lumio está listo para darte insights inteligentes sobre tu negocio.
          Para empezar, necesitamos que ingreses tus datos operativos.
        </p>
      </div>

      {/* Pasos */}
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {[
            { num: '1', label: 'Registra tus ventas', desc: 'Ventas manuales o importación CSV', href: '/sales' },
            { num: '2', label: 'Carga tus pautas', desc: 'Meta Ads, Google Ads, etc.', href: '/ad-campaigns' },
            { num: '3', label: 'Conecta tu caja', desc: 'Cuentas bancarias y transacciones', href: '/finance' },
          ].map((step) => (
            <Link key={step.num} href={step.href} onClick={onDismiss} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', textDecoration: 'none',
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 10,
            }}>
              <span className="font-syne font-bold" style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg,#F5C842,#F09A1A)',
                color: '#1A1B2E', fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {step.num}
              </span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                  {step.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{step.desc}</div>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>→</span>
            </Link>
          ))}
        </div>

        <Link href="/settings/import" onClick={onDismiss} style={{
          display: 'block', textAlign: 'center',
          padding: '10px 0', borderRadius: 10,
          background: 'linear-gradient(135deg,#F5C842,#F09A1A)',
          color: '#1A1B2E', textDecoration: 'none',
          fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 13,
        }}>
          ⬆ Importar datos desde CSV
        </Link>
      </div>
    </div>
  )
}

// ── CASO 2: Diagnóstico inicial generado ────────────────────
function InitialInsightContent({
  summary,
  playbook,
  onDismiss,
}: {
  summary?: string | null
  playbook?: PlaybookItem[] | null
  onDismiss: () => void
}) {
  const topItems = (playbook ?? []).slice(0, 3)
  return (
    <div style={{ position: 'relative' }}>
      <CloseButton onDismiss={onDismiss} />
      {/* Header dorado */}
      <div style={{
        padding: '20px 24px 16px',
        background: 'linear-gradient(135deg, rgba(232,165,0,0.1), rgba(245,200,66,0.05))',
        borderBottom: '1px solid var(--gold-bdr)',
      }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: 'var(--gold)',
          textTransform: 'uppercase', letterSpacing: '0.1em',
          marginBottom: 6, fontFamily: 'var(--font-syne)',
        }}>
          ✦ Diagnóstico inicial de tu negocio
        </div>
        <h2 className="font-syne font-bold" style={{
          fontSize: 16, color: 'var(--text)', marginBottom: 4,
        }}>
          Ya tenemos el análisis completo
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
          Pulse analizó tu historial y preparó recomendaciones estratégicas.
          Tómalas en cuenta para tomar mejores decisiones esta semana.
        </p>
      </div>

      <div style={{ padding: '16px 24px' }}>
        {/* Resumen ejecutivo */}
        {summary && (
          <div style={{
            background: 'var(--gold-bg)', border: '1px solid var(--gold-bdr)',
            borderRadius: 10, padding: '12px 14px', marginBottom: 14,
            fontSize: 12, color: 'var(--text2)', lineHeight: 1.7,
          }}>
            {summary}
          </div>
        )}

        {/* Top 3 acciones del playbook */}
        {topItems.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              fontFamily: 'var(--font-syne)', marginBottom: 2,
            }}>
              Plan de acción
            </div>
            {topItems.map((item, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                padding: '8px 12px', borderRadius: 8,
                background: 'var(--bg)', border: '1px solid var(--border)',
              }}>
                <PriorityBadge priority={item.priority} />
                <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>
                  {item.action}
                </div>
              </div>
            ))}
          </div>
        )}

        <Link href="/ai-insights?view=initial" onClick={onDismiss} style={{
          display: 'block', textAlign: 'center',
          padding: '10px 0', borderRadius: 10,
          background: 'linear-gradient(135deg,#F5C842,#F09A1A)',
          color: '#1A1B2E', textDecoration: 'none',
          fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 13,
        }}>
          Ver diagnóstico completo →
        </Link>
      </div>
    </div>
  )
}

// ── CASO 3: Nueva semana + insights anteriores listos ────────
function NewWeekInsightContent({
  weekNumber,
  weekYear,
  summary,
  playbook,
  onDismiss,
}: {
  weekNumber: number
  weekYear: number
  summary?: string | null
  playbook?: PlaybookItem[] | null
  onDismiss: () => void
}) {
  const topItems = (playbook ?? []).slice(0, 3)
  return (
    <div style={{ position: 'relative' }}>
      <CloseButton onDismiss={onDismiss} />
      {/* Header */}
      <div style={{
        padding: '20px 24px 16px',
        background: 'linear-gradient(135deg, rgba(232,165,0,0.1), rgba(245,200,66,0.05))',
        borderBottom: '1px solid var(--gold-bdr)',
      }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: 'var(--gold)',
          textTransform: 'uppercase', letterSpacing: '0.1em',
          marginBottom: 6, fontFamily: 'var(--font-syne)',
        }}>
          ✦ Insights · Semana {weekNumber}/{weekYear}
        </div>
        <h2 className="font-syne font-bold" style={{
          fontSize: 16, color: 'var(--text)', marginBottom: 4,
        }}>
          Semana nueva — recuerda aplicar los insights
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
          Comenzó una nueva semana. Tienes análisis pendientes de revisar y
          acciones que deberías tomar en cuenta hoy.
        </p>
      </div>

      <div style={{ padding: '16px 24px' }}>
        {/* Resumen ejecutivo */}
        {summary && (
          <div style={{
            background: 'var(--gold-bg)', border: '1px solid var(--gold-bdr)',
            borderRadius: 10, padding: '12px 14px', marginBottom: 14,
            fontSize: 12, color: 'var(--text2)', lineHeight: 1.7,
          }}>
            {summary}
          </div>
        )}

        {/* Top 3 del playbook */}
        {topItems.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              fontFamily: 'var(--font-syne)', marginBottom: 2,
            }}>
              Acciones priorizadas para esta semana
            </div>
            {topItems.map((item, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                padding: '8px 12px', borderRadius: 8,
                background: 'var(--bg)', border: '1px solid var(--border)',
              }}>
                <PriorityBadge priority={item.priority} />
                <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>
                  {item.action}
                  {item.reason && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      {item.reason}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Link
          href={`/ai-insights?week=${weekNumber}&year=${weekYear}&view=weekly`}
          onClick={onDismiss}
          style={{
            display: 'block', textAlign: 'center',
            padding: '10px 0', borderRadius: 10,
            background: 'linear-gradient(135deg,#F5C842,#F09A1A)',
            color: '#1A1B2E', textDecoration: 'none',
            fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 13,
          }}
        >
          Ver análisis completo S{weekNumber} →
        </Link>
      </div>
    </div>
  )
}

// ── CASO 4: Nueva semana + sin datos o sin insights ──────────
function NewWeekMissingContent({
  weekNumber,
  weekYear,
  hasData,
  onDismiss,
}: {
  weekNumber: number
  weekYear: number
  hasData: boolean
  onDismiss: () => void
}) {
  return (
    <div style={{ position: 'relative' }}>
      <CloseButton onDismiss={onDismiss} />
      {/* Header ámbar */}
      <div style={{
        padding: '20px 24px 16px',
        background: 'linear-gradient(135deg, rgba(217,119,6,0.08), rgba(245,200,66,0.04))',
        borderBottom: '1px solid rgba(217,119,6,0.25)',
      }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: 'var(--orange)',
          textTransform: 'uppercase', letterSpacing: '0.1em',
          marginBottom: 6, fontFamily: 'var(--font-syne)',
        }}>
          ⚠ Semana {weekNumber}/{weekYear} — Acción requerida
        </div>
        <h2 className="font-syne font-bold" style={{
          fontSize: 16, color: 'var(--text)', marginBottom: 4,
        }}>
          {hasData
            ? 'La semana pasó y aún no hay análisis'
            : 'Sin datos para la semana anterior'}
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
          {hasData
            ? `Ya terminó la semana ${weekNumber} y tienes datos sin analizar. Genera el análisis para que la IA te diga qué acciones tomar.`
            : `La semana ${weekNumber} terminó pero no se cargaron datos de ventas, pautas ni movimientos bancarios. Mantén tus datos al día para aprovechar los insights de IA.`}
        </p>
      </div>

      <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {hasData ? (
          <>
            <Link
              href={`/ai-insights?week=${weekNumber}&year=${weekYear}&view=weekly`}
              onClick={onDismiss}
              style={{
                display: 'block', textAlign: 'center',
                padding: '11px 0', borderRadius: 10,
                background: 'linear-gradient(135deg,#F5C842,#F09A1A)',
                color: '#1A1B2E', textDecoration: 'none',
                fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 13,
              }}
            >
              ✦ Generar análisis semana {weekNumber} →
            </Link>
            <button
              type="button"
              onClick={onDismiss}
              style={{
                padding: '9px 0', borderRadius: 10, width: '100%',
                background: 'transparent', border: '1px solid var(--border)',
                color: 'var(--muted)', cursor: 'pointer', fontSize: 12,
                fontFamily: 'var(--font-jakarta)',
              }}
            >
              Recordar más tarde
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Registrar ventas', href: '/sales', icon: '💰' },
                { label: 'Registrar pautas', href: '/ad-campaigns', icon: '📣' },
                { label: 'Registrar transacciones', href: '/finance', icon: '🏦' },
              ].map((item) => (
                <Link key={item.href} href={item.href} onClick={onDismiss} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 14px', textDecoration: 'none',
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 10,
                }}>
                  <span style={{ fontSize: 14 }}>{item.icon}</span>
                  <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>
                    {item.label}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>→</span>
                </Link>
              ))}
            </div>
            <Link href="/settings/import" onClick={onDismiss} style={{
              display: 'block', textAlign: 'center', marginTop: 4,
              padding: '10px 0', borderRadius: 10,
              background: 'linear-gradient(135deg,#F5C842,#F09A1A)',
              color: '#1A1B2E', textDecoration: 'none',
              fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 13,
            }}>
              ⬆ Importar datos desde CSV
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
