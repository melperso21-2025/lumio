'use client'

import { useState, useMemo } from 'react'
import KpiCard from '@/components/ui/KpiCard'
import ExportButton from '@/components/ui/ExportButton'
import NewCustomerForm from '@/components/customers/NewCustomerForm'
import CustomersTable from '@/components/customers/CustomersTable'
import AiInsightBox from '@/components/ui/AiInsightBox'

type CustomerRow = {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  customer_type: string | null
  label: string | null
  lifetime_value: number | null
  last_purchase_at: string | null
  registered_since: string | null
  created_at: string
}

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
  from: string
  to: string
  prevFrom: string
  prevTo: string
}

export default function CustomersOverview({
  customers,
  prevCustomers,
  from,
  to,
  prevFrom,
  prevTo,
}: CustomersOverviewProps) {
  const [filterName, setFilterName] = useState<string>('')
  const [filterPhone, setFilterPhone] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')
  const [filterLabel, setFilterLabel] = useState<string>('')

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const name = (c.full_name ?? '').toLowerCase()
      const phoneStr = (c.phone ?? '').toLowerCase()
      if (filterName && !name.includes(filterName.toLowerCase())) return false
      if (filterPhone && !phoneStr.includes(filterPhone.toLowerCase())) return false
      if (filterType && (c.customer_type ?? '') !== filterType) return false
      if (filterLabel && (c.label ?? '') !== filterLabel) return false
      return true
    })
  }, [customers, filterName, filterPhone, filterType, filterLabel])

  const filteredPrevCustomers = useMemo(() => {
    return prevCustomers.filter((c) => {
      const name = (c.full_name ?? '').toLowerCase()
      const phoneStr = (c.phone ?? '').toLowerCase()
      if (filterName && !name.includes(filterName.toLowerCase())) return false
      if (filterPhone && !phoneStr.includes(filterPhone.toLowerCase())) return false
      if (filterType && (c.customer_type ?? '') !== filterType) return false
      if (filterLabel && (c.label ?? '') !== filterLabel) return false
      return true
    })
  }, [prevCustomers, filterName, filterPhone, filterType, filterLabel])

  const total_customers = filteredCustomers.length
  const vip_count = filteredCustomers.filter((c) => c.label === 'vip').length
  const wholesale_count = filteredCustomers.filter(
    (c) => c.customer_type === 'wholesale'
  ).length
  const total_ltv = filteredCustomers.reduce(
    (s, c) => s + (c.lifetime_value ?? 0),
    0
  )

  const prev_total_customers = filteredPrevCustomers.length
  const prev_vip_count = filteredPrevCustomers.filter((c) => c.label === 'vip').length
  const prev_wholesale_count = filteredPrevCustomers.filter(
    (c) => c.customer_type === 'wholesale'
  ).length
  const prev_total_ltv = filteredPrevCustomers.reduce(
    (s, c) => s + (c.lifetime_value ?? 0),
    0
  )

  const hasPrevData = filteredPrevCustomers.length > 0

  const exportData = filteredCustomers.map((c) => ({
    Nombre: c.full_name ?? '',
    Teléfono: c.phone ?? '',
    Email: c.email ?? '',
    Tipo: c.customer_type ?? '',
    Etiqueta: c.label ?? '',
    LTV: c.lifetime_value ?? 0,
    'Última compra': c.last_purchase_at ?? '',
    'Cliente desde': c.registered_since ?? '',
  }))

  function handleFilterChange(
    name: string,
    phone: string,
    type: string,
    label: string
  ) {
    setFilterName(name)
    setFilterPhone(phone)
    setFilterType(type)
    setFilterLabel(label)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        flex: 1,
        minHeight: 0,
      }}
    >
      {/* KPIs (estáticos, con deltas) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <KpiCard
          label="Total clientes"
          value={total_customers}
          delta={calcDelta(total_customers, prev_total_customers, hasPrevData)}
          compare={
            prev_total_customers > 0
              ? `Ant: ${prev_total_customers}`
              : undefined
          }
        />
        <KpiCard
          label="VIP"
          value={vip_count}
          isGold
          delta={calcDelta(vip_count, prev_vip_count, hasPrevData)}
          compare={
            prev_vip_count > 0 ? `Ant: ${prev_vip_count}` : undefined
          }
        />
        <KpiCard
          label="Mayoristas"
          value={wholesale_count}
          delta={calcDelta(wholesale_count, prev_wholesale_count, hasPrevData)}
          compare={
            prev_wholesale_count > 0 ? `Ant: ${prev_wholesale_count}` : undefined
          }
        />
        <KpiCard
          label="LTV total"
          prefix="$"
          value={total_ltv.toLocaleString('es-EC', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          delta={calcDelta(total_ltv, prev_total_ltv, hasPrevData)}
          compare={
            prev_total_ltv > 0
              ? `Ant: $${prev_total_ltv.toLocaleString('es-EC', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}`
              : undefined
          }
        />
      </div>

      {/* Card directorio */}
      <div
        style={{
          borderRadius: 12,
          background: 'var(--card)',
          border: '1px solid var(--border)',
          padding: 20,
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
            marginBottom: 16,
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
              filterName={filterName}
              filterPhone={filterPhone}
              filterType={filterType}
              filterLabel={filterLabel}
              onFilterChange={handleFilterChange}
            />
          </div>
        )}
      </div>
    </div>
  )
}
