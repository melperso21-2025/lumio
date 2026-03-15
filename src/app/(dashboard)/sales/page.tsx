import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import KpiCard from '@/components/ui/KpiCard'
import QuickSaleForm from '@/components/sales/QuickSaleForm'

// Badge de estado para una venta
function StatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
  }
  const config: Record<
    string,
    { bg: string; color: string; label: string }
  > = {
    closed: {
      bg: 'rgba(5,150,105,0.1)',
      color: 'var(--green)',
      label: 'Cerrada',
    },
    review: {
      bg: 'rgba(217,119,6,0.1)',
      color: 'var(--orange)',
      label: 'Revisión',
    },
    cancelled: {
      bg: 'rgba(220,38,38,0.1)',
      color: 'var(--red)',
      label: 'Anulada',
    },
    contact: {
      bg: 'rgba(37,99,235,0.08)',
      color: 'var(--blue)',
      label: 'Contacto',
    },
  }
  const c = config[status] ?? {
    bg: 'var(--hover)',
    color: 'var(--text2)',
    label: status,
  }
  return (
    <span
      style={{
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 6,
        background: c.bg,
        color: c.color,
      }}
    >
      {c.label}
    </span>
  )
}

// Formatea fecha para mostrar
function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export default async function SalesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const companyId = userData?.company_id
  if (!companyId) {
    return (
      <>
        <Topbar pageTitle="Ventas" pageSubtitle="Registro de transacciones" />
        <div style={{ padding: 20 }}>
          <p
            style={{
              fontFamily: 'var(--font-syne)',
              color: 'var(--muted)',
              fontSize: 14,
            }}
          >
            No tienes una empresa asignada.
          </p>
        </div>
      </>
    )
  }

  const { data: salesList } = await supabase
    .from('sales')
    .select(
      'id, sale_date, week_number, gross_total, discount_amount, lines_per_order, status, channel_id,  sales_channels(name)'
    )
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('sale_date', { ascending: false })
    .limit(50)

  const sales = salesList ?? []

  const total_sales = sales.reduce((s, r) => s + (r.gross_total ?? 0), 0)
  const total_transactions = sales.length
  const avg_lpp =
    sales.length > 0
      ? sales.reduce((s, r) => s + (r.lines_per_order ?? 0), 0) / sales.length
      : 0
  const total_discounts = sales.reduce(
    (s, r) => s + (r.discount_amount ?? 0),
    0
  )

  // Cargar canales de la empresa
  const { data: channelsList } = await supabase
    .from('sales_channels')
    .select('id, name')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('name')

  const channels = channelsList ?? []

  return (
    <>
      <Topbar pageTitle="Ventas" pageSubtitle="Registro de transacciones" />

      <div
        style={{
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* KPIs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
          }}
        >
          <KpiCard
            label="Ventas"
            prefix="$"
            value={total_sales}
            isGold
          />
          <KpiCard label="Transacciones" value={total_transactions} />
          <KpiCard
            label="LPP prom."
            value={avg_lpp.toFixed(1)}
            compare="líneas por pedido"
          />
          <KpiCard
            label="Descuentos"
            prefix="$"
            value={total_discounts}
          />
        </div>

        {/* Historial + formulario */}
        <div
          style={{
            borderRadius: 12,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            padding: 20,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <h2
              className="font-syne font-bold"
              style={{ fontSize: 16, color: 'var(--text)' }}
            >
              Historial de ventas
            </h2>
            <QuickSaleForm channels={channels} />
          </div>

          {sales.length === 0 ? (
            <p
              style={{
                textAlign: 'center',
                color: 'var(--muted)',
                fontSize: 14,
                padding: 32,
              }}
            >
              Aún no hay ventas registradas
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        color: 'var(--muted)',
                        fontWeight: 600,
                      }}
                    >
                      Fecha
                    </th>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        color: 'var(--muted)',
                        fontWeight: 600,
                      }}
                    >
                      Semana
                    </th>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        color: 'var(--muted)',
                        fontWeight: 600,
                      }}
                    >
                      Canal
                    </th>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        color: 'var(--muted)',
                        fontWeight: 600,
                      }}
                    >
                      LPP
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '10px 12px',
                        color: 'var(--muted)',
                        fontWeight: 600,
                      }}
                    >
                      Total
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '10px 12px',
                        color: 'var(--muted)',
                        fontWeight: 600,
                      }}
                    >
                      Descuento
                    </th>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        color: 'var(--muted)',
                        fontWeight: 600,
                      }}
                    >
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr
                      key={sale.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <td style={{ padding: '10px 12px', color: 'var(--text)' }}>
                        {formatDate(sale.sale_date)}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>
                        {sale.week_number ?? '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>
                        {(sale as any).sales_channels?.name ?? '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>
                        {sale.lines_per_order ?? '—'}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          color: 'var(--text)',
                          textAlign: 'right',
                        }}
                      >
                        $ {Number(sale.gross_total).toLocaleString('es-EC')}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          color: 'var(--text2)',
                          textAlign: 'right',
                        }}
                      >
                        $ {(sale.discount_amount ?? 0).toLocaleString('es-EC')}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <StatusBadge status={sale.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
