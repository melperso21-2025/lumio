'use client'

import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DateRangePicker from '@/components/ui/DateRangePicker'
import { useUser } from '@/lib/context/UserContext'
import { createClient } from '@/lib/supabase/client'

// ── Tipos ──────────────────────────────────────────────────

export interface TopbarProps {
  pageTitle: string
  pageSubtitle?: string
  showPeriodSelector?: boolean
  /** @deprecated Cada módulo maneja su propio ExportButton; no renderiza nada. */
  showExportButton?: boolean
  /** Contenido extra a la derecha (p. ej. exportación real). */
  rightExtras?: ReactNode
  primaryAction?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

// ── Colores por rol ─────────────────────────────────────────

const ROLE_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  admin:   { bg: '#2D1B5E', color: '#C084FC', label: 'Admin' },
  manager: { bg: '#1A3A2A', color: '#4ADE80', label: 'Manager' },
  seller:  { bg: '#1A2E44', color: '#60A5FA', label: 'Vendedor' },
}

function getRoleStyle(role: string) {
  return ROLE_COLORS[role] ?? { bg: 'var(--hover)', color: 'var(--muted)', label: role }
}

// ── Botón dorado común ──────────────────────────────────────

const goldButtonStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #F5C842, #F09A1A)',
  color: '#1A1B2E',
  fontFamily: 'var(--font-syne)',
  fontWeight: 700,
  fontSize: 13,
  padding: '7px 16px',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
}

// ── UserMenu ────────────────────────────────────────────────

function UserMenu() {
  const { userName, userRole, companyName, isPulseAdmin, avatarUrl } = useUser()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const initials = userName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const roleStyle = getRoleStyle(userRole)

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Avatar — trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menú de usuario"
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, #F5C842, #F09A1A)',
          color: '#1A1B2E',
          fontFamily: 'var(--font-syne)',
          fontWeight: 700,
          fontSize: 12,
          border: open ? '2px solid var(--gold)' : '2px solid transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'border-color 0.15s',
          flexShrink: 0,
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={userName}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          initials || '?'
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            zIndex: 200,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
            minWidth: 220,
            overflow: 'hidden',
          }}
        >
          {/* Cabecera del perfil */}
          <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--border)' }}>
            <div
              className="font-syne font-bold text-sm truncate"
              style={{ color: 'var(--text)' }}
            >
              {userName}
            </div>
            {companyName && (
              <div
                className="text-xs truncate mt-0.5"
                style={{ color: 'var(--muted)' }}
              >
                {companyName}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: roleStyle.bg, color: roleStyle.color }}
              >
                {roleStyle.label}
              </span>
              {isPulseAdmin && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: '#2D1B3D', color: '#E879F9' }}
                >
                  Pulse Admin
                </span>
              )}
            </div>
          </div>

          {/* Opciones */}
          <div style={{ padding: '6px 0' }}>
            <Link
              href="/settings/profile"
              onClick={() => setOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 16px',
                fontSize: 13,
                color: 'var(--text2)',
                textDecoration: 'none',
                transition: 'background 0.12s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 15 }}>👤</span>
              Mi perfil
            </Link>

            {/* Separador */}
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

            <button
              type="button"
              onClick={handleLogout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 16px',
                fontSize: 13,
                color: '#F87171',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.12s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 15 }}>→</span>
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────

export default function Topbar({
  pageTitle,
  pageSubtitle,
  showPeriodSelector,
  showExportButton: _showExportButton,
  rightExtras,
  primaryAction,
}: TopbarProps) {
  const hasRightSection =
    showPeriodSelector || !!primaryAction || !!rightExtras

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-5 shrink-0"
      style={{
        height: 52,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Lado izquierdo: título y subtítulo */}
      <div className="min-w-0">
        <h1
          className="font-syne font-bold text-base truncate"
          style={{ color: 'var(--text)' }}
        >
          {pageTitle}
        </h1>
        {pageSubtitle && (
          <p
            className="text-sm truncate mt-0.5"
            style={{ color: 'var(--muted)' }}
          >
            {pageSubtitle}
          </p>
        )}
      </div>

      {/* Lado derecho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {hasRightSection && (
          <>
            {showPeriodSelector && (
              <Suspense fallback={null}>
                <DateRangePicker />
              </Suspense>
            )}
            {rightExtras}
            {primaryAction &&
              (primaryAction.href ? (
                <a
                  href={primaryAction.href}
                  style={{ ...goldButtonStyle, textDecoration: 'none' }}
                >
                  {primaryAction.label}
                </a>
              ) : primaryAction.onClick ? (
                <button
                  type="button"
                  onClick={primaryAction.onClick}
                  style={goldButtonStyle}
                >
                  {primaryAction.label}
                </button>
              ) : null)}
          </>
        )}

        {/* Menú de usuario — siempre visible */}
        <UserMenu />
      </div>
    </header>
  )
}
