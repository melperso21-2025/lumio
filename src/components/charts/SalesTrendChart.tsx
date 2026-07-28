'use client'

import { useMemo } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

interface SaleRow {
  sale_date: string
  gross_total: number | null
}

interface Props {
  sales: SaleRow[]
  from: string
  to: string
}

function fmt(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${Math.round(n)}`
}

// Agrupar por semana ISO o por día dependiendo del rango
function buildChartData(sales: SaleRow[], from: string, to: string) {
  const dayMs = 86400000
  const diffDays = (new Date(to).getTime() - new Date(from).getTime()) / dayMs

  if (diffDays <= 31) {
    // Vista diaria
    const byDay = new Map<string, number>()
    for (const s of sales) {
      const d = s.sale_date.slice(0, 10)
      byDay.set(d, (byDay.get(d) ?? 0) + (s.gross_total ?? 0))
    }
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({
        label: new Date(date + 'T12:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'short' }),
        total: Math.round(total),
      }))
  }

  // Vista semanal (agrupa por semana del año)
  const byWeek = new Map<string, { label: string; total: number }>()
  for (const s of sales) {
    const d = new Date(s.sale_date + 'T12:00:00')
    const year = d.getFullYear()
    // Semana ISO simplificada
    const start = new Date(year, 0, 1)
    const week = Math.ceil(((d.getTime() - start.getTime()) / dayMs + start.getDay() + 1) / 7)
    const key = `${year}-W${String(week).padStart(2, '0')}`
    const label = `S${week}`
    const existing = byWeek.get(key)
    byWeek.set(key, {
      label,
      total: (existing?.total ?? 0) + Math.round(s.gross_total ?? 0),
    })
  }
  return Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
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
      <div style={{ fontWeight: 700, color: 'var(--gold)' }}>{fmt(payload[0].value)}</div>
    </div>
  )
}

export default function SalesTrendChart({ sales, from, to }: Props) {
  const data = useMemo(() => buildChartData(sales, from, to), [sales, from, to])

  if (data.length < 2) return null

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '14px 16px',
        flexShrink: 0,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        Tendencia de ventas
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#F5C842" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#F5C842" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            tickFormatter={fmt}
            width={44}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#F5C842"
            strokeWidth={2}
            fill="url(#salesGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#F5C842', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
