'use client'

import { useTheme } from '@/lib/context/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      <div>
        <p
          className="font-syne font-bold"
          style={{ fontSize: 13, color: 'var(--text)', margin: '0 0 2px' }}
        >
          Apariencia
        </p>
        <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
          {isDark ? 'Modo oscuro activo' : 'Modo claro activo'}
        </p>
      </div>

      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Cambiar tema"
        style={{
          position: 'relative',
          width: 48,
          height: 26,
          borderRadius: 13,
          border: 'none',
          background: isDark ? 'var(--gold)' : 'var(--border2)',
          cursor: 'pointer',
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: isDark ? 25 : 3,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          }}
        >
          {isDark ? '🌙' : '☀️'}
        </span>
      </button>
    </div>
  )
}
