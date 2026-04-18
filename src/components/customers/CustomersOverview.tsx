'use client'

import { useState, useMemo } from 'react'
import KpiCard from '@/components/ui/KpiCard'
import ExportButton from '@/components/ui/ExportButton'
import NewCustomerForm from '@/components/customers/NewCustomerForm'
import CustomersTable, { type CustomerRow, type CatalogItem } from '@/components/customers/CustomersTable'
import AiInsightBox from '@/components/ui/AiInsightBox'

function calcDelta(
  current: number,
  previous: number,
  hasPrevData: boolean
): number | undefined {
  if (!hasPrevData || previous === 0) return undefined
  return Math.round(((current - previous) / previous) * 100)
}

interface CustomersOverviewProps {
  customers: CustomerRow[]
  prevCustomers: CustomerRow[]
  customerTypes: CatalogItem[]
  customerLabels: CatalogItem[]
  from: string
  to: string
  prevFrom: string
  prevTo: string
}

export default function CustomersOverview({
  customers,
  prevCustomers,
  customerTypes,
  customerLabels,
  from,
  to,
  prevFrom,
  prevTo,
}: CustomersOverviewProps) {
  const [filterText, setFilterText] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterLabel, setFilterLabel] = useState('')
  const [filterIsCompany, setFilterIsCompany] = useState<boolean | null>(null)

  // Build catalog maps for KPI lookup
  const typeMap = useMemo(() => {
    const m = new Map<string, CatalogItem>()
    customerTypes.forEach((t) => m.set(t.id, t))
    return m
  }, [customerTypes])

  const filteredCustomers = useMemo(() => {
    const txt = filterText.toLowerCase()
    return customers.filter((c) => {
      if (txt) {
        const name  = (c.full_name ?? '').toLowerCase()
        const email = (c.email ?? '').toLowerCase()
        const taxId = (c.tax_id ?? '').toLowerCase()
        if (!name.includes(txt) && !email.includes(txt) && !taxId.includes(txt)) return false
      }
      if (filterType && (c.customer_type ?? '') !== filterType) return false
      if (filterLabel && (c.label ?? '') !== filterLabel) return false
      if (filterIsCompany !== null && (c.is_company ?? false) !== filterIsCompany) return false
      return true
    })
  }, [customers, filterText, filterType, filterLabel, filterIsCompany])

  const filteredPrevCustomers = useMemo(() => {
    const txt = filterText.toLowerCase()
    return prevCustomers.filter((c) => {
      if (txt) {
        const name  = (c.full_name ?? '').toLowerCase()
        const email = (c.email ?? '').toLowerCase()
        const taxId = (c.tax_id ?? '').toLowerCase()
        if (!name.includes(txt) && !email.includes(txt) && !taxId.includes(txt)) return false
      }
      if (filterType && (c.customer_type ?? '') !== filterType) return false
      if (filterLabel && (c.label ?? '') !== filterLabel) return false
      if (filterIsCompany !== null && (c.is_company ?? false) !== filterIsCompany) return false
      return true
    })
  }, [prevCustomers, filterText, filterType, filterLabel, filterIsCompany])

  // KPIs — count by label id or type id from catalog
  const vipLabelId = useMemo(
    () => customerLabels.find((l) => l.name.toLowerCase() === 'vip')?.id ?? '__none__',
    [customerLabels]
  )
  const wholesaleTypeId = useMemo(
    () => customerTypes.find((t) => t.name.toLowerCase().includes('mayor'))?.id ?? '__none__',
    [customerTypes]
  )

  const total_customers    = filteredCustomers.length
  const company_count      = filteredCustomers.filter((c) => c.is_company).length
  const total_ltv          = filteredCustomers.reduce((s, c) => s + (c.lifetime_value ?? 0), 0)

  const prev_total_customers = filteredPrevCustomers.length
  const prev_total_ltv       = filteredPrevCustomers.reduce((s, c) => s + (c.lifetime_value ?? 0), 0)

  const hasPrevData = filteredPrevCustomers.length > 0

  const exportData = filteredCustomers.map((c) => ({
    Nombre: c.full_name ?? '',
    'Tipo ID': c.id_type ?? '',
    'N° ID': c.tax_id ?? '',
    Teléfono: c.phone ?? '',
    Email: c.email ?? '',
    Dirección: c.address ?? '',
    Tipo: typeMap.get(c.customer_type ?? '')?.name ?? c.customer_type ?? '',
    Etiqueta: c.label ?? '',
    LTV: c.lifetime_value ?? 0,
    Empresa: c.is_company ? 'Sí' : 'No',
    'Última compra': c.last_purchase_at ?? '',
    'Cliente desde': c.registered_since ?? '',
  }))

  function handleFilterChange(
    text: string,
    type: string,
    label: string,
    isCompany: boolean | null
  ) {
    setFilterText(text)
    setFilterType(type)
    setFilterLabel(label)
    setFilterIsCompany(isCompany)
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
      {/* KPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <KpiCard
          label="Total clientes"
          value={total_customers}
          delta={calcDelta(total_customers, prev_total_customers, hasPrevData)}
          compare={
            prev_total_customers > 0 ? `Ant: ${prev_total_customers}` : undefined
          }
        />
        <KpiCard
          label="Empresas"
          value={company_count}
        />
        <KpiCard
          label="LTV total"
          prefix="$"
          value={Math.round(total_ltv)}
          delta={calcDelta(total_ltv, prev_total_ltv, hasPrevData)}
          compare={
            prev_total_ltv > 0 ? `Ant: $${Math.round(prev_total_ltv)}` : undefined
          }
        />
        <KpiCard
          label="Ticket promedio"
          prefix="$"
          value={
            total_customers > 0
              ? Math.round(total_ltv / total_customers)
              : 0
          }
        />
      </div>

      {/* Directorio card */}
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
            Directorio de clientes
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ExportButton
              data={exportData}
              filename={`clientes_${from}_${to}`}
              sheetName="Clientes"
            />
            <NewCustomerForm />
          </div>
        </div>

        {customers.length === 0 ? (
          <AiInsightBox
            variant="blue"
            title="Sin clientes registrados"
            text="Aún no hay clientes en el directorio. Usa el botón '+ Nuevo cliente' para agregar el primero."
          />
        ) : (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <CustomersTable
              customers={customers}
              customerTypes={customerTypes}
              customerLabels={customerLabels}
              filterText={filterText}
              filterType={filterType}
              filterLabel={filterLabel}
              filterIsCompany={filterIsCompany}
              onFilterChange={handleFilterChange}
            />
          </div>
        )}
      </div>
    </div>
  )
}
