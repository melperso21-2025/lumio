'use client'

export interface ExportButtonProps {
  data: Record<string, unknown>[]
  filename: string
  sheetName?: string
  disabled?: boolean
}

export default function ExportButton({
  data,
  filename,
  sheetName = 'Datos',
  disabled = false,
}: ExportButtonProps) {
  async function handleExport() {
    if (!data.length) return
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet(sheetName)

    // Headers from first row keys
    const keys = Object.keys(data[0])
    ws.addRow(keys)
    data.forEach((row) => ws.addRow(keys.map((k) => row[k] ?? '')))

    // Auto column widths
    ws.columns = keys.map((k) => ({ width: Math.max(k.length, 12) }))

    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
