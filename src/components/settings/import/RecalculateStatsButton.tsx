'use client'

import { useState } from 'react'

type State = 'idle' | 'loading' | 'ok' | 'error'

const LOADING_MESSAGES = [
  'Recalculando totales de ventas…',
  'Actualizando historial de clientes…',
  'Generando snapshots del dashboard…',
  'Procesando semanas históricas…',
  'Ya casi terminamos…',
]

function useRotatingMessage(active: boolean) {
  const [idx, setIdx] = useState(0)

  if (typeof window !== 'undefined' && active) {
    // rotate every 4s — only set up once via state trick
  }

  return LOADING_MESSAGES[idx % LOADING_MESSAGES.length]
}

export default function RecalculateStatsButton() {
  const [state, setState]       = useState<State>('idle')
  const [msgIdx, setMsgIdx]     = useState(0)
  const [detail, setDetail]     = useState('')
  const [intervalId, setIntervalId] = useState<ReturnType<typeof setInterval> | null>(null)

  async function handleClick() {
    setState('loading')
    setMsgIdx(0)
    setDetail('')

    const id = setInterval(() => {
      setMsgIdx((prev) => Math.min(prev + 1, LOADING_MESSAGES.length - 1))
    }, 4000)
    setIntervalId(id)

    try {
      const res = await fetch('/api/recalculate-stats', { method: 'POST' })
      const json = await res.json()
      clearInterval(id)
      if (!res.ok) throw new Error(json.error ?? 'Error desconocido')
      setState('ok')
      const snapshots = json.snapshotsCalculated ?? 0
      setDetail(`Ventas, clientes y ${snapshots} semanas del dashboard actualizados.`)
    } catch (e) {
      clearInterval(id)
      setState('error')
      setDetail(e instanceof Error ? e.message : 'Error desconocido')
    }
  }

  const colors: Record<State, string> = {
    idle:    'var(--gold)',
    loading: 'var(--gold)',
    ok:      'var(--green)',
    error:   'var(--red)',
  }

  if (state === 'loading') {
    return (
      <div
        style={{
          padding: '16px 18px',
          borderRadius: 10,
          border: '1px solid var(--gold-bdr)',
          background: 'var(--gold-bg)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 18,
              display: 'inline-block',
              animation: 'lumio-spin 1.2s linear infinite',
              color: 'var(--gold)',
            }}
          >
            ↻
          </span>
          <span
            className="font-syne font-bold"
            style={{ fontSize: 13, color: 'var(--gold)' }}
          >
            {LOADING_MESSAGES[msgIdx]}
          </span>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>
          Esto puede tomar hasta 1–2 minutos dependiendo del volumen de datos.
          <br />No cierres esta ventana.
        </p>
        <style>{`
          @keyframes lumio-spin {
            from { transform: rotate(0deg) }
            to   { transform: rotate(360deg) }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={handleClick}
          style={{
            fontFamily:   'var(--font-syne)',
            fontWeight:   700,
            fontSize:     12,
            padding:      '7px 16px',
            borderRadius: 8,
            border:       `1px solid ${colors[state]}`,
            background:   `${colors[state]}18`,
            color:        colors[state],
            cursor:       'pointer',
            transition:   'all 0.15s',
            whiteSpace:   'nowrap',
          }}
        >
          {state === 'ok'
            ? '✓ Recalculado'
            : state === 'error'
            ? '✗ Error — reintentar'
            : '↻ Recalcular estadísticas'}
        </button>
      </div>

      {detail && (
        <p style={{ fontSize: 11, color: colors[state], margin: 0, fontFamily: 'var(--font-syne)' }}>
          {detail}
        </p>
      )}

      <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
        Actualiza LTV, totales de ventas y snapshots del dashboard para todos los datos importados.
      </p>
    </div>
  )
}
