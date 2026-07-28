'use client'

import { useState } from 'react'

interface RequestCorrectionButtonProps {
  companyId: string
  weekNumber: number
  year: number
}

export default function RequestCorrectionButton({
  companyId,
  weekNumber,
  year,
}: RequestCorrectionButtonProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai-insights/request-correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, weekNumber, year, reason }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Error al enviar la solicitud')
        setLoading(false)
        return
      }
      setSent(true)
      setOpen(false)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div
        style={{
          fontSize: 11,
          color: 'var(--green)',
          fontWeight: 500,
          padding: '4px 10px',
          borderRadius: 6,
          background: 'rgba(5,150,105,0.08)',
          border: '1px solid rgba(5,150,105,0.2)',
        }}
      >
        ✓ Solicitud enviada — Pulse te contactará pronto
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          fontSize: 11,
          color: 'var(--muted)',
          background: 'transparent',
          border: '1px solid var(--border2)',
          borderRadius: 6,
          padding: '4px 10px',
          cursor: 'pointer',
          fontFamily: 'var(--font-jakarta)',
        }}
      >
        Solicitar corrección
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)',
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 24,
              width: '100%',
              maxWidth: 420,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="font-syne font-bold"
              style={{ fontSize: 15, marginBottom: 8 }}
            >
              Solicitar corrección de análisis
            </h3>
            <p
              style={{
                fontSize: 12,
                color: 'var(--text2)',
                marginBottom: 16,
                lineHeight: 1.6,
              }}
            >
              El equipo de Pulse revisará tu solicitud y regenerará el análisis
              de la{' '}
              <strong>
                semana {weekNumber}/{year}
              </strong>{' '}
              si corresponde. También puedes llamar a soporte Pulse para
              agilizar el proceso.
            </p>

            <label
              style={{
                fontSize: 9,
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 600,
                display: 'block',
                marginBottom: 4,
              }}
            >
              Motivo (opcional)
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Los datos de ventas fueron actualizados después de generar el análisis"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--border2)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: 12,
                fontFamily: 'var(--font-jakarta)',
                resize: 'vertical',
                marginBottom: 16,
                boxSizing: 'border-box',
              }}
            />

            {error && (
              <div
                style={{
                  background: 'rgba(220,38,38,0.06)',
                  border: '1px solid rgba(220,38,38,0.2)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  marginBottom: 12,
                  fontSize: 12,
                  color: 'var(--red)',
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: 8,
                  fontSize: 13,
                  background: 'var(--hover)',
                  color: 'var(--text2)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="font-syne font-bold"
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: 8,
                  fontSize: 13,
                  background: loading
                    ? 'rgba(232,165,0,0.5)'
                    : 'linear-gradient(135deg, #F5C842, #F09A1A)',
                  color: '#1A1B2E',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Enviando...' : 'Enviar solicitud'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
