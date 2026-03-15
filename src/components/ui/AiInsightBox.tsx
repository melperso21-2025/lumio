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
}: AiInsightBoxProps) {
  const styles = VARIANT_STYLES[variant]

  return (
    <div
      className="flex flex-row gap-3 items-start mb-5"
      style={{
        borderRadius: 10,
        padding: '14px 18px',
        border: `1px solid ${styles.border}`,
        background: styles.bg,
      }}
    >
      {/* Ícono izquierdo */}
      <div
        className="shrink-0 flex items-center justify-center"
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: styles.iconBg,
          fontSize: 14,
          color: styles.color,
        }}
      >
        {styles.icon}
      </div>

      {/* Contenido derecho */}
      <div className="min-w-0 flex-1">
        <div
          className="font-syne font-semibold mb-1"
          style={{
            fontSize: 11,
            color: styles.color,
          }}
        >
          {title}
        </div>
        <p
          style={{
            fontSize: 12,
            color: 'var(--text2)',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {text}
        </p>
      </div>
    </div>
  )
}
