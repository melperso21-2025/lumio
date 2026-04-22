'use client'

import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'

type Props = {
  userId: string
  email: string
  onReinvited?: () => void
}

export default function ReinviteUserButton({
  userId,
  email,
  onReinvited,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (clearTimer.current) clearTimeout(clearTimer.current)
    }
  }, [])

  async function handleClick() {
    setErr(null)
    setOk(false)
    setLoading(true)
    try {
      const res = await fetch('/api/users/reinvite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email }),
      })
      const data = (await res.json()) as { error?: string; success?: boolean }
      if (!res.ok) {
        setErr(data.error ?? 'Error al reenviar')
        return
      }
      setOk(true)
      onReinvited?.()
      router.refresh()
      if (clearTimer.current) clearTimeout(clearTimer.current)
      clearTimer.current = setTimeout(() => setOk(false), 3500)
    } catch {
      setErr('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="font-syne font-bold"
        style={{
          fontSize: 11,
          padding: '4px 10px',
          borderRadius: 6,
          border: '1px solid var(--border)',
          background: ok ? 'rgba(5,150,105,0.12)' : 'var(--hover)',
          color: ok ? 'var(--green)' : 'var(--text2)',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Enviando…' : ok ? '✓ Reenviada' : 'Reenviar invitación'}
      </button>
      {err && (
        <span style={{ fontSize: 10, color: 'var(--red)' }}>{err}</span>
      )}
    </div>
  )
}
