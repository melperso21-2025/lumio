'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { getDefaultDateRange, toLocalISO, roundToFullWeeks } from '@/lib/dateUtils'

// ── Tipos ──────────────────────────────────────────────────

interface DateRangePickerProps {
  /** Si true (solo Dashboard), el rango se redondea a semanas ISO completas al aplicar. */
  snapToWeeks?: boolean
}

type PresetRange = {
  label: string
  getValue: () => { from: string; to: string }
}

// ── Presets ─────────────────────────────────────────────────

const presets: PresetRange[] = [
  {
    label: 'Esta semana',
    getValue: () => getDefaultDateRange(),
  },
  {
    label: 'Semana anterior',
    getValue: () => {
      const now = new Date()
      const day = now.getDay()
      const monday = new Date(now)
      monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) - 7)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      return { from: toLocalISO(monday), to: toLocalISO(sunday) }
    },
  },
  {
    label: 'Este mes',
    getValue: () => {
      const now = new Date()
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: toLocalISO(first), to: toLocalISO(now) }
    },
  },
  {
    label: 'Mes anterior',
    getValue: () => {
      const now = new Date()
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const last = new Date(now.getFullYear(), now.getMonth(), 0)
      return { from: toLocalISO(first), to: toLocalISO(last) }
    },
  },
  {
    label: 'Este año',
    getValue: () => {
      const now = new Date()
      const first = new Date(now.getFullYear(), 0, 1)
      return { from: toLocalISO(first), to: toLocalISO(now) }
    },
  },
  {
    label: 'Año anterior',
    getValue: () => {
      const now = new Date()
      const first = new Date(now.getFullYear() - 1, 0, 1)
      const last = new Date(now.getFullYear() - 1, 11, 31)
      return { from: toLocalISO(first), to: toLocalISO(last) }
    },
  },
  {
    label: 'Últimos 7 días',
    getValue: () => {
      const now = new Date()
      const from = new Date(now)
      from.setDate(now.getDate() - 6)
      return { from: toLocalISO(from), to: toLocalISO(now) }
    },
  },
]

// ── Componente ───────────────────────────────────────────────

/**
 * DateRangePicker: lee y escribe ?from= y ?to= en la URL.
 * Debe usarse dentro de <Suspense fallback={null}> por useSearchParams.
 */
export default function DateRangePicker({ snapToWeeks = false }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Leer el rango actual de la URL
  const currentFrom = searchParams.get('from') ?? ''
  const currentTo = searchParams.get('to') ?? ''

  // Aplicar un preset
  function applyPreset(preset: PresetRange) {
    let { from, to } = preset.getValue()
    if (snapToWeeks) ({ from, to } = roundToFullWeeks(from, to))
    const params = new URLSearchParams(searchParams.toString())
    params.set('from', from)
    params.set('to', to)
    router.push(`${pathname}?${params.toString()}`)
    setActivePreset(preset.label)
    setOpen(false)
  }

  // Aplicar rango custom
  function applyCustom() {
    if (!customFrom || !customTo) return
    if (customFrom > customTo) return
    let from = customFrom
    let to = customTo
    if (snapToWeeks) ({ from, to } = roundToFullWeeks(from, to))
    const params = new URLSearchParams(searchParams.toString())
    params.set('from', from)
    params.set('to', to)
    router.push(`${pathname}?${params.toString()}`)
    setActivePreset('Custom')
    setOpen(false)
  }

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Detectar preset activo al montar basado en URL
  useEffect(() => {
    if (!currentFrom || !currentTo) {
      setActivePreset('Esta semana')
      return
    }
    const match = presets.find((p) => {
      const { from, to } = p.getValue()
      return from === currentFrom && to === currentTo
    })
    setActivePreset(match ? match.label : 'Custom')
  }, [currentFrom, currentTo])

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Botón disparador */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 7,
          border: '1px solid var(--gold-bdr)',
          background: 'var(--gold-bg)',
          color: 'var(--gold)',
          fontSize: 12,
          fontWeight: 600,
          fontFamily: 'var(--font-jakarta)',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 13 }}>📅</span>
        {activePreset ?? 'Seleccionar período'}
        <span style={{ fontSize: 10, opacity: 0.7 }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 100,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            minWidth: 220,
            overflow: 'hidden',
          }}
        >
          {/* Presets */}
          <div style={{ padding: '6px 0' }}>
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 16px',
                  fontSize: 12,
                  fontFamily: 'var(--font-jakarta)',
                  background:
                    activePreset === preset.label ? 'var(--gold-bg)' : 'transparent',
                  color:
                    activePreset === preset.label ? 'var(--gold)' : 'var(--text2)',
                  fontWeight: activePreset === preset.label ? 600 : 400,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
              >
                {activePreset === preset.label && (
                  <span style={{ marginRight: 6, fontSize: 10 }}>✓</span>
                )}
                {preset.label}
              </button>
            ))}
          </div>

          {/* Separador */}
          <div
            style={{
              height: 1,
              background: 'var(--border)',
              margin: '0 12px',
            }}
          />

          {/* Rango custom */}
          <div style={{ padding: '12px 16px' }}>
            <p
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--muted)',
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Rango personalizado
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>
                <label
                  style={{
                    fontSize: 9,
                    color: 'var(--muted)',
                    display: 'block',
                    marginBottom: 3,
                  }}
                >
                  Desde
                </label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--border2)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: 12,
                    fontFamily: 'var(--font-jakarta)',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 9,
                    color: 'var(--muted)',
                    display: 'block',
                    marginBottom: 3,
                  }}
                >
                  Hasta
                </label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--border2)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: 12,
                    fontFamily: 'var(--font-jakarta)',
                    outline: 'none',
                  }}
                />
              </div>
              {snapToWeeks && (
                <p
                  style={{
                    fontSize: 9,
                    color: 'var(--muted)',
                    marginTop: 4,
                    lineHeight: 1.4,
                  }}
                >
                  El Dashboard trabaja con semanas completas (lun→dom). Las fechas se
                  ajustarán automáticamente.
                </p>
              )}
              <button
                type="button"
                onClick={applyCustom}
                disabled={
                  !customFrom || !customTo || customFrom > customTo
                }
                style={{
                  background: 'linear-gradient(135deg, #F5C842, #F09A1A)',
                  color: '#1A1B2E',
                  fontFamily: 'var(--font-syne)',
                  fontWeight: 700,
                  fontSize: 12,
                  padding: '7px 0',
                  borderRadius: 7,
                  border: 'none',
                  cursor:
                    !customFrom || !customTo || customFrom > customTo
                      ? 'not-allowed'
                      : 'pointer',
                  opacity:
                    !customFrom || !customTo || customFrom > customTo ? 0.5 : 1,
                  width: '100%',
                }}
              >
                Aplicar rango
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
