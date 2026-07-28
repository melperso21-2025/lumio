'use client'

import { useState } from 'react'

interface ApproveAndRegenerateButtonProps {
  requestId: string
  companyId: string
  weekNumber: number
  year: number
}

export default function ApproveAndRegenerateButton({
  requestId,
  companyId,
  weekNumber,
  year,
}: ApproveAndRegenerateButtonProps) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // requestId se usa para referencia futura (ej: mostrar en logs)
  void requestId

  async function handleApprove() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai-insights/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          weekNumber,
          year,
          forcedByPulse: true,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Error al regenerar')
        setLoading(false)
        return
      }
      setDone(true)
      setTimeout(() => window.location.reload(), 1200)
    } catch {
      setError('Error de conexión')
      setLoading(false)
    }
  }

  if (done) {
    return (
      <span style={{ fontSize: 11, color: 'var(--green)' }}>✓ Regenerado</span>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {error && (
        <span style={{ fontSize: 10, color: 'var(--red)' }}>{error}</span>
      )}
      <button
        type="button"
        onClick={handleApprove}
        disabled={loading}
        className="font-syne font-bold"
        style={{
          fontSize: 11,
          padding: '4px 10px',
          borderRadius: 6,
          background: loading
            ? 'rgba(232,165,0,0.4)'
            : 'linear-gradient(135deg, #F5C842, #F09A1A)',
          color: '#1A1B2E',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Regenerando...' : 'Aprobar y regenerar'}
      </button>
    </div>
  )
}
