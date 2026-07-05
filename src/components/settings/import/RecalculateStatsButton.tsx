'use client'

import { useState } from 'react'

type State = 'idle' | 'loading' | 'ok' | 'error'

export default function RecalculateStatsButton() {
  const [state, setState] = useState<State>('idle')
  const [msg, setMsg]     = useState('')
  const [detail, setDetail] = useState('')

  async function handleClick() {
    setState('loading')
    setMsg('')
    setDetail('')
    try {
      const res = await fetch('/api/recalculate-stats', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error desconocido')
      setState('ok')
      const snapshots = json.snapshotsCalculated ?? 0
      setMsg('Todo listo.')
      setDetail(`Ventas, clientes y ${snapshots} semanas del dashboard actualizados.`)
    } catch (e) {
      setState('error')
      setMsg(e instanceof Error ? e.message : 'Error desconocido')
    }
  }

  if (state === 'loading') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: '14px 16px',
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18, animation: 'spin 1.2s linear infinite', display: 'inline-block' }}>
            ↻
          </span>
          <span
            className="font-syne font-bold"
            style={{ fontSize: 13, color: 'var(--gold)' }}
          >
            Recalculando estadísticas…
          </span>
        </div>
        <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
          Esto puede tomar unos segundos. Estamos actualizando ventas, clientes y todas las semanas del dashboard.
        </p>
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const colors: Record<State, string> = {
    idle:    'var(--gold)',
    loading: 'var(--muted)',
    ok:      'var(--green)',
    error:   'var(--red)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={handleClick}
          disabled={state === 'loading'}
          style={{
            fontFamily:  'var(--font-syne)',
            fontWeight:  700,
            fontSize:    12,
            padding:     '7px 16px',
            borderRadius: 8,
            border:      `1px solid ${colors[state]}`,
            background:  `${colors[state]}18`,
            color:       colors[state],
            cursor:      'pointer',
            transition:  'all 0.15s',
            whiteSpace:  'nowrap',
          }}
        >
          {state === 'ok' ? '✓ Recalculado' : state === 'error' ? '✗ Error — reintentar' : '↻ Recalcular estadísticas'}
        </button>

        {msg && (
          <span style={{ fontSize: 12, color: colors[state], fontFamily: 'var(--font-syne)' }}>
            {msg}
          </span>
        )}
      </div>

      {detail && (
        <p style={{ fontSize: 11, color: 'var(--green)', margin: 0, fontFamily: 'var(--font-syne)' }}>
          {detail}
        </p>
      )}

      <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
        Actualiza LTV, totales de ventas y snapshots del dashboard para todos los datos importados.
      </p>
    </div>
  )
}
