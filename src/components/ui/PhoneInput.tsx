'use client'

import { useState } from 'react'
import { validatePhone } from '@/lib/validations'

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface PhoneInputProps {
  value: string       // formato de salida: '+593XXXXXXXXX' o ''
  onChange: (value: string) => void
  id?: string
  required?: boolean
  error?: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Extrae los 9 dígitos locales de cualquier formato de entrada */
function extractDigits(raw: string): string {
  // Eliminar todo lo que no sea dígito
  const digits = raw.replace(/\D/g, '')

  // Caso: número pegado con prefijo 593 (ej: 5939912345678 → 991234567)
  if (digits.startsWith('593') && digits.length > 9) {
    return digits.slice(3).slice(0, 9)
  }
  // Caso: número con 0 inicial (09XXXXXXXX → 9XXXXXXXX)
  if (digits.startsWith('0') && digits.length > 1) {
    return digits.slice(1).slice(0, 9)
  }
  return digits.slice(0, 9)
}

/** Formatea 9 dígitos como '99 999 9999' para la UI */
function formatDisplay(digits: string): string {
  const d = digits.replace(/\D/g, '')
  if (d.length === 0) return ''
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 9)}`
}

// ── Componente ──────────────────────────────────────────────────────────────

export default function PhoneInput({ value, onChange, id, required, error: errorProp }: PhoneInputProps) {
  // Extraer los dígitos locales del valor externo para mostrar en el input
  const toLocal = (v: string) => {
    if (!v) return ''
    return extractDigits(v.replace(/^\+593/, ''))
  }

  const [localDigits, setLocalDigits] = useState(() => toLocal(value))
  const [internalError, setInternalError] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)

  const displayError = errorProp ?? internalError

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    // Permitir solo dígitos y espacios en el campo de entrada
    const digits = extractDigits(raw)
    setLocalDigits(digits)
    setInternalError(null)

    // Emitir hacia arriba en formato canónico
    if (digits.length === 0) {
      onChange('')
    } else {
      onChange(`+593${digits}`)
    }
  }

  function handleBlur() {
    setFocused(false)
    if (localDigits.length === 0) {
      setInternalError(null)
      return
    }
    const result = validatePhone(localDigits)
    setInternalError(result.valid ? null : (result.error ?? null))
  }

  function handleFocus() {
    setFocused(true)
    setInternalError(null)
  }

  const isValid = localDigits.length === 0 || localDigits.length === 9

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          borderRadius: 8,
          border: `1px solid ${
            displayError  ? 'rgba(220,38,38,0.6)'  :
            focused       ? 'var(--gold)'           :
            'var(--border2)'
          }`,
          boxShadow: focused && isValid
            ? '0 0 0 3px var(--gold-bg)'
            : focused && !isValid
            ? '0 0 0 3px rgba(220,38,38,0.08)'
            : 'none',
          background: 'var(--surface)',
          overflow: 'hidden',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        {/* Prefijo fijo */}
        <span
          style={{
            padding: '8px 10px 8px 12px',
            fontSize: 14,
            color: 'var(--muted)',
            fontFamily: 'var(--font-jakarta)',
            borderRight: '1px solid var(--border2)',
            background: 'var(--bg)',
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          +593
        </span>

        {/* Campo de dígitos */}
        <input
          id={id}
          type="text"
          inputMode="numeric"
          required={required}
          value={formatDisplay(localDigits)}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="99 999 9999"
          maxLength={11} // '99 999 9999' tiene 11 chars con espacios
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: 14,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--text)',
            fontFamily: 'var(--font-jakarta)',
          }}
        />
      </div>

      {displayError && (
        <p
          style={{
            marginTop: 4,
            fontSize: 11,
            color: 'var(--red, #F87171)',
          }}
        >
          {displayError}
        </p>
      )}
    </div>
  )
}
