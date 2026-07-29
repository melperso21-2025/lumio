'use client'

import Link from 'next/link'

interface EmptyStateAction {
  label: string
  /** Si es href navega, si no es un botón que llama onClick */
  href?: string
  onClick?: () => void
}

interface EmptyStateProps {
  icon?: string
  title?: string
  description?: string
  tip?: string
  action?: EmptyStateAction
  secondaryAction?: EmptyStateAction
  /** Cuando hay datos pero el filtro activo no devuelve resultados */
  isFilterEmpty?: boolean
  onClearFilter?: () => void
}

export default function EmptyState({
  icon,
  title,
  description,
  tip,
  action,
  secondaryAction,
  isFilterEmpty,
  onClearFilter,
}: EmptyStateProps) {
  if (isFilterEmpty) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', textAlign: 'center',
        padding: '48px 24px', gap: 12,
      }}>
        <span style={{ fontSize: 32, lineHeight: 1 }}>🔍</span>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
          No hay resultados para ese filtro
        </p>
        {onClearFilter && (
          <button
            type="button"
            onClick={onClearFilter}
            style={{
              marginTop: 4, fontSize: 13, color: 'var(--gold)',
              background: 'transparent', border: 'none', cursor: 'pointer',
              textDecoration: 'underline', padding: 0,
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', textAlign: 'center',
      padding: '52px 32px', gap: 0,
      maxWidth: 420, margin: '0 auto',
    }}>
      {/* Ícono con halo */}
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'rgba(245,200,66,0.08)',
        border: '1px solid rgba(245,200,66,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32, lineHeight: 1, marginBottom: 20,
      }}>
        {icon}
      </div>

      {/* Título */}
      <h3 style={{
        margin: '0 0 10px', fontSize: 16, fontWeight: 700,
        fontFamily: 'var(--font-syne)', color: 'var(--text)',
        lineHeight: 1.3,
      }}>
        {title}
      </h3>

      {/* Descripción */}
      <p style={{
        margin: '0 0 24px', fontSize: 13, color: 'var(--muted)',
        lineHeight: 1.7, maxWidth: 340,
      }}>
        {description}
      </p>

      {/* Acciones */}
      {(action || secondaryAction) && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: tip ? 28 : 0 }}>
          {action && (
            action.href ? (
              <Link
                href={action.href}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                  background: 'linear-gradient(135deg, #F5C842, #F09A1A)',
                  color: '#1A1B2E', textDecoration: 'none',
                  fontFamily: 'var(--font-syne)',
                  boxShadow: '0 2px 10px rgba(232,165,0,0.2)',
                }}
              >
                {action.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={action.onClick}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                  background: 'linear-gradient(135deg, #F5C842, #F09A1A)',
                  color: '#1A1B2E', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-syne)',
                  boxShadow: '0 2px 10px rgba(232,165,0,0.2)',
                }}
              >
                {action.label}
              </button>
            )
          )}

          {secondaryAction && (
            secondaryAction.href ? (
              <Link
                href={secondaryAction.href}
                style={{
                  fontSize: 12, color: 'var(--muted)',
                  textDecoration: 'underline', textUnderlineOffset: 3,
                }}
              >
                {secondaryAction.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                style={{
                  fontSize: 12, color: 'var(--muted)', background: 'transparent',
                  border: 'none', cursor: 'pointer', textDecoration: 'underline',
                  textUnderlineOffset: 3, padding: 0,
                }}
              >
                {secondaryAction.label}
              </button>
            )
          )}
        </div>
      )}

      {/* Tip */}
      {tip && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8, textAlign: 'left',
          padding: '10px 14px', borderRadius: 10,
          background: 'rgba(99,102,241,0.07)',
          border: '1px solid rgba(99,102,241,0.18)',
          maxWidth: 360,
        }}>
          <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>💡</span>
          <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
            {tip}
          </span>
        </div>
      )}
    </div>
  )
}
