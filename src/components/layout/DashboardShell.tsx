'use client'

import { useCallback, useEffect, useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'

const STORAGE_KEY = 'lumio-sidebar-hidden'

type DashboardShellProps = {
  children: React.ReactNode
  userName?: string | null
  userRole?: string | null
  companyName?: string | null
  isPulseAdmin?: boolean
}

export default function DashboardShell({
  children,
  userName,
  userRole,
  companyName,
  isPulseAdmin,
}: DashboardShellProps) {
  const [sidebarHidden, setSidebarHidden] = useState(false)
  const [hydrated, setHydrated] = useState(false)

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
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* noop */
    }
  }, [])

  const showSidebar = useCallback(() => {
    setSidebarHidden(false)
    try {
      localStorage.setItem(STORAGE_KEY, '0')
    } catch {
      /* noop */
    }
  }, [])

  return (
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
          userRole={userRole ?? undefined}
          companyName={companyName ?? undefined}
          isPulseAdmin={isPulseAdmin}
          onRequestHide={hideSidebar}
        />
      )}

      {/* Pestaña fija para volver a mostrar la barra cuando está oculta */}
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
  )
}
