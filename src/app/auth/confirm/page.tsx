'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ConfirmPage() {
  const router = useRouter()
  const params = useSearchParams()
  const mode = params.get('mode') // 'invite' | 'recovery'
  const supabase = createClient()
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    async function processAuth() {
      try {
        // Caso PKCE: code en query params
        const urlCode = new URLSearchParams(window.location.search).get('code')
        let session = null

        if (urlCode) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(urlCode)
          if (error) { setIsError(true); return }
          session = data.session
        } else {
          // Implicit flow: supabase-js lee el hash (#access_token=...) automáticamente
          // Pequeño delay para dejar que el cliente procese el hash
          await new Promise<void>((r) => setTimeout(r, 80))
          const { data } = await supabase.auth.getSession()
          session = data.session
        }

        if (!session) { setIsError(true); return }

        // Recovery → cambiar contraseña
        if (mode === 'recovery') {
          router.replace('/auth/update-password')
          return
        }

        // Invite / primer acceso → verificar si el usuario ya activó su cuenta
        const { data: profile } = await supabase
          .from('users')
          .select('last_seen_at')
          .eq('id', session.user.id)
          .single()

        if (!profile?.last_seen_at) {
          router.replace('/auth/setup-account')
        } else {
          router.replace('/dashboard')
        }
      } catch {
        setIsError(true)
      }
    }

    processAuth()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (isError) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: 'var(--bg)', gap: 16 }}
      >
        <div style={{ fontSize: 36 }}>⚠️</div>
        <p className="font-syne font-bold" style={{ fontSize: 18, color: 'var(--text)' }}>
          Enlace inválido o expirado
        </p>
        <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 320, textAlign: 'center' }}>
          Este enlace de acceso ya fue usado o expiró. Solicita uno nuevo a tu administrador.
        </p>
        <a
          href="/login"
          className="font-syne font-bold"
          style={{
            marginTop: 8, padding: '9px 22px', borderRadius: 8,
            background: 'linear-gradient(135deg,#F5C842,#F09A1A)',
            color: '#1A1B2E', textDecoration: 'none', fontSize: 13,
          }}
        >
          Ir al inicio
        </a>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: 'var(--bg)', gap: 14 }}
    >
      {/* Spinner */}
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none"
        style={{ animation: 'spin 0.8s linear infinite' }}>
        <circle cx="18" cy="18" r="15" stroke="var(--border)" strokeWidth="3" />
        <path d="M18 3 a15 15 0 0 1 15 15" stroke="#F5C842" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <p style={{ fontSize: 13, color: 'var(--muted)' }}>Verificando acceso…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
