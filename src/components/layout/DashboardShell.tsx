'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { UserProvider } from '@/lib/context/UserContext'
import { ThemeProvider, useTheme } from '@/lib/context/ThemeContext'
import { createClient } from '@/lib/supabase/client'

// ── Constantes de timeout ──────────────────────────────────────────────────
const TIMEOUT_MS = 60 * 60 * 1000        // 60 min
const WARNING_MS = 55 * 60 * 1000        // aviso 5 min antes (55 min)
const INACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll'] as const

const STORAGE_KEY = 'lumio-sidebar-hidden'

type DashboardShellProps = {
  children: React.ReactNode
  userName?: string | null
  userRole?: string | null
  companyName?: string | null
  isPulseAdmin?: boolean
  avatarUrl?: string | null
}

export default function DashboardShell({
  children,
  userName,
  userRole,
  companyName,
  isPulseAdmin,
  avatarUrl,
}: DashboardShellProps) {
  const router = useRouter()
  const [sidebarHidden, setSidebarHidden] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [showWarning, setShowWarning] = useState(false)

  // Timers almacenados en refs para no causar re-renders
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logoutTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Logout por inactividad ─────────────────────────────────────────────
  const doLogout = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }, [router])

  const clearTimers = useCallback(() => {
    if (warningTimer.current) clearTimeout(warningTimer.current)
    if (logoutTimer.current)  clearTimeout(logoutTimer.current)
  }, [])

  const resetTimer = useCallback(() => {
    clearTimers()
    setShowWarning(false)

    warningTimer.current = setTimeout(() => {
      setShowWarning(true)
    }, WARNING_MS)

    logoutTimer.current = setTimeout(() => {
      void doLogout()
    }, TIMEOUT_MS)
  }, [clearTimers, doLogout])

  // Iniciar timers tras hidratación y escuchar eventos de actividad
  useEffect(() => {
    resetTimer()

    const handle = () => resetTimer()
    INACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, handle, { passive: true }))

    return () => {
      clearTimers()
      INACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, handle))
    }
  }, [resetTimer, clearTimers])

  // ── Preferencia sidebar ────────────────────────────────────────────────
  useEffect(() => {
    try {
      setSidebarHidden(localStorage.getItem(STORAGE_KEY) === '1')
    } catch {
      /* sin localStorage */
    }
    setHydrated(true)
  }, [])

  const hideSidebar = useCallback(() => {
    setSidebarHidden(true)
    try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* noop */ }
  }, [])

  const showSidebar = useCallback(() => {
    setSidebarHidden(false)
    try { localStorage.setItem(STORAGE_KEY, '0') } catch { /* noop */ }
  }, [])

  return (
    <ThemeProvider>
    <UserProvider
      userName={userName}
      userRole={userRole}
      companyName={companyName}
      isPulseAdmin={isPulseAdmin}
      avatarUrl={avatarUrl}
    >
      {/* Modal de advertencia de inactividad */}
      {showWarning && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.55)',
          }}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '32px 36px',
              maxWidth: 380,
              width: '90%',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <h2
              className="font-syne font-bold text-base mb-2"
              style={{ color: 'var(--text)' }}
            >
              ¿Sigues ahí?
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
              Tu sesión se cerrará automáticamente en&nbsp;
              <strong style={{ color: 'var(--gold)' }}>5 minutos</strong> por
              inactividad.
            </p>
            <button
              type="button"
              onClick={resetTimer}
              style={{
                background: 'linear-gradient(135deg, #F5C842, #F09A1A)',
                color: '#1A1B2E',
                fontFamily: 'var(--font-syne)',
                fontWeight: 700,
                fontSize: 13,
                padding: '9px 24px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Seguir conectado
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          height: '100vh',
          overflow: 'hidden',
          background: 'var(--bg)',
        }}
      >
        {!sidebarHidden && (
          <Sidebar
            userName={userName ?? undefined}
            companyName={companyName ?? undefined}
            onRequestHide={hideSidebar}
          />
        )}

        {hydrated && sidebarHidden && (
          <button
            type="button"
            aria-label="Mostrar menú lateral"
            title="Mostrar menú"
            onClick={showSidebar}
            className="hover:[background:var(--hover)] hover:[color:var(--text2)]"
            style={{
              position: 'fixed',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 60,
              width: 22,
              height: 56,
              padding: 0,
              border: '1px solid var(--border)',
              borderLeft: 'none',
              borderRadius: '0 8px 8px 0',
              background: 'var(--card)',
              color: 'var(--muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontFamily: 'var(--font-syne)',
              boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            »
          </button>
        )}

        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>{children}</div>
      </div>
    </UserProvider>
    </ThemeProvider>
  )
}
