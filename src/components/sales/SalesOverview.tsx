'use client'

import { useState, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import KpiCard from '@/components/ui/KpiCard'
import ExportButton from '@/components/ui/ExportButton'
import QuickSaleForm from '@/components/sales/QuickSaleForm'
import SalesHistoryTable from '@/components/sales/SalesHistoryTable'
import EditSaleModal, { type SaleWithItems } from '@/components/sales/EditSaleModal'
import SalesTrendChart from '@/components/charts/SalesTrendChart'
import ModuleAiButton from '@/components/ai/ModuleAiButton'
import EmptyState from '@/components/ui/EmptyState'

type SaleRow = {
  id: string
  sale_date: string
  week_number: number | null
  gross_total: number | null
  discount_amount: number | null
  production_cost: number | null
  lines_per_order: number | null
  status: string | null
  channel_id: string | null
  sales_channels?: { name: string } | { name: string }[] | null
  customers?: { full_name: string | null } | null
}

type KpiSaleRow = {
  sale_date: string
  gross_total: number | null
  discount_amount: number | null
  production_cost: number | null
  lines_per_order: number | null
}

type ChannelRow = { id: string; name: string }
type BranchRow  = { id: string; name: string; type: string | null }

const STATUS_LABELS: Record<string, string> = {
  closed: 'Cerrada',
  review: 'Revisión',
  cancelled: 'Anulada',
  contact: 'Contacto',
}

function calcDelta(current: number, previous: number, hasPrevData: boolean): number | undefined {
  if (!hasPrevData || previous === 0) return undefined
  return Math.round(((current - previous) / previous) * 100)
}

interface SalesOverviewProps {
  /** Todas las ventas del período (sin paginación) — solo para KPIs y gráfico */
  kpiSales: KpiSaleRow[]
  /** Ventas de la página actual — solo para la tabla */
  sales: SaleRow[]
  prevKpiSales: KpiSaleRow[]
  channels: ChannelRow[]
  branches: BranchRow[]
  from: string
  to: string
  prevFrom: string
  prevTo: string
  companyId: string
  userRole: string
  // Paginación
  currentPage: number
  totalPages: number
  totalCount: number
  pageSize: number
  // Filtros actuales (URL)
  filterWeek: string
  filterChannelId: string
  filterStatus: string
  // Opciones de filtro
  uniqueWeeks: number[]
  uniqueStatuses: string[]
}

export default function SalesOverview({
  kpiSales,
  sales,
  prevKpiSales,
  channels,
  branches,
  from,
  to,
  companyId,
  userRole,
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  filterWeek,
  filterChannelId,
  filterStatus,
  uniqueWeeks,
  uniqueStatuses,
  prevFrom,
  prevTo,
}: SalesOverviewProps) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  const [selectedSale, setSelectedSale] = useState<SaleWithItems | null>(null)
  const [editOpen, setEditOpen]         = useState(false)

  // ── Helpers de navegación por URL ──────────────────────────────
  function buildUrl(overrides: Record<string, string | null>) {
    const p = new URLSearchParams(searchParams.toString())
    for (const [key, val] of Object.entries(overrides)) {
      if (val === null || val === '') {
        p.delete(key)
      } else {
        p.set(key, val)
      }
    }
    return `${pathname}?${p.toString()}`
  }

  function navigate(overrides: Record<string, string | null>) {
    router.push(buildUrl(overrides))
  }

  function setFilter(key: string, value: string) {
    navigate({ [key]: value || null, page: null })
  }

  function setPage(p: number) {
    navigate({ page: p === 0 ? null : String(p) })
  }

  // ── KPIs desde kpiSales (todos los registros del período) ──────
  const total_sales        = kpiSales.reduce((s, r) => s + (r.gross_total ?? 0), 0)
  const total_transactions = kpiSales.length
  const avg_lpp            = kpiSales.length > 0
    ? kpiSales.reduce((s, r) => s + (r.lines_per_order ?? 0), 0) / kpiSales.length
    : 0
  const total_discounts    = kpiSales.reduce((s, r) => s + (r.discount_amount ?? 0), 0)

  const prev_total_sales        = prevKpiSales.reduce((s, r) => s + (r.gross_total ?? 0), 0)
  const prev_total_transactions = prevKpiSales.length
  const prev_avg_lpp            = prevKpiSales.length > 0
    ? prevKpiSales.reduce((s, r) => s + (r.lines_per_order ?? 0), 0) / prevKpiSales.length
    : 0
  const prev_total_discounts    = prevKpiSales.reduce((s, r) => s + (r.discount_amount ?? 0), 0)

  const hasPrevData = prevKpiSales.length > 0

  // ── Export: solo la página actual (el usuario puede exportar todo desde Topbar) ──
  const exportData = sales.map((s) => {
    const sc = s.sales_channels
    const channelName = Array.isArray(sc) ? sc[0]?.name ?? '—' : (sc as { name?: string })?.name ?? '—'
    return {
      Fecha: s.sale_date,
      Canal: channelName,
      LPP: s.lines_per_order,
      Total: s.gross_total,
      Descuento: s.discount_amount,
      Estado: s.status,
      Cliente: (s.customers as { full_name?: string | null } | null)?.full_name ?? '',
    }
  })

  // ── Edición ────────────────────────────────────────────────────
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

  function handleCancel() {
    router.refresh()
  }

  const hasActiveFilters = filterWeek || filterChannelId || filterStatus
  const pageStart = currentPage * pageSize + 1
  const pageEnd   = Math.min((currentPage + 1) * pageSize, totalCount)

  const getModuleData = useCallback(() => ({
    periodo: `${from} → ${to}`,
    totalVentas: total_sales,
    totalTransacciones: total_transactions,
    lppPromedio: parseFloat(avg_lpp.toFixed(2)),
    totalDescuentos: total_discounts,
    variacionVsAnterior: hasPrevData
      ? `${(((total_sales - prev_total_sales) / prev_total_sales) * 100).toFixed(1)}%`
      : 'sin datos anteriores',
    topVentas: kpiSales.slice(0, 10).map(s => ({
      fecha: s.sale_date,
      total: s.gross_total,
      descuento: s.discount_amount,
    })),
  }), [from, to, total_sales, total_transactions, avg_lpp, total_discounts, hasPrevData, prev_total_sales, kpiSales])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* KPIs + botón IA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: 8, flexShrink: 0 }}>
        <KpiCard label="Ventas" prefix="$" value={Math.round(total_sales)} isGold
          delta={calcDelta(total_sales, prev_total_sales, hasPrevData)}
          compare={prev_total_sales > 0 ? `Ant: $${Math.round(prev_total_sales)}` : undefined}
        />
        <KpiCard label="Transacciones" value={total_transactions}
          delta={calcDelta(total_transactions, prev_total_transactions, hasPrevData)}
          compare={prev_total_transactions > 0 ? `Ant: ${prev_total_transactions}` : undefined}
        />
        <KpiCard label="LPP prom." value={avg_lpp.toFixed(1)}
          delta={calcDelta(avg_lpp, prev_avg_lpp, hasPrevData)}
          compare="líneas por pedido"
        />
        <KpiCard label="Descuentos" prefix="$" value={Math.round(total_discounts)}
          delta={calcDelta(total_discounts, prev_total_discounts, hasPrevData)}
          compare={prev_total_discounts > 0 ? `Ant: $${Math.round(prev_total_discounts)}` : undefined}
        />
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ModuleAiButton module="sales" getModuleData={getModuleData} />
        </div>
      </div>

      {/* Gráfico de tendencia (usa kpiSales — todos los datos del período) */}
      <SalesTrendChart sales={kpiSales} from={from} to={to} />

      {/* Historial + filtros + paginación */}
      <div style={{ borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexShrink: 0 }}>
          <h2 className="font-syne font-bold" style={{ fontSize: 16, color: 'var(--text)' }}>
            Historial de ventas
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ExportButton data={exportData} filename={`ventas_${from}_${to}_p${currentPage + 1}`} sheetName="Ventas" />
            <QuickSaleForm channels={channels} branches={branches} companyId={companyId} userRole={userRole} />
          </div>
        </div>

        {/* Barra de filtros */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', padding: '10px 0 12px', borderBottom: '1px solid var(--border)', marginBottom: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 600 }}>
            Filtros
          </span>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Semana</span>
            <select
              value={filterWeek}
              onChange={(e) => setFilter('week', e.target.value)}
              style={{ padding: '5px 10px', fontSize: 11, borderRadius: 6, border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font-jakarta)', cursor: 'pointer', minWidth: 80 }}
            >
              <option value="">Todas</option>
              {uniqueWeeks.map((w) => (
                <option key={w} value={String(w)}>S{w}</option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Canal</span>
            <select
              value={filterChannelId}
              onChange={(e) => setFilter('channel_id', e.target.value)}
              style={{ padding: '5px 10px', fontSize: 11, borderRadius: 6, border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font-jakarta)', cursor: 'pointer', minWidth: 120 }}
            >
              <option value="">Todos</option>
              {channels.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Estado</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilter('status', e.target.value)}
              style={{ padding: '5px 10px', fontSize: 11, borderRadius: 6, border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font-jakarta)', cursor: 'pointer', minWidth: 110 }}
            >
              <option value="">Todos</option>
              {uniqueStatuses.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
              ))}
            </select>
          </label>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => navigate({ week: null, channel_id: null, status: null, page: null })}
              style={{ padding: '5px 10px', fontSize: 11, borderRadius: 6, border: '1px solid var(--border2)', background: 'var(--hover)', color: 'var(--text2)', fontFamily: 'var(--font-jakarta)', cursor: 'pointer' }}
            >
              Limpiar
            </button>
          )}

          <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>
            {totalCount.toLocaleString('es-EC')} resultado{totalCount !== 1 ? 's' : ''}
            {totalCount > 0 && ` · mostrando ${pageStart}–${pageEnd}`}
          </span>
        </div>

        {/* Tabla */}
        <div>
          {kpiSales.length === 0 ? (
            <EmptyState
              icon="💰"
              title="Aún no hay ventas en este período"
              description="Registra tus ventas para que Lumio calcule tu ticket promedio, margen de ganancia y tendencias semana a semana. Entre más datos tengas, más precisos serán los análisis."
              tip="Puedes registrar ventas rápidamente desde el formulario de la derecha. Si tienes ventas anteriores, cambia el período de fechas para verlas."
              action={{ label: '+ Registrar primera venta', href: '/sales' }}
              isFilterEmpty={!!(hasActiveFilters && sales.length === 0)}
              onClearFilter={() => { setFilter('filterWeek', ''); setFilter('filterChannelId', ''); setFilter('filterStatus', '') }}
            />
          ) : (
            <SalesHistoryTable
              sales={sales}
              userRole={userRole}
              onEdit={handleEdit}
              onCancel={handleCancel}
            />
          )}
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0 0', marginTop: 8, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              Página {currentPage + 1} de {totalPages}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 0}
                style={{ padding: '5px 10px', fontSize: 11, borderRadius: 6, border: '1px solid var(--border2)', background: 'var(--surface)', color: currentPage === 0 ? 'var(--muted)' : 'var(--text2)', cursor: currentPage === 0 ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-jakarta)', opacity: currentPage === 0 ? 0.5 : 1 }}
              >
                ← Anterior
              </button>

              {/* Números de página (máx 7 visibles) */}
              {Array.from({ length: totalPages }, (_, i) => i)
                .filter((i) => i === 0 || i === totalPages - 1 || Math.abs(i - currentPage) <= 2)
                .reduce<(number | '…')[]>((acc, i, idx, arr) => {
                  if (idx > 0 && i - (arr[idx - 1] as number) > 1) acc.push('…')
                  acc.push(i)
                  return acc
                }, [])
                .map((item, i) =>
                  item === '…' ? (
                    <span key={`ellipsis-${i}`} style={{ fontSize: 11, color: 'var(--muted)', padding: '0 4px' }}>…</span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPage(item as number)}
                      style={{
                        padding: '5px 9px',
                        fontSize: 11,
                        borderRadius: 6,
                        border: '1px solid var(--border2)',
                        background: item === currentPage ? 'var(--gold)' : 'var(--surface)',
                        color: item === currentPage ? '#000' : 'var(--text2)',
                        cursor: item === currentPage ? 'default' : 'pointer',
                        fontFamily: 'var(--font-jakarta)',
                        fontWeight: item === currentPage ? 700 : 400,
                        minWidth: 32,
                      }}
                    >
                      {(item as number) + 1}
                    </button>
                  )
                )}

              <button
                type="button"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
                style={{ padding: '5px 10px', fontSize: 11, borderRadius: 6, border: '1px solid var(--border2)', background: 'var(--surface)', color: currentPage >= totalPages - 1 ? 'var(--muted)' : 'var(--text2)', cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-jakarta)', opacity: currentPage >= totalPages - 1 ? 0.5 : 1 }}
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>

      {editOpen && selectedSale && (
        <EditSaleModal
          sale={selectedSale}
          customers={[]}
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
