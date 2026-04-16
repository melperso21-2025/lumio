'use client'

import { Suspense, type ReactNode } from 'react'
import DateRangePicker from '@/components/ui/DateRangePicker'

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

// ── Botón dorado común (link o button) ───────────────────────

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

// ── Componente principal ────────────────────────────────────

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

      {/* Lado derecho: solo si hay algo que mostrar */}
      {hasRightSection && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {/* Selector de período */}
          {showPeriodSelector && (
            <Suspense fallback={null}>
              <DateRangePicker />
            </Suspense>
          )}

          {/* Deprecated: cada módulo maneja su propio ExportButton */}
          {rightExtras}


          {/* Acción primaria (link o botón) */}
          {primaryAction &&
            (primaryAction.href ? (
              <a
                href={primaryAction.href}
                style={{
                  ...goldButtonStyle,
                  textDecoration: 'none',
                }}
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
        </div>
      )}
    </header>
  )
}
