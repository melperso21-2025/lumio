'use client'

import { useState, useCallback } from 'react'

interface PlaybookAction {
  action: string
  reason: string
  priority: 'urgent' | 'soon' | 'later'
  timeframe: string
}

interface Highlight {
  tipo: 'bueno' | 'malo' | 'neutral'
  texto: string
}

interface ModuleInsight {
  headline: string
  alert: string | null
  summary: string
  highlights: Highlight[]
  details: string
  playbook: PlaybookAction[]
  usage: { used: number; quota: number }
}

interface ModuleAiButtonProps {
  module: 'sales' | 'purchases' | 'receivables' | 'payables' | 'inventory'
  /** Datos del módulo a analizar — se serializan y envían al API */
  getModuleData: () => Record<string, unknown>
  /** Cuota restante para mostrar en el tooltip */
  usageQuota?: { used: number; quota: number }
}

const PRIORITY_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  urgent: { bg: 'rgba(239,68,68,0.12)', color: '#DC2626',   label: 'Urgente'  },
  soon:   { bg: 'rgba(245,158,11,0.12)', color: '#D97706',  label: 'Pronto'   },
  later:  { bg: 'rgba(99,102,241,0.12)', color: '#4F46E5',  label: 'Después'  },
}

export default function ModuleAiButton({ module, getModuleData, usageQuota }: ModuleAiButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [insight, setInsight] = useState<ModuleInsight | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai-insights/module', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module, moduleData: getModuleData() }),
      })
      const data = await res.json() as ModuleInsight & { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Error desconocido')
      } else {
        setInsight(data)
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [module, getModuleData])

  const handleOpen = () => {
    setOpen(true)
    if (!insight) generate()
  }

  const quotaLeft = usageQuota ? usageQuota.quota - usageQuota.used : null

  return (
    <>
      {/* Botón trigger */}
      <button
        type="button"
        onClick={handleOpen}
        title={quotaLeft !== null ? `${quotaLeft} análisis restantes este mes` : 'Analizar con IA'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 14px',
          borderRadius: 8,
          border: '1px solid rgba(245,200,66,0.35)',
          background: 'rgba(245,200,66,0.08)',
          color: 'var(--gold, #F5C842)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background 150ms',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,200,66,0.15)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(245,200,66,0.08)')}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>✦</span>
        Analizar con IA
        {quotaLeft !== null && (
          <span style={{ opacity: 0.55, fontWeight: 400, fontSize: 11 }}>
            ({quotaLeft}/{usageQuota!.quota})
          </span>
        )}
      </button>

      {/* Panel lateral */}
      {open && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 49,
              background: 'rgba(0,0,0,0.35)',
            }}
          />

          {/* Panel */}
          <aside
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: 440, zIndex: 50,
              background: 'var(--surface, #13141F)',
              borderLeft: '1px solid var(--border, rgba(255,255,255,0.08))',
              display: 'flex', flexDirection: 'column',
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
              position: 'sticky', top: 0,
              background: 'var(--surface, #13141F)',
              zIndex: 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--gold, #F5C842)', fontSize: 16 }}>✦</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text, #F0F0F5)' }}>
                  Análisis IA
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {insight && (
                  <button
                    type="button"
                    onClick={generate}
                    disabled={loading}
                    style={{
                      fontSize: 11, padding: '4px 10px', borderRadius: 6,
                      border: '1px solid var(--border2, rgba(255,255,255,0.12))',
                      background: 'transparent', color: 'var(--muted, #8890A6)',
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? 'Regenerando…' : 'Regenerar'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    width: 28, height: 28, borderRadius: 6,
                    border: '1px solid var(--border2, rgba(255,255,255,0.12))',
                    background: 'transparent', color: 'var(--muted, #8890A6)',
                    cursor: 'pointer', fontSize: 16, lineHeight: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Cuerpo */}
            <div style={{ padding: '20px', flex: 1 }}>
              {loading && !insight && (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>✦</div>
                  <div style={{ color: 'var(--muted, #8890A6)', fontSize: 13 }}>
                    Analizando datos del módulo…
                  </div>
                </div>
              )}

              {error && (
                <div style={{
                  padding: '14px 16px', borderRadius: 10,
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: '#F87171', fontSize: 13,
                }}>
                  {error}
                </div>
              )}

              {insight && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                  {/* Alerta urgente */}
                  {insight.alert && (
                    <div style={{
                      padding: '12px 14px', borderRadius: 10,
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                    }}>
                      <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>🚨</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#F87171', lineHeight: 1.4 }}>
                        {insight.alert}
                      </span>
                    </div>
                  )}

                  {/* Headline */}
                  <div style={{
                    padding: '14px 16px', borderRadius: 10,
                    background: 'rgba(245,200,66,0.07)',
                    border: '1px solid rgba(245,200,66,0.2)',
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold, #F5C842)', marginBottom: 8 }}>
                      En resumen
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.5, color: 'var(--text, #F0F0F5)', margin: '0 0 8px' }}>
                      {insight.headline}
                    </p>
                    <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text2, #C0C4D6)', margin: 0 }}>
                      {insight.summary}
                    </p>
                  </div>

                  {/* Highlights */}
                  {insight.highlights?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted, #8890A6)' }}>
                        Hallazgos clave
                      </div>
                      {insight.highlights.map((h, i) => {
                        const icon = h.tipo === 'bueno' ? '✅' : h.tipo === 'malo' ? '⚠️' : 'ℹ️'
                        const color = h.tipo === 'bueno' ? '#4ADE80' : h.tipo === 'malo' ? '#FBBF24' : 'var(--text2, #C0C4D6)'
                        return (
                          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <span style={{ flexShrink: 0, fontSize: 13 }}>{icon}</span>
                            <span style={{ fontSize: 13, color, lineHeight: 1.5 }}>{h.texto}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Análisis detallado */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted, #8890A6)', marginBottom: 10 }}>
                      Análisis completo
                    </div>
                    {insight.details.split('\n\n').map((para, i) => (
                      <p key={i} style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text2, #C0C4D6)', margin: '0 0 12px' }}>
                        {para}
                      </p>
                    ))}
                  </div>

                  {/* Playbook */}
                  {insight.playbook?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted, #8890A6)', marginBottom: 10 }}>
                        Qué hacer ahora
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {insight.playbook.map((item, i) => {
                          const ps = PRIORITY_STYLE[item.priority] ?? PRIORITY_STYLE.soon
                          return (
                            <div
                              key={i}
                              style={{
                                padding: '12px 14px', borderRadius: 10,
                                background: 'var(--hover, rgba(255,255,255,0.03))',
                                border: `1px solid ${item.priority === 'urgent' ? 'rgba(239,68,68,0.25)' : 'var(--border2, rgba(255,255,255,0.07))'}`,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, #F0F0F5)', lineHeight: 1.4 }}>
                                  {item.action}
                                </span>
                                <span style={{
                                  flexShrink: 0, fontSize: 10, fontWeight: 700,
                                  padding: '2px 7px', borderRadius: 5,
                                  background: ps.bg, color: ps.color,
                                }}>
                                  {ps.label}
                                </span>
                              </div>
                              <p style={{ fontSize: 12, color: 'var(--muted, #8890A6)', margin: '0 0 4px', lineHeight: 1.5 }}>
                                {item.reason}
                              </p>
                              <span style={{ fontSize: 11, color: 'var(--muted, #8890A6)', opacity: 0.7 }}>
                                ⏱ {item.timeframe}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Uso */}
                  <div style={{ fontSize: 11, color: 'var(--muted, #8890A6)', textAlign: 'right', opacity: 0.6 }}>
                    {insight.usage.used}/{insight.usage.quota} análisis usados este mes
                  </div>
                </div>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  )
}
