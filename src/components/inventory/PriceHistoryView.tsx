'use client'

import { useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

export type PriceHistoryRow = {
  id: string
  sale_price: number | null
  unit_cost: number | null
  supplier_price: number | null
  changed_at: string
  changed_by_name?: string | null
  notes: string | null
}

function fmt(n: number | null): string {
  if (n === null) return '—'
  return `$${n.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtShort(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${Math.round(n)}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12, minWidth: 160, boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
      <div style={{ color: 'var(--muted)', marginBottom: 6, fontSize: 11 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 3 }}>
          {p.name}: <strong>{fmt(p.value)}</strong>
        </div>
      ))}
    </div>
  )
}

interface Props {
  history: PriceHistoryRow[]
  currentSalePrice: number | null
  currentUnitCost: number | null
  currentSupplierPrice: number | null
}

export default function PriceHistoryView({
  history,
  currentSalePrice,
  currentUnitCost,
  currentSupplierPrice,
}: Props) {
  const chartData = useMemo(() => {
    // Ordenar cronológicamente para el gráfico
    const sorted = [...history].sort(
      (a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
    )
    return sorted.map((r) => ({
      label: new Date(r.changed_at).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: '2-digit' }),
      sale_price:     r.sale_price,
      unit_cost:      r.unit_cost,
      supplier_price: r.supplier_price,
    }))
  }, [history])

  const hasCost     = history.some((r) => r.unit_cost !== null)
  const hasSupplier = history.some((r) => r.supplier_price !== null)

  // Calcular variación desde el primer al último registro
  const first = history.length > 0 ? history[history.length - 1] : null
  const priceDelta = first?.sale_price && currentSalePrice
    ? ((currentSalePrice - first.sale_price) / first.sale_price) * 100
    : null

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h2 className="font-syne font-bold" style={{ fontSize: 15, color: 'var(--text)', margin: 0 }}>
            Historial de precios
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400, marginLeft: 8 }}>
              ({history.length} cambio{history.length !== 1 ? 's' : ''})
            </span>
          </h2>
          {priceDelta !== null && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
              Variación total precio de venta:
              <span style={{ marginLeft: 5, fontWeight: 700, color: priceDelta >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {priceDelta >= 0 ? '+' : ''}{priceDelta.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        {/* Precios actuales */}
        <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--muted)' }}>
          <div>
            Precio actual
            <div className="font-syne" style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold)', marginTop: 2 }}>
              {fmt(currentSalePrice)}
            </div>
          </div>
          {currentUnitCost !== null && (
            <div>
              Costo actual
              <div className="font-syne" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>
                {fmt(currentUnitCost)}
              </div>
            </div>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Sin cambios de precio registrados aún.
          </p>
          <p style={{ color: 'var(--muted)', fontSize: 11, marginTop: 6 }}>
            Los cambios futuros al guardar el producto quedarán registrados aquí.
          </p>
        </div>
      ) : (
        <>
          {/* Gráfico de evolución */}
          {chartData.length >= 2 && (
            <div style={{ marginBottom: 16 }}>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: 'var(--muted)' }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--muted)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={fmtShort}
                    width={48}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sale_price"
                    name="Precio venta"
                    stroke="#F5C842"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#F5C842', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                  />
                  {hasCost && (
                    <Line
                      type="monotone"
                      dataKey="unit_cost"
                      name="Costo unitario"
                      stroke="rgba(220,38,38,0.7)"
                      strokeWidth={1.5}
                      strokeDasharray="4 2"
                      dot={{ r: 3, fill: 'rgba(220,38,38,0.7)', strokeWidth: 0 }}
                      connectNulls={false}
                    />
                  )}
                  {hasSupplier && (
                    <Line
                      type="monotone"
                      dataKey="supplier_price"
                      name="Precio proveedor"
                      stroke="rgba(37,99,235,0.6)"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      dot={{ r: 3, fill: 'rgba(37,99,235,0.6)', strokeWidth: 0 }}
                      connectNulls={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tabla de cambios */}
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Fecha', 'Precio venta', 'Costo unitario', 'Precio proveedor', 'Margen', 'Notas'].map((h) => (
                    <th key={h} scope="col" style={{ padding: '7px 10px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...history]
                  .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())
                  .map((r, idx) => {
                    const margin = r.sale_price && r.unit_cost && r.sale_price > 0
                      ? (((r.sale_price - r.unit_cost) / r.sale_price) * 100).toFixed(1)
                      : null
                    const isLatest = idx === 0
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', background: isLatest ? 'var(--hover)' : 'transparent' }}>
                        <td style={{ padding: '9px 10px', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                          {new Date(r.changed_at).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {isLatest && (
                            <span style={{ marginLeft: 6, fontSize: 9, background: 'var(--gold)', color: '#000', borderRadius: 3, padding: '1px 5px', fontWeight: 700 }}>
                              ACTUAL
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '9px 10px', fontWeight: 700, color: 'var(--gold)', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(r.sale_price)}
                        </td>
                        <td style={{ padding: '9px 10px', color: 'var(--text2)', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(r.unit_cost)}
                        </td>
                        <td style={{ padding: '9px 10px', color: 'var(--text2)', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(r.supplier_price)}
                        </td>
                        <td style={{ padding: '9px 10px' }}>
                          {margin !== null ? (
                            <span style={{ color: parseFloat(margin) > 30 ? 'var(--green)' : parseFloat(margin) > 10 ? 'var(--orange)' : 'var(--red)', fontWeight: 600 }}>
                              {margin}%
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '9px 10px', color: 'var(--muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.notes ?? '—'}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
