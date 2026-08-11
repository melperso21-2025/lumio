'use client'

import { useMemo, useCallback, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import KpiCard from '@/components/ui/KpiCard'
import ExportButton from '@/components/ui/ExportButton'
import NewCustomerForm from '@/components/customers/NewCustomerForm'
import CustomersTable, { type CustomerRow, type CatalogItem } from '@/components/customers/CustomersTable'
import AiInsightBox from '@/components/ui/AiInsightBox'
import EmptyState from '@/components/ui/EmptyState'
import RFMSegmentation, { type RFMCustomer } from '@/components/customers/RFMSegmentation'

function calcDelta(
  current: number,
  previous: number,
  hasPrevData: boolean
): number | undefined {
  if (!hasPrevData || previous === 0) return undefined
  return Math.round(((current - previous) / previous) * 100)
}

interface CustomersOverviewProps {
  tableCustomers: CustomerRow[]
  tableTotal: number
  tablePage: number
  tablePageSize: number
  tableQ: string
  tableCtype: string
  tableClabel: string
  tableCiscompany: string
  tableSort?: string
  tableSortAsc?: boolean
  customers?: CustomerRow[]      // nuevos en el período — para KPIs
  prevCustomers?: CustomerRow[]
  customerTypes?: CatalogItem[]
  customerLabels?: CatalogItem[]
  rfmCustomers?: RFMCustomer[]
  from: string
  to: string
  prevFrom: string
  prevTo: string
}

export default function CustomersOverview({
  tableCustomers,
  tableTotal,
  tablePage,
  tablePageSize,
  tableQ,
  tableCtype,
  tableClabel,
  tableCiscompany,
  tableSort = 'lifetime_value',
  tableSortAsc = false,
  customers = [],
  prevCustomers = [],
  customerTypes = [],
  customerLabels = [],
  rfmCustomers = [],
  from,
  to,
}: CustomersOverviewProps) {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Build catalog maps
  const typeMap = useMemo(() => {
    const m = new Map<string, CatalogItem>()
    customerTypes.forEach((t) => m.set(t.id, t))
    return m
  }, [customerTypes])

  // KPIs from period-scoped customers
  const total_customers     = customers.length
  const prev_total_customers = prevCustomers.length
  const company_count       = customers.filter((c) => c.is_company).length
  const total_ltv           = customers.reduce((s, c) => s + (c.lifetime_value ?? 0), 0)
  const prev_total_ltv      = prevCustomers.reduce((s, c) => s + (c.lifetime_value ?? 0), 0)
  const hasPrevData         = prevCustomers.length > 0

  // Update URL param helper — resets cpage to 0 on filter change
  function setParam(key: string, value: string, resetPage = true) {
    startTransition(() => {
      const p = new URLSearchParams(searchParams.toString())
      if (value) p.set(key, value)
      else p.delete(key)
      if (resetPage) p.delete('cpage')
      router.replace(`${pathname}?${p.toString()}`)
    })
  }

  function handlePage(next: number) {
    const p = new URLSearchParams(searchParams.toString())
    if (next > 0) p.set('cpage', String(next))
    else p.delete('cpage')
    router.replace(`${pathname}?${p.toString()}`)
  }

  const totalPages = Math.ceil(tableTotal / tablePageSize)

  const exportData = tableCustomers.map((c) => ({
    Nombre: c.full_name ?? '',
    'Tipo ID': c.id_type ?? '',
    'N° ID': c.tax_id ?? '',
    Celular: c.mobile ?? '',
    Teléfono: c.phone ?? '',
    Email: c.email ?? '',
    Dirección: c.address ?? '',
    Tipo: typeMap.get(c.customer_type ?? '')?.name ?? c.customer_type ?? '',
    Etiqueta: c.label ?? '',
    Ventas: c.total_orders ?? 0,
    LTV: c.lifetime_value ?? 0,
    Empresa: c.is_company ? 'Sí' : 'No',
    'Última compra': c.last_purchase_at ?? '',
    'Cliente desde': c.registered_since ?? '',
  }))

  const onFilterChange = useCallback((
    text: string, type: string, label: string, isCompany: boolean | null
  ) => {
    startTransition(() => {
      const p = new URLSearchParams(searchParams.toString())
      if (text)  p.set('q', text);      else p.delete('q')
      if (type)  p.set('ctype', type);  else p.delete('ctype')
      if (label) p.set('clabel', label);else p.delete('clabel')
      if (isCompany === true)  p.set('ciscompany', 'true')
      else if (isCompany === false) p.set('ciscompany', 'false')
      else p.delete('ciscompany')
      p.delete('cpage')
      router.replace(`${pathname}?${p.toString()}`)
    })
  }, [searchParams, pathname, router])

  const onSortChange = useCallback((key: string, asc: boolean) => {
    startTransition(() => {
      const p = new URLSearchParams(searchParams.toString())
      p.set('csort', key)
      p.set('cdir', asc ? 'asc' : 'desc')
      p.delete('cpage')
      router.replace(`${pathname}?${p.toString()}`)
    })
  }, [searchParams, pathname, router])

  const filterIsCompany: boolean | null =
    tableCiscompany === 'true' ? true : tableCiscompany === 'false' ? false : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* KPIs — período */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, flexShrink: 0 }}>
        <KpiCard
          label="Nuevos clientes"
          value={total_customers}
          delta={calcDelta(total_customers, prev_total_customers, hasPrevData)}
          compare={prev_total_customers > 0 ? `Ant: ${prev_total_customers}` : undefined}
        />
        <KpiCard label="Empresas (período)" value={company_count} />
        <KpiCard
          label="LTV nuevos"
          prefix="$"
          value={Math.round(total_ltv)}
          delta={calcDelta(total_ltv, prev_total_ltv, hasPrevData)}
          compare={prev_total_ltv > 0 ? `Ant: $${Math.round(prev_total_ltv)}` : undefined}
        />
        <KpiCard
          label="Total en directorio"
          value={tableTotal}
          compare="todos los clientes activos"
        />
      </div>

      {/* Segmentación RFM */}
      {rfmCustomers.length > 0 && (
        <div style={{ flexShrink: 0 }}>
          <RFMSegmentation customers={rfmCustomers} />
        </div>
      )}

      {/* Directorio card */}
      <div
        style={{
          borderRadius: 12,
          background: 'var(--card)',
          border: '1px solid var(--border)',
          padding: '14px 16px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 className="font-syne font-bold" style={{ fontSize: 16, color: 'var(--text)' }}>
              Directorio de clientes
            </h2>
            {isPending && (
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Cargando…</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ExportButton
              data={exportData}
              filename={`clientes_${from}_${to}`}
              sheetName="Clientes"
            />
            <NewCustomerForm />
          </div>
        </div>

        {tableTotal === 0 && !tableQ && !tableCtype && !tableClabel && !tableCiscompany ? (
          <EmptyState
            icon="👥"
            title="Aún no tienes clientes registrados"
            description="Tu directorio de clientes te permite saber quién te compra más, con qué frecuencia y cuánto ha gastado en total (LTV). Con esa información puedes enfocarte en los clientes que más aportan al negocio."
            tip="No tienes que cargar todos de una vez. Empieza añadiendo a tus 5 mejores clientes. Lumio los clasifica automáticamente en VIP, frecuentes y en riesgo de perderse."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <CustomersTable
              customers={tableCustomers}
              customerTypes={customerTypes}
              customerLabels={customerLabels}
              filterText={tableQ}
              filterType={tableCtype}
              filterLabel={tableClabel}
              filterIsCompany={filterIsCompany}
              onFilterChange={onFilterChange}
              initialSortBy={tableSort}
              initialSortAsc={tableSortAsc}
              onSortChange={onSortChange}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: 10,
                  flexShrink: 0,
                  borderTop: '1px solid var(--border)',
                }}
              >
                <span style={{ fontSize: 11, color: 'var(--text2)' }}>
                  Mostrando {tablePage * tablePageSize + 1}–{Math.min((tablePage + 1) * tablePageSize, tableTotal)} de {tableTotal} clientes
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handlePage(tablePage - 1)}
                    disabled={tablePage === 0}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border2)',
                      background: 'var(--surface)',
                      color: tablePage === 0 ? 'var(--muted)' : 'var(--text)',
                      fontSize: 12,
                      cursor: tablePage === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ← Anterior
                  </button>
                  <span style={{ padding: '4px 10px', fontSize: 12, color: 'var(--text2)' }}>
                    {tablePage + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => handlePage(tablePage + 1)}
                    disabled={tablePage >= totalPages - 1}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border2)',
                      background: 'var(--surface)',
                      color: tablePage >= totalPages - 1 ? 'var(--muted)' : 'var(--text)',
                      fontSize: 12,
                      cursor: tablePage >= totalPages - 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
