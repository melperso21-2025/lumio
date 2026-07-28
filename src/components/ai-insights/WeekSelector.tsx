'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export interface WeekOption {
  week_number: number
  year: number
  total_sales: number | null
  total_transactions: number | null
  updated_at?: string | null
}

interface WeekSelectorProps {
  weeks: WeekOption[]
  selectedWeek: number
  selectedYear: number
}

export default function WeekSelector({
  weeks,
  selectedWeek,
  selectedYear,
}: WeekSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const [year, week] = e.target.value.split('-').map(Number)
    const params = new URLSearchParams(searchParams.toString())
    params.set('week', String(week))
    params.set('year', String(year))
    router.push(`${pathname}?${params.toString()}`)
  }

  if (weeks.length === 0) {
    return null
  }

  return (
    <select
      value={`${selectedYear}-${selectedWeek}`}
      onChange={handleChange}
      aria-label="Seleccionar semana de análisis"
      style={{
        padding: '5px 10px',
        borderRadius: 7,
        border: '1px solid var(--border2)',
        background: 'var(--surface)',
        color: 'var(--text)',
        fontSize: 12,
        fontFamily: 'var(--font-jakarta)',
        cursor: 'pointer',
      }}
    >
      {weeks.map((w) => (
        <option
          key={`${w.year}-${w.week_number}`}
          value={`${w.year}-${w.week_number}`}
        >
          S{w.week_number}/{w.year} · $
          {(w.total_sales ?? 0).toLocaleString('es-EC', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}{' '}
          · {w.total_transactions ?? 0} ventas
        </option>
      ))}
    </select>
  )
}
