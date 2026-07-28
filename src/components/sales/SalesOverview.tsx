'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import KpiCard from '@/components/ui/KpiCard'
import ExportButton from '@/components/ui/ExportButton'
import QuickSaleForm from '@/components/sales/QuickSaleForm'
import SalesHistoryTable from '@/components/sales/SalesHistoryTable'
import EditSaleModal, { type SaleWithItems } from '@/components/sales/EditSaleModal'

type SaleRow = {
  id: string
  sale_date: string
  week_number: number | null
  gross_total: number | null
  discount_amount: number | null
  lines_per_order: number | null
  status: string | null
  channel_id: string | null
  sales_channels?: { name: string } | { name: string }[] | null
}

type ChannelRow = { id: string; name: string }

type CustomerRow = {
  id: string
  full_name: string | null
  customer_type: string | null
  label: string | null
}

type BranchRow = {
  id: string
  name: string
  type: string | null
}

function getChannelName(sale: SaleRow): string {
  const sc = sale.sales_channels
  return Array.isArray(sc)
    ? sc[0]?.name ?? '—'
    : (sc as { name?: string })?.name ?? '—'
}

interface SalesOverviewProps {
  sales: SaleRow[]
  prevSales: SaleRow[]
  channels: ChannelRow[]
  customers: CustomerRow[]
  branches: BranchRow[]
  from: string
  to: string
  prevFrom: string
  prevTo: string
  companyId: string
  userRole: string
}

function calcDelta(
  current: number,
  previous: number,
  hasPrevData: boolean
): number | undefined {
  if (!hasPrevData || previous === 0) return undefined
  return Math.round(((current - previous) / previous) * 100)
}

export default function SalesOverview({
  sales,
  prevSales,
  channels,
  customers,
  branches,
  from,
  to,
  prevFrom,
  prevTo,
  companyId,
  userRole,
}: SalesOverviewProps) {
  const router = useRouter()

  const [filterWeek, setFilterWeek] = useState<string>('')
  const [filterChannel, setFilterChannel] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')

  const [selectedSale, setSelectedSale] = useState<SaleWithItems | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  async function handleEdit(saleId: string) {
    const res = await fetch(`/api/sales/${saleId}`)
    if (!res.ok) return
    const { sale } = await res.json()
    setSelectedSale(sale)
    setEditOpen(true)
  }

  function handleEditClose() {
    setEditOpen(false)
    setSelectedSale(null)
  }

  function handleEditSuccess() {
    setEditOpen(false)
    setSelectedSale(null)
    router.refresh()
  }

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (filterWeek && String(s.week_number ?? '') !== filterWeek) return false
      if (filterChannel && getChannelName(s) !== filterChannel) return false
      if (filterStatus && (s.status ?? '') !== filterStatus) return false
      return true
    })
  }, [sales, filterWeek, filterChannel, filterStatus])

  const filteredPrevSales = useMemo(() => {
    return prevSales.filter((s) => {
      if (filterWeek && String(s.week_number ?? '') !== filterWeek) return false
      if (filterChannel && getChannelName(s) !== filterChannel) return false
      if (filterStatus && (s.status ?? '') !== filterStatus) return false
      return true
    })
  }, [prevSales, filterWeek, filterChannel, filterStatus])

  const total_sales = filteredSales.reduce(
    (s, r) => s + (r.gross_total ?? 0),
    0
  )
  const total_transactions = filteredSales.length
  const avg_lpp =
    filteredSales.length > 0
      ? filteredSales.reduce(
          (s, r) => s + (r.lines_per_order ?? 0),
          0
        ) / filteredSales.length
      : 0
  const total_discounts = filteredSales.reduce(
    (s, r) => s + (r.discount_amount ?? 0),
    0
  )

  const prev_total_sales = filteredPrevSales.reduce(
    (s, r) => s + (r.gross_total ?? 0),
    0
  )
  const prev_total_transactions = filteredPrevSales.length
  const prev_avg_lpp =
    filteredPrevSales.length > 0
      ? filteredPrevSales.reduce(
          (s, r) => s + (r.lines_per_order ?? 0),
          0
        ) / filteredPrevSales.length
      : 0
  const prev_total_discounts = filteredPrevSales.reduce(
    (s, r) => s + (r.discount_amount ?? 0),
    0
  )

  const hasPrevData = filteredPrevSales.length > 0

  const exportData = filteredSales.map((s) => ({
    Fecha: s.sale_date,
    Canal: getChannelName(s),
    LPP: s.lines_per_order,
    Total: s.gross_total,
    Descuento: s.discount_amount,
    Estado: s.status,
  }))

  function handleFilterChange(
    week: string,
    channel: string,
    status: string
  ) {
    setFilterWeek(week)
    setFilterChannel(channel)
    setFilterStatus(status)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        flex: 1,
        minHeight: 0,
      }}
    >
      {/* KPIs (estáticos) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <KpiCard
          label="Ventas"
          prefix="$"
          value={Math.round(total_sales)}
          isGold
          delta={calcDelta(total_sales, prev_total_sales, hasPrevData)}
          compare={
            prev_total_sales > 0
              ? `Ant: $${Math.round(prev_total_sales)}`
              : undefined
          }
        />
        <KpiCard
          label="Transacciones"
          value={total_transactions}
          delta={calcDelta(total_transactions, prev_total_transactions, hasPrevData)}
          compare={
            prev_total_transactions > 0
              ? `Ant: ${prev_total_transactions}`
              : undefined
          }
        />
        <KpiCard
          label="LPP prom."
          value={avg_lpp.toFixed(1)}
          delta={calcDelta(avg_lpp, prev_avg_lpp, hasPrevData)}
          compare="líneas por pedido"
        />
        <KpiCard
          label="Descuentos"
          prefix="$"
          value={Math.round(total_discounts)}
          delta={calcDelta(total_discounts, prev_total_discounts, hasPrevData)}
          compare={
            prev_total_discounts > 0
              ? `Ant: $${Math.round(prev_total_discounts)}`
              : undefined
          }
        />
      </div>

      {/* Historial + formulario */}
      <div
        style={{
          borderRadius: 12,
          background: 'var(--card)',
          border: '1px solid var(--border)',
          padding: '14px 16px',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
            flexShrink: 0,
          }}
        >
          <h2
            className="font-syne font-bold"
            style={{ fontSize: 16, color: 'var(--text)' }}
          >
            Historial de ventas
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ExportButton
              data={exportData}
              filename={`ventas_${from}_${to}`}
              sheetName="Ventas"
            />
            <QuickSaleForm
              channels={channels}
              branches={branches}
              companyId={companyId}
              userRole={userRole}
            />
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <SalesHistoryTable
            sales={sales}
            filterWeek={filterWeek}
            filterChannel={filterChannel}
            filterStatus={filterStatus}
            onFilterChange={handleFilterChange}
            userRole={userRole}
            onEdit={handleEdit}
          />
        </div>
      </div>

      {editOpen && selectedSale && (
        <EditSaleModal
          sale={selectedSale}
          customers={customers}
          branches={branches}
          channels={channels}
          companyId={companyId}
          userRole={userRole}
          onClose={handleEditClose}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  )
}
