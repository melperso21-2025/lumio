'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

const PERIODS = [
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mes' },
  { value: 'days30', label: 'Últimos 30 días' },
] as const

export default function PeriodSelector() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get('period') ?? 'week'

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {PERIODS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => handleChange(p.value)}
          style={{
            padding: '5px 11px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: current === p.value ? 600 : 400,
            border: '1px solid var(--border)',
            background: current === p.value ? 'var(--gold-bg)' : 'transparent',
            color: current === p.value ? 'var(--gold)' : 'var(--text2)',
            cursor: 'pointer',
            fontFamily: 'var(--font-jakarta)',
            transition: 'all 0.12s',
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
