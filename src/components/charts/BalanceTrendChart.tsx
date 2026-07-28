'use client'

import { useMemo } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

interface TxRow {
  tx_date: string | null
  type: string
  amount: number | null
}

interface AccountRow {
  current_balance: number | null
}

interface Props {
  transactions: TxRow[]
  accounts: AccountRow[]
  from: string
  to: string
}

function fmt(n: number) {
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${Math.round(n)}`
}

function buildChartData(transactions: TxRow[], accounts: AccountRow[], from: string, to: string) {
  const dayMs = 86400000
  const diffDays = (new Date(to).getTime() - new Date(from).getTime()) / dayMs

  // Agrupar ingresos y egresos por período
  const byPeriod = new Map<string, { label: string; income: number; expense: number }>()

  for (const tx of transactions) {
    if (!tx.tx_date) continue
    const d = new Date(tx.tx_date + 'T12:00:00')
    let key: string
    let label: string

    if (diffDays <= 31) {
      key   = tx.tx_date.slice(0, 10)
      label = d.toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })
    } else {
      const year  = d.getFullYear()
      const start = new Date(year, 0, 1)
      const week  = Math.ceil(((d.getTime() - start.getTime()) / dayMs + start.getDay() + 1) / 7)
      key   = `${year}-W${String(week).padStart(2, '0')}`
      label = `S${week}`
    }

    const existing = byPeriod.get(key) ?? { label, income: 0, expense: 0 }
    if (tx.type === 'income') {
      existing.income  += tx.amount ?? 0
    } else {
      existing.expense += tx.amount ?? 0
    }
    byPeriod.set(key, existing)
  }

  const sorted = Array.from(byPeriod.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({
      label:   v.label,
      income:  Math.round(v.income),
      expense: Math.round(v.expense),
      net:     Math.round(v.income - v.expense),
    }))

  // Balance acumulado: parte del saldo actual y retrocede
  const totalBalance = accounts.reduce((s, a) => s + (a.current_balance ?? 0), 0)
  const totalNet     = sorted.reduce((s, p) => s + p.net, 0)
  let running        = Math.round(totalBalance - totalNet)

  return sorted.map((p) => {
    running += p.net
    return { ...p, balance: running }
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const income  = payload.find((p: any) => p.dataKey === 'income')?.value  ?? 0
  const expense = payload.find((p: any) => p.dataKey === 'expense')?.value ?? 0
  const balance = payload.find((p: any) => p.dataKey === 'balance')?.value ?? 0
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
        minWidth: 130,
      }}
    >
      <div style={{ color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ color: 'var(--green)',  marginBottom: 2 }}>↑ Ingreso: {fmt(income)}</div>
      <div style={{ color: 'var(--red)',    marginBottom: 2 }}>↓ Egreso: {fmt(expense)}</div>
      <div style={{ color: 'var(--gold)',   fontWeight: 700, marginTop: 4, borderTop: '1px solid var(--border)', paddingTop: 4 }}>
        Saldo: {fmt(balance)}
      </div>
    </div>
  )
}

export default function BalanceTrendChart({ transactions, accounts, from, to }: Props) {
  const data = useMemo(() => buildChartData(transactions, accounts, from, to), [transactions, accounts, from, to])

  if (data.length < 2) return null

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '14px 16px',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        Evolución de flujo de caja
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
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
          <Bar dataKey="income"  name="Ingreso" fill="rgba(5,150,105,0.55)"  radius={[3, 3, 0, 0]} maxBarSize={28} />
          <Bar dataKey="expense" name="Egreso"  fill="rgba(220,38,38,0.45)"  radius={[3, 3, 0, 0]} maxBarSize={28} />
          <Line
            type="monotone"
            dataKey="balance"
            name="Saldo"
            stroke="#F5C842"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#F5C842', strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
