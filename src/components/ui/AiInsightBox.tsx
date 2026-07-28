// AiInsightBox — caja de insight generado por IA
// Componente puro sin 'use client'

export type AiInsightBoxVariant = 'gold' | 'red' | 'green' | 'blue'

export interface AiInsightBoxProps {
  /** ej: "lumio IA · Resumen ejecutivo — Semana 10" */
  title: string
  /** el insight en texto plano (sin HTML) */
  text: string
  /** variante de color, default: gold */
  variant?: AiInsightBoxVariant
  /** Menos padding y márgenes. Por defecto activo; `compact={false}` para caja más aireada. */
  compact?: boolean
}

const VARIANT_STYLES: Record<
  AiInsightBoxVariant,
  { bg: string; iconBg: string; border: string; color: string; icon: string }
> = {
  gold: {
    bg: 'rgba(232,165,0,0.08)',
    iconBg: 'rgba(232,165,0,0.16)',
    border: 'rgba(232,165,0,0.22)',
    color: 'var(--gold)',
    icon: '✦',
  },
  red: {
    bg: 'rgba(220,38,38,0.06)',
    iconBg: 'rgba(220,38,38,0.12)',
    border: 'rgba(220,38,38,0.2)',
    color: 'var(--red)',
    icon: '⚠',
  },
  green: {
    bg: 'rgba(5,150,105,0.06)',
    iconBg: 'rgba(5,150,105,0.12)',
    border: 'rgba(5,150,105,0.2)',
    color: 'var(--green)',
    icon: '✓',
  },
  blue: {
    bg: 'rgba(37,99,235,0.06)',
    iconBg: 'rgba(37,99,235,0.12)',
    border: 'rgba(37,99,235,0.2)',
    color: 'var(--blue)',
    icon: 'ℹ',
  },
}

export default function AiInsightBox({
  title,
  text,
  variant = 'gold',
  compact = true,
}: AiInsightBoxProps) {
  const styles = VARIANT_STYLES[variant]

  return (
    <div
      className={`flex flex-row items-start ${compact ? 'gap-2 mb-3' : 'gap-3 mb-5'}`}
      style={{
        borderRadius: 10,
        padding: compact ? '10px 14px' : '14px 18px',
        border: `1px solid ${styles.border}`,
        background: styles.bg,
      }}
    >
      {/* Ícono izquierdo */}
      <div
        className="shrink-0 flex items-center justify-center"
        style={{
          width: compact ? 24 : 28,
          height: compact ? 24 : 28,
          borderRadius: 8,
          background: styles.iconBg,
          fontSize: compact ? 12 : 14,
          color: styles.color,
        }}
      >
        {styles.icon}
      </div>

      {/* Contenido derecho */}
      <div className="min-w-0 flex-1">
        <div
          className={`font-syne font-semibold ${compact ? 'mb-0.5' : 'mb-1'}`}
          style={{
            fontSize: compact ? 10 : 11,
            color: styles.color,
          }}
        >
          {title}
        </div>
        <p
          style={{
            fontSize: compact ? 11 : 12,
            color: 'var(--text2)',
            lineHeight: compact ? 1.45 : 1.6,
            margin: 0,
          }}
        >
          {text}
        </p>
      </div>
    </div>
  )
}
