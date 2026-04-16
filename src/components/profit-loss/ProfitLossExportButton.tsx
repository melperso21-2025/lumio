'use client'

import ExportButton from '@/components/ui/ExportButton'

export interface ProfitLossExportButtonProps {
  data: Record<string, unknown>[]
  from: string
  to: string
}

/**
 * Botón de exportación del estado P&G (cliente; usa SheetJS vía ExportButton).
 */
export default function ProfitLossExportButton({
  data,
  from,
  to,
}: ProfitLossExportButtonProps) {
  return (
    <ExportButton
      data={data}
      filename={`pyg_${from}_${to}`}
      sheetName="P&G"
    />
  )
}
