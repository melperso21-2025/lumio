'use client'

import { useState } from 'react'

interface Props {
  companyId: string
  companyName: string
  hasInitial: boolean
}

export default function GenerateInitialInsightButton({
  companyId,
  companyName,
  hasInitial,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    setConfirm(false)
    try {
      const res = await fetch('/api/ai-insights/generate-initial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Error al generar')
        setLoading(false)
        return
      }
      setDone(true)
      setTimeout(() => window.location.reload(), 1500)
    } catch {
      setError('Error de conexión')
      setLoading(false)
    }
  }

  if (hasInitial) {
    return (
      <span
        style={{
          fontSize: 10,
          padding: '2px 8px',
          borderRadius: 4,
          background: 'rgba(5,150,105,0.1)',
          color: 'var(--green)',
          fontWeight: 600,
        }}
      >
        ✓ Análisis inicial generado
      </span>
    )
  }

  if (done) {
    return (
      <span
        style={{
          fontSize: 10,
          padding: '2px 8px',
          borderRadius: 4,
          background: 'rgba(5,150,105,0.1)',
          color: 'var(--green)',
          fontWeight: 600,
        }}
      >
        ✓ Generado
      </span>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        alignItems: 'flex-end',
      }}
    >
      {error && (
        <span style={{ fontSize: 10, color: 'var(--red)' }}>{error}</span>
      )}

      {confirm ? (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--text2)' }}>
            ¿Generar análisis 360 de {companyName}?
          </span>
          <button
            type="button"
            onClick={() => setConfirm(false)}
            style={{
              fontSize: 10,
              padding: '3px 8px',
              borderRadius: 4,
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
            onClick={handleGenerate}
            disabled={loading}
            className="font-syne font-bold"
            style={{
              fontSize: 10,
              padding: '3px 10px',
              borderRadius: 4,
              background: loading
                ? 'rgba(232,165,0,0.4)'
                : 'linear-gradient(135deg, #F5C842, #F09A1A)',
              color: '#1A1B2E',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '✦ Analizando...' : 'Confirmar'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          style={{
            fontSize: 10,
            padding: '3px 10px',
            borderRadius: 4,
            background: 'rgba(232,165,0,0.08)',
            color: 'var(--gold)',
            border: '1px solid var(--gold-bdr)',
            cursor: 'pointer',
            fontFamily: 'var(--font-jakarta)',
          }}
        >
          ✦ Generar análisis inicial
        </button>
      )}
    </div>
  )
}
