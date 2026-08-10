'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatBusinessDate } from '@/lib/dateUtils'
import EditCustomerModal from '@/components/customers/EditCustomerModal'

// ── Types ──────────────────────────────────────────────────────────────────

export interface CustomerDetail {
  id: string
  full_name: string | null
  mobile: string | null
  phone: string | null
  email: string | null
  tax_id: string | null
  id_type: string | null
  customer_type: string | null
  label: string | null
  lifetime_value: number | null
  last_purchase_at: string | null
  registered_since: string | null
  is_company: boolean | null
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  address: string | null
  created_at: string
}

interface SaleItem {
  id: string
  quantity: number
  unit_price: number
  subtotal: number
  products: { name: string; sku: string | null } | null
}

export interface SaleHistory {
  id: string
  sale_date: string
  status: string | null
  gross_total: number | null
  discount_amount: number | null
  lines_per_order: number | null
  branches: { name: string } | null
  sales_channels: { name: string } | null
  sale_items: SaleItem[]
}

interface CatalogItem {
  id: string
  name: string
  color: string
}

interface CustomerDetailViewProps {
  customer: CustomerDetail
  sales: SaleHistory[]
  customerTypes: CatalogItem[]
  customerLabels: CatalogItem[]
  userRole: string
  companyId: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

const idTypeLabel: Record<string, string> = {
  cedula: 'Cédula',
  ruc: 'RUC',
  pasaporte: 'Pasaporte',
}

const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
  closed:  { bg: 'rgba(5,150,105,0.08)',   color: 'var(--green)', label: 'Cerrada' },
  review:  { bg: 'rgba(217,119,6,0.08)',   color: 'var(--orange)', label: 'Revisión' },
  contact: { bg: 'rgba(37,99,235,0.08)',   color: 'var(--blue)',  label: 'Contacto' },
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        padding: '8px 0',
        borderBottom: '1px solid var(--border)',
        alignItems: 'flex-start',
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: 'var(--muted)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          flexShrink: 0,
          width: 130,
          paddingTop: 1,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 13, color: 'var(--text)', flex: 1 }}>
        {value ?? <span style={{ color: 'var(--muted)' }}>—</span>}
      </span>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CustomerDetailView({
  customer,
  sales,
  customerTypes,
  customerLabels,
  userRole,
  companyId,
}: CustomerDetailViewProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [currentCustomer, setCurrentCustomer] = useState(customer)

  const canEdit = userRole === 'admin' || userRole === 'manager'

  const typeMap = new Map(customerTypes.map((t) => [t.id, t]))
  const labelMap = new Map(customerLabels.map((l) => [l.id, l]))

  const typeCfg = typeMap.get(currentCustomer.customer_type ?? '')
  const labelCfg = labelMap.get(currentCustomer.label ?? '')

  // KPIs
  const totalTransactions = sales.length
  const avgTicket =
    totalTransactions > 0
      ? (sales.reduce((s, v) => s + (v.gross_total ?? 0), 0) / totalTransactions)
      : 0

  return (
    <div
      style={{
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {/* ── Header card ───────────────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '16px 20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          {/* Left: name + badges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h1
                className="font-syne font-bold"
                style={{ fontSize: 20, color: 'var(--text)', margin: 0 }}
              >
                {currentCustomer.full_name ?? '—'}
              </h1>
              {currentCustomer.is_company && (
                <span
                  style={{
                    fontSize: 10,
                    padding: '2px 8px',
                    borderRadius: 5,
                    background: 'rgba(37,99,235,0.1)',
                    color: 'var(--blue)',
                    fontWeight: 700,
                  }}
                >
                  Empresa
                </span>
              )}
              {typeCfg && (
                <span
                  style={{
                    fontSize: 10,
                    padding: '2px 8px',
                    borderRadius: 5,
                    background: `${typeCfg.color}22`,
                    color: typeCfg.color,
                    border: `1px solid ${typeCfg.color}44`,
                    fontWeight: 600,
                  }}
                >
                  {typeCfg.name}
                </span>
              )}
              {labelCfg && (
                <span
                  style={{
                    fontSize: 10,
                    padding: '2px 8px',
                    borderRadius: 5,
                    background: `${labelCfg.color}22`,
                    color: labelCfg.color,
                    border: `1px solid ${labelCfg.color}44`,
                    fontWeight: 600,
                  }}
                >
                  {labelCfg.name}
                </span>
              )}
            </div>
            {currentCustomer.tax_id && (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
                {idTypeLabel[currentCustomer.id_type ?? ''] ?? currentCustomer.id_type}:{' '}
                <span style={{ color: 'var(--text2)', fontWeight: 500 }}>
                  {currentCustomer.tax_id}
                </span>
              </p>
            )}
          </div>

          {/* Right: edit + back */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link
              href="/customers"
              style={{
                fontSize: 12,
                padding: '7px 14px',
                borderRadius: 8,
                border: '1px solid var(--border2)',
                background: 'var(--surface)',
                color: 'var(--text2)',
                textDecoration: 'none',
              }}
            >
              ← Volver
            </Link>
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="font-syne font-bold text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg, #F5C842, #F09A1A)',
                  color: '#1A1B2E',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Editar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
        }}
      >
        {[
          {
            label: 'LTV',
            value: `$${(currentCustomer.lifetime_value ?? 0).toLocaleString('es-EC', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            gold: true,
          },
          { label: 'Compras', value: String(totalTransactions) },
          {
            label: 'Ticket promedio',
            value: `$${avgTicket.toLocaleString('es-EC', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
          },
          {
            label: 'Última compra',
            value: formatBusinessDate(currentCustomer.last_purchase_at) ?? '—',
          },
        ].map((k) => (
          <div
            key={k.label}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '12px 14px',
            }}
          >
            <p
              style={{
                fontSize: 9,
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 600,
                margin: '0 0 4px',
              }}
            >
              {k.label}
            </p>
            <p
              className="font-syne font-bold"
              style={{
                fontSize: 18,
                margin: 0,
                color: k.gold ? 'var(--gold)' : 'var(--text)',
              }}
            >
              {k.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Info + company contact ────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: currentCustomer.is_company ? '1fr 1fr' : '1fr',
          gap: 12,
        }}
      >
        {/* Datos de contacto */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '14px 18px',
          }}
        >
          <h2
            className="font-syne font-bold"
            style={{ fontSize: 13, color: 'var(--text)', marginBottom: 8 }}
          >
            Datos de contacto
          </h2>
          <InfoRow label="Celular" value={currentCustomer.mobile} />
          <InfoRow label="Teléfono" value={currentCustomer.phone} />
          <InfoRow label="Email" value={currentCustomer.email} />
          <InfoRow label="Dirección" value={currentCustomer.address} />
          <InfoRow label="Cliente desde" value={formatBusinessDate(currentCustomer.registered_since)} />
        </div>

        {/* Contacto de empresa */}
        {currentCustomer.is_company && (
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid rgba(37,99,235,0.2)',
              borderRadius: 12,
              padding: '14px 18px',
            }}
          >
            <h2
              className="font-syne font-bold"
              style={{ fontSize: 13, color: 'var(--blue)', marginBottom: 8 }}
            >
              Contacto de empresa
            </h2>
            <InfoRow label="Persona de contacto" value={currentCustomer.contact_name} />
            <InfoRow label="Teléfono" value={currentCustomer.contact_phone} />
            <InfoRow label="Email" value={currentCustomer.contact_email} />
          </div>
        )}
      </div>

      {/* ── Sales history ─────────────────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '14px 18px',
        }}
      >
        <h2
          className="font-syne font-bold"
          style={{ fontSize: 14, color: 'var(--text)', marginBottom: 12 }}
        >
          Historial de compras ({totalTransactions})
        </h2>

        {sales.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted)', padding: '8px 0' }}>
            Este cliente no tiene compras registradas aún.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Fecha', 'Sucursal', 'Canal', 'Productos', 'Total', 'Estado'].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          padding: '8px 12px',
                          color: 'var(--muted)',
                          fontWeight: 600,
                          fontSize: 11,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => {
                  const sc = statusConfig[s.status ?? ''] ?? {
                    bg: 'var(--hover)',
                    color: 'var(--text2)',
                    label: s.status ?? '—',
                  }
                  return (
                    <tr
                      key={s.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => {
                        ;(e.currentTarget as HTMLTableRowElement).style.background =
                          'var(--hover)'
                      }}
                      onMouseLeave={(e) => {
                        ;(e.currentTarget as HTMLTableRowElement).style.background =
                          'transparent'
                      }}
                      onClick={() => {
                        window.location.href = `/sales/${s.id}`
                      }}
                    >
                      <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>
                        {formatBusinessDate(s.sale_date)}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>
                        {s.branches?.name ?? '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>
                        {s.sales_channels?.name ?? '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>
                        {s.sale_items.length > 0 ? (
                          <span>
                            {s.sale_items
                              .slice(0, 2)
                              .map((i) => i.products?.name ?? '?')
                              .join(', ')}
                            {s.sale_items.length > 2 && (
                              <span style={{ color: 'var(--muted)' }}>
                                {' '}+{s.sale_items.length - 2}
                              </span>
                            )}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          color: 'var(--gold)',
                          fontWeight: 700,
                        }}
                        className="font-syne"
                      >
                        $
                        {(s.gross_total ?? 0).toLocaleString('es-EC', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 5,
                            background: sc.bg,
                            color: sc.color,
                            fontWeight: 500,
                          }}
                        >
                          {sc.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Edit modal ────────────────────────────────────────────────────── */}
      {editOpen && (
        <EditCustomerModal
          customer={currentCustomer}
          customerTypes={customerTypes}
          customerLabels={customerLabels}
          companyId={companyId}
          onClose={() => setEditOpen(false)}
          onSuccess={(updated) => {
            setCurrentCustomer(updated)
            setEditOpen(false)
          }}
        />
      )}
    </div>
  )
}
