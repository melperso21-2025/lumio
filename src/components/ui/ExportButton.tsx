'use client'

import * as XLSX from 'xlsx'

// ── Tipos ──────────────────────────────────────────────────

export interface ExportButtonProps {
  data: Record<string, unknown>[]
  filename: string
  sheetName?: string
  disabled?: boolean
}

// ── Componente ──────────────────────────────────────────────

/**
 * Botón que exporta los datos a un archivo .xlsx usando SheetJS.
 */
export default function ExportButton({
  data,
  filename,
  sheetName = 'Datos',
  disabled = false,
}: ExportButtonProps) {
  function handleExport() {
    if (!data.length) return
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    XLSX.writeFile(wb, `${filename}.xlsx`)
  }

  const isDisabled = disabled || !data.length

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isDisabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 14px',
        borderRadius: 7,
        border: '1px solid var(--gold-bdr)',
        background: isDisabled ? 'var(--hover)' : 'var(--gold-bg)',
        color: isDisabled ? 'var(--muted)' : 'var(--gold)',
        fontSize: 12,
        fontWeight: 600,
        fontFamily: 'var(--font-jakarta)',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.6 : 1,
      }}
    >
      <span style={{ fontSize: 13 }}>⬇</span>
      Exportar Excel
    </button>
  )
}
