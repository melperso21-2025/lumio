'use client'

import { useMemo, useState } from 'react'

export type RFMCustomer = {
  id: string
  full_name: string | null
  last_purchase_at: string | null
  total_orders: number | null
  lifetime_value: number | null
}

type SegmentKey = 'champions' | 'loyal' | 'at_risk' | 'new_customer' | 'need_attention' | 'lost'

const SEGMENTS: Record<SegmentKey, {
  label: string
  color: string
  bg: string
  border: string
  description: string
  emoji: string
}> = {
  champions:      { label: 'Campeones',           emoji: '🏆', color: '#059669', bg: 'rgba(5,150,105,0.08)',   border: 'rgba(5,150,105,0.25)',   description: 'Alta recencia, frecuencia y valor. Tus mejores clientes.' },
  loyal:          { label: 'Leales',              emoji: '💎', color: '#2563EB', bg: 'rgba(37,99,235,0.07)',  border: 'rgba(37,99,235,0.2)',    description: 'Compran regularmente con buen historial.' },
  at_risk:        { label: 'En riesgo',           emoji: '⚠️', color: '#F97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)',  description: 'Buenos clientes que no han regresado. Actúa rápido.' },
  new_customer:   { label: 'Nuevos',              emoji: '✨', color: '#06B6D4', bg: 'rgba(6,182,212,0.08)',  border: 'rgba(6,182,212,0.25)',   description: 'Primera o segunda compra reciente. Gran potencial.' },
  need_attention: { label: 'Necesitan atención',  emoji: '👋', color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)',   description: 'Compra intermedia, frecuencia baja. Reactivar.' },
  lost:           { label: 'Perdidos',            emoji: '💤', color: '#94a3b8', bg: 'rgba(148,163,184,0.06)', border: 'rgba(148,163,184,0.2)',  description: 'No han comprado en mucho tiempo. Campaña de reactivación.' },
}

function scoreR(daysSince: number | null): 1 | 2 | 3 {
  if (daysSince === null) return 1
  if (daysSince <= 30)  return 3
  if (daysSince <= 90)  return 2
  return 1
}

function scoreF(orders: number | null): 1 | 2 | 3 {
  const n = orders ?? 0
  if (n >= 5) return 3
  if (n >= 2) return 2
  return 1
}

function scoreM(ltv: number, p33: number, p66: number): 1 | 2 | 3 {
  if (ltv >= p66) return 3
  if (ltv >= p33) return 2
  return 1
}

function assignSegment(r: 1|2|3, f: 1|2|3, m: 1|2|3): SegmentKey {
  if (r === 3 && f >= 2 && m >= 2) return 'champions'
  if (r >= 2 && f >= 2)            return 'loyal'
  if (r === 1 && f >= 2)           return 'at_risk'
  if (r === 3 && f === 1)          return 'new_customer'
  if (r === 2 && f === 1)          return 'need_attention'
  return 'lost'
}

