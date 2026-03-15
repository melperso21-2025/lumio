'use client'

import { useState } from 'react'

// ── Tipos ──────────────────────────────────────────────────

type PeriodOption = 'semana' | 'mes' | '30dias'

export interface PrimaryAction {
  label: string
  onClick: () => void
}

export interface TopbarProps {
  pageTitle: string
  pageSubtitle?: string
  primaryAction?: PrimaryAction
}

const PERIOD_LABELS: Record<PeriodOption, string> = {
  semana: 'Esta semana',
  mes: 'Este mes',
  '30dias': 'Últimos 30 días',
}

// ── Componente ──────────────────────────────────────────────

export default function Topbar({
  pageTitle,
  pageSubtitle,
  primaryAction,
}: TopbarProps) {
  const [period, setPeriod] = useState<PeriodOption>('mes')

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-6 shrink-0"
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

      {/* Lado derecho: selector de período, Exportar, acción primaria */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Selector de período */}
        <div
          className="flex items-center rounded-lg overflow-hidden"
          style={{
            background: 'var(--hover)',
            border: '1px solid var(--border)',
          }}
        >
          {(['semana', 'mes', '30dias'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setPeriod(opt)}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                color: period === opt ? 'var(--gold)' : 'var(--text2)',
                background: period === opt ? 'var(--gold-bg)' : 'transparent',
              }}
            >
              {PERIOD_LABELS[opt]}
            </button>
          ))}
        </div>

        {/* Botón Exportar (ghost) */}
        <button
          type="button"
          className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
          style={{
            color: 'var(--text2)',
            background: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          ⬇ Exportar
        </button>

        {/* Botón primario (si se proporciona) */}
        {primaryAction && (
          <button
            type="button"
            onClick={primaryAction.onClick}
            className="px-4 py-1.5 text-sm font-bold rounded-lg transition-opacity hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, #F5C842, #F09A1A)',
              color: '#1A1B2E',
              fontFamily: 'var(--font-syne)',
            }}
          >
            {primaryAction.label}
          </button>
        )}
      </div>
    </header>
  )
}
