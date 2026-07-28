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
  ReferenceLine,
} from 'recharts'

interface CampaignRow {
  campaign_date: string | null
  spend: number | null
  attributed_revenue: number | null
  roas: number | null
}

interface Props {
  campaigns: CampaignRow[]
  from: string
  to: string
  roasBenchmark?: number
}

const dayMs = 86400000

function buildChartData(campaigns: CampaignRow[], from: string, to: string) {
  const diffDays = (new Date(to).getTime() - new Date(from).getTime()) / dayMs

  const byPeriod = new Map<string, { label: string; spend: number; revenue: number }>()

  for (const c of campaigns) {
    if (!c.campaign_date) continue
    const d = new Date(c.campaign_date + 'T12:00:00')
    let key: string
    let label: string

    if (diffDays <= 31) {
      key   = c.campaign_date.slice(0, 10)
      label = d.toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })
    } else {
      const year  = d.getFullYear()
      const start = new Date(year, 0, 1)
      const week  = Math.ceil(((d.getTime() - start.getTime()) / dayMs + start.getDay() + 1) / 7)
      key   = `${year}-W${String(week).padStart(2, '0')}`
      label = `S${week}`
    }

    const existing = byPeriod.get(key) ?? { label, spend: 0, revenue: 0 }
    existing.spend   += c.spend ?? 0
    existing.revenue += c.attributed_revenue ?? 0
    byPeriod.set(key, existing)
  }

  return Array.from(byPeriod.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({
      label: v.label,
      roas:  v.spend > 0 ? parseFloat((v.revenue / v.spend).toFixed(2)) : null,
    }))
    .filter((p) => p.roas !== null)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const roas = payload[0]?.value ?? 0
  const color = roas >= 3 ? 'var(--green)' : roas >= 1 ? 'var(--gold)' : 'var(--red)'
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 12,
        color: 'var(--text)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
      }}
    >
      <div style={{ color: 'var(--muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 700, color }}>ROAS: {roas}x</div>
      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
        {roas >= 3 ? 'Por encima del benchmark' : 'Por debajo del benchmark (3x)'}
      </div>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RoasDot(props: any) {
  const { cx, cy, payload } = props
  if (payload.roas === null) return null
  const color = payload.roas >= 3 ? '#059669' : payload.roas >= 1 ? '#F5C842' : '#DC2626'
  return <circle cx={cx} cy={cy} r={4} fill={color} stroke="var(--card)" strokeWidth={1.5} />
}

export default function RoasTrendChart({ campaigns, from, to, roasBenchmark = 3 }: Props) {
  const data = useMemo(() => buildChartData(campaigns, from, to), [campaigns, from, to])

  if (data.length < 2) return null

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '14px 16px',
        flexShrink: 0,
        height: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Tendencia ROAS
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--muted)' }}>
          <span style={{ display: 'inline-block', width: 20, borderTop: '1.5px dashed rgba(220,38,38,0.6)' }} />
          Benchmark {roasBenchmark}x
        </div>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
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
            tickFormatter={(v) => `${v}x`}
            width={36}
            domain={[0, 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={roasBenchmark}
            stroke="rgba(220,38,38,0.5)"
            strokeDasharray="4 3"
            strokeWidth={1.5}
          />
          <Line
            type="monotone"
            dataKey="roas"
            stroke="#F5C842"
            strokeWidth={2}
            dot={<RoasDot />}
            activeDot={{ r: 5, fill: '#F5C842', strokeWidth: 0 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
