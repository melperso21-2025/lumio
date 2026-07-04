'use client'

import { useState } from 'react'

type State = 'idle' | 'loading' | 'ok' | 'error'

export default function RecalculateStatsButton() {
  const [state, setState] = useState<State>('idle')
  const [msg, setMsg]     = useState('')

  async function handleClick() {
    setState('loading')
    setMsg('')
    try {
      const res = await fetch('/api/recalculate-stats', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error desconocido')
      setState('ok')
      setMsg('Estadísticas recalculadas correctamente.')
    } catch (e) {
      setState('error')
      setMsg(e instanceof Error ? e.message : 'Error desconocido')
    }
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
            fontFamily:    'var(--font-syne)',
            fontWeight:    700,
            fontSize:      12,
            padding:       '7px 16px',
            borderRadius:  8,
            border:        `1px solid ${colors[state]}`,
            background:    state === 'loading' ? 'transparent' : `${colors[state]}18`,
            color:         colors[state],
            cursor:        state === 'loading' ? 'not-allowed' : 'pointer',
            transition:    'all 0.15s',
            whiteSpace:    'nowrap',
          }}
        >
          {state === 'loading' ? 'Recalculando…' : '↻ Recalcular estadísticas'}
        </button>

        {msg && (
          <span style={{ fontSize: 12, color: colors[state], fontFamily: 'var(--font-syne)' }}>
            {msg}
          </span>
        )}
      </div>

      <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
        Actualiza LTV, última compra y totales de ventas a partir de los datos importados.
      </p>
    </div>
  )
}
