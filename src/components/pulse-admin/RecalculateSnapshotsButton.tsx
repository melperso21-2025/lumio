'use client'

import { useState } from 'react'

export default function RecalculateSnapshotsButton() {
  const [loading, setLoading] = useState(false)
  const [loadingAll, setLoadingAll] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch('/api/snapshots/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      const data = (await res.json()) as {
        success?: boolean
        processed?: number
        errors?: { companyId: string; message: string }[]
        error?: string
      }

      if (!res.ok) {
        setError(data.error ?? `Error HTTP ${res.status}`)
        return
      }

      const n = data.processed ?? 0
      const errCount = data.errors?.length ?? 0
      if (errCount > 0) {
        const first = data.errors?.[0]?.message ?? ''
        setMessage(
          `✓ ${n} empresa${n !== 1 ? 's' : ''} procesada${n !== 1 ? 's' : ''}. ${errCount} error(es): ${first}`
        )
        return
      }
      setMessage(`✓ ${n} empresa${n !== 1 ? 's' : ''} procesada${n !== 1 ? 's' : ''}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  async function handleRecalculateAll() {
    setLoadingAll(true)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch('/api/snapshots/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true, recalculateAll: true }),
      })
      const data = (await res.json()) as {
        success?: boolean
        message?: string
        processed?: number
        errors?: { companyId: string; message: string }[]
        error?: string
      }

      if (!res.ok) {
        setError(data.error ?? `Error HTTP ${res.status}`)
        return
      }

      const msg = data.message ?? ''
      const n = data.processed ?? 0
      const errCount = data.errors?.length ?? 0
      if (errCount > 0) {
        const first = data.errors?.[0]?.message ?? ''
        setMessage(`${msg} (${errCount} error(es): ${first})`)
        return
      }
      setMessage(msg || `✓ ${n} snapshot(s) recalculado(s)`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setLoadingAll(false)
    }
  }

  const busy = loading || loadingAll

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        alignItems: 'flex-start',
        maxWidth: 360,
      }}
    >
      <button
        type="button"
        disabled={busy}
        onClick={handleClick}
        style={{
          background: loading
            ? 'var(--hover)'
            : 'linear-gradient(135deg, #F5C842, #F09A1A)',
          color: loading ? 'var(--muted)' : '#1A1B2E',
          fontFamily: 'var(--font-syne)',
          fontWeight: 700,
          fontSize: 13,
          padding: '8px 16px',
          borderRadius: 8,
          border: loading ? '1px solid var(--border2)' : '1px solid var(--gold-bdr, rgba(240,154,26,0.35))',
          cursor: busy ? 'not-allowed' : 'pointer',
          opacity: busy && !loading ? 0.75 : 1,
        }}
      >
        {loading ? 'Procesando…' : 'Recalcular snapshots semana actual'}
      </button>
      <p
        style={{
          fontSize: 11,
          color: 'var(--muted)',
          margin: 0,
          lineHeight: 1.45,
          fontFamily: 'var(--font-jakarta)',
        }}
      >
        Esto recalcula todos los snapshots históricos — puede tardar unos segundos.
      </p>
      <button
        type="button"
        className="btn-ghost"
        disabled={busy}
        onClick={handleRecalculateAll}
      >
        {loadingAll ? 'Procesando histórico…' : 'Recalcular histórico completo'}
      </button>
      {message && (
        <p
          style={{
            fontSize: 12,
            color: 'var(--green)',
            margin: 0,
            fontFamily: 'var(--font-jakarta)',
          }}
        >
          {message}
        </p>
      )}
      {error && (
        <p
          style={{
            fontSize: 12,
            color: 'var(--red)',
            margin: 0,
            fontFamily: 'var(--font-jakarta)',
          }}
        >
          {error}
        </p>
      )}
    </div>
  )
}
