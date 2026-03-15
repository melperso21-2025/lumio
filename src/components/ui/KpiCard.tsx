// KpiCard — tarjeta de KPI para el dashboard
// Componente puro sin 'use client'; hover vía CSS (group/group-hover)

export interface KpiCardProps {
  /** ej: "ROAS", "Ventas $" */
  label: string
  /** ej: 9.8, "$4,320" */
  value: string | number
  /** % cambio vs período anterior. positivo=verde, negativo=rojo */
  delta?: number
  /** texto informativo: "Prom: $128.45" o "Ant: $4.0" */
  compare?: string
  /** si true, value se muestra en var(--gold) */
  isGold?: boolean
  /** texto antes del valor: "$" */
  prefix?: string
  /** texto después del valor: "%" */
  suffix?: string
}

export default function KpiCard({
  label,
  value,
  delta,
  compare,
  isGold = false,
  prefix = '',
  suffix = '',
}: KpiCardProps) {
  return (
    <div
      className="group relative rounded-[10px] transition-colors duration-150 hover:[border-color:var(--gold-bdr)]"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        padding: '14px 16px',
      }}
    >
      {/* Barra superior visible en hover */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        style={{ background: 'var(--gold)' }}
      />

      {/* Label */}
      <div
        className="uppercase mb-1.5 font-semibold"
        style={{
          fontSize: 9,
          letterSpacing: '0.1em',
          color: 'var(--muted)',
        }}
      >
        {label}
      </div>

      {/* Value */}
      <div
        className="font-syne font-bold"
        style={{
          fontSize: 22,
          color: isGold ? 'var(--gold)' : 'var(--text)',
        }}
      >
        {prefix}
        {value}
        {suffix}
      </div>

      {/* Delta (solo si existe y no es cero) */}
      {delta !== undefined && delta !== 0 && (
        <div
          className="mt-1"
          style={{
            fontSize: 10,
            color: delta > 0 ? 'var(--green)' : 'var(--red)',
          }}
        >
          {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}%
        </div>
      )}

      {/* Compare */}
      {compare && (
        <div
          className="mt-0.5"
          style={{
            fontSize: 9,
            color: 'var(--muted)',
          }}
        >
          {compare}
        </div>
      )}
    </div>
  )
}
