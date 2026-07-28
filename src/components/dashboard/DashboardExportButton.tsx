'use client'

import ExportButton from '@/components/ui/ExportButton'

interface DashboardExportButtonProps {
  periodLabel: string
  kpis: {
    totalSales: number
    totalTransactions: number
    avgLpp: number
    avgGrossMargin: number
    avgNetMargin: number
    avgCashDays: number
    totalAdSpend: number
    avgRoas: number
    totalLeads: number
    totalDiscounts: number
    overdueRec: number
  }
  channelData: { name: string; total: number }[]
}

export default function DashboardExportButton({
  periodLabel,
  kpis,
  channelData,
}: DashboardExportButtonProps) {
  const rows: Record<string, unknown>[] = [
    {
      Período: periodLabel,
      'Ventas $': kpis.totalSales,
      Transacciones: kpis.totalTransactions,
      'LPP promedio': Number(kpis.avgLpp.toFixed(2)),
      'Margen bruto %': Number(kpis.avgGrossMargin.toFixed(1)),
      'Margen neto %': Number(kpis.avgNetMargin.toFixed(1)),
      'Días de caja': Number(kpis.avgCashDays.toFixed(0)),
      'Inversión pautas $': kpis.totalAdSpend,
      'ROAS promedio': Number(kpis.avgRoas.toFixed(2)),
      'Leads generados': kpis.totalLeads,
      'Descuentos $': Number(kpis.totalDiscounts.toFixed(2)),
      'CxC vencidas $': kpis.overdueRec,
    },
    ...channelData.map((ch) => ({
      Período: periodLabel,
      'Canal de venta': ch.name,
      'Ventas por canal $': Number(ch.total.toFixed(2)),
    })),
  ]

  return (
    <ExportButton
      data={rows}
      filename={`lumio-dashboard-${periodLabel.replace(/\s/g, '-')}`}
      sheetName="Dashboard"
    />
  )
}