function fmt(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${Math.round(n)}`
}

export default function RFMSegmentation({ customers }: { customers: RFMCustomer[] }) {
  const [activeSegment, setActiveSegment] = useState<SegmentKey | null>(null)

  // Solo clientes que han comprado al menos una vez
  const buyingCustomers = useMemo(
    () => customers.filter((c) => (c.total_orders ?? 0) > 0),
    [customers]
  )

  const segments = useMemo(() => {
    if (buyingCustomers.length === 0) return null

    const today = new Date()

    // Percentiles de LTV para score M
    const ltvSorted = [...buyingCustomers]
      .map((c) => c.lifetime_value ?? 0)
      .sort((a, b) => a - b)
    const p33 = ltvSorted[Math.floor(ltvSorted.length * 0.33)] ?? 0
    const p66 = ltvSorted[Math.floor(ltvSorted.length * 0.66)] ?? 0

    const result: Record<SegmentKey, { customers: RFMCustomer[]; totalLtv: number }> = {
      champions:      { customers: [], totalLtv: 0 },
      loyal:          { customers: [], totalLtv: 0 },
      at_risk:        { customers: [], totalLtv: 0 },
      new_customer:   { customers: [], totalLtv: 0 },
      need_attention: { customers: [], totalLtv: 0 },
      lost:           { customers: [], totalLtv: 0 },
    }

    for (const c of buyingCustomers) {
      const daysSince = c.last_purchase_at
        ? Math.floor((today.getTime() - new Date(c.last_purchase_at).getTime()) / 86400000)
        : null

      const r = scoreR(daysSince)
      const f = scoreF(c.total_orders)
      const m = scoreM(c.lifetime_value ?? 0, p33, p66)
      const seg = assignSegment(r, f, m)

      result[seg].customers.push(c)
      result[seg].totalLtv += c.lifetime_value ?? 0
    }

    return result
  }, [buyingCustomers])

  const segmentOrder: SegmentKey[] = ['champions', 'loyal', 'at_risk', 'new_customer', 'need_attention', 'lost']

  if (!segments || buyingCustomers.length === 0) {
    return (
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Segmentación RFM
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>
          Se necesitan clientes con historial de compras para calcular la segmentación RFM.
        </p>
      </div>
    )
  }

  const totalWithPurchases = buyingCustomers.length
  const activeData = activeSegment ? segments[activeSegment] : null

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>

      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Segmentación RFM
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
            Recencia · Frecuencia · Valor monetario — {totalWithPurchases} clientes con compras
          </div>
        </div>
        {activeSegment && (
          <button
            type="button"
            onClick={() => setActiveSegment(null)}
            style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 8px' }}
          >
            ✕ Cerrar detalle
          </button>
        )}
      </div>

      {/* Cards de segmentos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: activeData ? 14 : 0 }}>
        {segmentOrder.map((key) => {
          const seg    = SEGMENTS[key]
          const data   = segments[key]
          const pct    = totalWithPurchases > 0 ? (data.customers.length / totalWithPurchases) * 100 : 0
          const isActive = activeSegment === key

          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveSegment(isActive ? null : key)}
              style={{
                background: isActive ? seg.bg : 'var(--surface)',
                border: `1px solid ${isActive ? seg.color : 'var(--border)'}`,
                borderRadius: 10,
                padding: '10px 12px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
                outline: 'none',
              }}
            >
              <div style={{ fontSize: 16, marginBottom: 4 }}>{seg.emoji}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: seg.color, fontFamily: 'var(--font-syne)', marginBottom: 2 }}>
                {data.customers.length}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 600, marginBottom: 4, lineHeight: 1.2 }}>
                {seg.label}
              </div>
              {/* Barra de progreso */}
              <div style={{ height: 3, borderRadius: 2, background: 'var(--border)', overflow: 'hidden', marginBottom: 4 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: seg.color, borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 9, color: 'var(--muted)' }}>
                {pct.toFixed(0)}% · {fmt(data.totalLtv)}
              </div>
            </button>
          )
        })}
      </div>

      {/* Panel de detalle del segmento activo */}
      {activeData && activeSegment && (
        <div
          style={{
            border: `1px solid ${SEGMENTS[activeSegment].border}`,
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          {/* Header del panel */}
          <div
            style={{
              background: SEGMENTS[activeSegment].bg,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `1px solid ${SEGMENTS[activeSegment].border}`,
            }}
          >
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: SEGMENTS[activeSegment].color, fontFamily: 'var(--font-syne)' }}>
                {SEGMENTS[activeSegment].emoji} {SEGMENTS[activeSegment].label}
              </span>
              <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 10 }}>
                {SEGMENTS[activeSegment].description}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>
              LTV total: <strong style={{ color: 'var(--text)' }}>{fmt(activeData.totalLtv)}</strong>
            </div>
          </div>

          {/* Lista de clientes */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {activeData.customers.length === 0 ? (
              <p style={{ padding: '16px', fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
                Ningún cliente en este segmento para el período seleccionado.
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--card)', zIndex: 1 }}>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '7px 14px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600, fontSize: 11 }}>Cliente</th>
                    <th style={{ padding: '7px 14px', textAlign: 'right', color: 'var(--muted)', fontWeight: 600, fontSize: 11 }}>Pedidos</th>
                    <th style={{ padding: '7px 14px', textAlign: 'right', color: 'var(--muted)', fontWeight: 600, fontSize: 11 }}>LTV</th>
                    <th style={{ padding: '7px 14px', textAlign: 'right', color: 'var(--muted)', fontWeight: 600, fontSize: 11 }}>Última compra</th>
                  </tr>
                </thead>
                <tbody>
                  {activeData.customers
                    .sort((a, b) => (b.lifetime_value ?? 0) - (a.lifetime_value ?? 0))
                    .map((c) => {
                      const daysSince = c.last_purchase_at
                        ? Math.floor((Date.now() - new Date(c.last_purchase_at).getTime()) / 86400000)
                        : null
                      return (
                        <tr
                          key={c.id}
                          style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ padding: '8px 14px', color: 'var(--text)' }}>
                            {c.full_name ?? <span style={{ color: 'var(--muted)' }}>Sin nombre</span>}
                          </td>
                          <td style={{ padding: '8px 14px', color: 'var(--text2)', textAlign: 'right' }}>
                            {c.total_orders ?? 0}
                          </td>
                          <td style={{ padding: '8px 14px', color: 'var(--gold)', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                            {fmt(c.lifetime_value ?? 0)}
                          </td>
                          <td style={{ padding: '8px 14px', color: 'var(--muted)', textAlign: 'right', fontSize: 11 }}>
                            {daysSince !== null
                              ? daysSince === 0 ? 'Hoy'
                              : daysSince === 1 ? 'Ayer'
                              : `hace ${daysSince}d`
                              : '—'}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Leyenda / resumen bottom */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
        {segmentOrder.map((key) => {
          const seg  = SEGMENTS[key]
          const data = segments[key]
          if (data.customers.length === 0) return null
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--muted)' }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: seg.color }} />
              {seg.label}: {data.customers.length}
            </div>
          )
        })}
      </div>
    </div>
  )
}
