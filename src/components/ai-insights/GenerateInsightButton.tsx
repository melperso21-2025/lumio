'use client'

import { useState } from 'react'

interface GenerateInsightButtonProps {
  companyId: string
  weekNumber: number
  year: number
  hasExisting: boolean
  hasEnoughData: boolean
  label: string
  variant: 'primary' | 'ghost'
}

export default function GenerateInsightButton({
  companyId,
  weekNumber,
  year,
  hasExisting,
  hasEnoughData,
  label,
  variant,
}: GenerateInsightButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai-insights/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, weekNumber, year }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Error al generar el análisis')
        setLoading(false)
        return
      }

      setSuccess(true)
      // Refrescar la página para mostrar el nuevo insight
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div>
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

      {success && (
        <div
          style={{
            background: 'rgba(5,150,105,0.08)',
            border: '1px solid rgba(5,150,105,0.2)',
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: 12,
            fontSize: 12,
            color: 'var(--green)',
            fontWeight: 500,
          }}
        >
          ✓ Análisis generado — cargando...
        </div>
      )}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading || success}
        className="font-syne font-bold"
        style={
          variant === 'primary'
            ? {
                background: loading
                  ? 'rgba(232,165,0,0.5)'
                  : 'linear-gradient(135deg, #F5C842, #F09A1A)',
                color: '#1A1B2E',
                padding: '10px 24px',
                borderRadius: 8,
                fontSize: 14,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }
            : {
                background: 'transparent',
                color: 'var(--gold)',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12,
                border: '1px solid var(--gold-bdr)',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }
        }
      >
        {loading ? '✦ Analizando...' : success ? '✓ Listo' : label}
      </button>
    </div>
  )
}
