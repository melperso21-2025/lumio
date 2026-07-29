'use client'

interface BreakEvenCardProps {
  totalIncome: number
  fixedExpenses: number
  variableExpenses: number
  periodDays: number
}

export default function BreakEvenCard({
  totalIncome,
  fixedExpenses,
  variableExpenses,
  periodDays,
}: BreakEvenCardProps) {
  // Margen de contribución = (ingresos - costos variables) / ingresos
  const contributionMarginRatio =
    totalIncome > 0 ? (totalIncome - variableExpenses) / totalIncome : 0

  // Punto de equilibrio = costos fijos / margen de contribución
  const breakEvenRevenue =
    contributionMarginRatio > 0 ? fixedExpenses / contributionMarginRatio : null

  // Cobertura actual
  const coverage =
    breakEvenRevenue && breakEvenRevenue > 0
      ? (totalIncome / breakEvenRevenue) * 100
      : null

  const isAbove = coverage !== null && coverage >= 100
  const gap = breakEvenRevenue !== null ? breakEvenRevenue - totalIncome : null

  const fmt = (n: number) =>
    '$' + Math.round(n).toLocaleString('es-EC')

  const monthlyDays = 30
  const monthlyFixed =
    periodDays > 0 ? (fixedExpenses / periodDays) * monthlyDays : fixedExpenses

  // Si no hay datos suficientes
  if (fixedExpenses === 0 && variableExpenses === 0) {
    return (
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '16px 18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 14 }}>⚖️</span>
          <span
            className="font-syne font-bold"
            style={{ fontSize: 13, color: 'var(--text)' }}
          >
            Punto de equilibrio
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
          Registra tus egresos y clasifica los fijos (arriendo, sueldos, servicios) para ver cuánto necesitas vender para no perder dinero.
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'var(--card)',
        border: `1px solid ${isAbove ? 'rgba(5,150,105,0.25)' : 'rgba(245,200,66,0.25)'}`,
        borderRadius: 10,
        padding: '16px 18px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>⚖️</span>
          <span
            className="font-syne font-bold"
            style={{ fontSize: 13, color: 'var(--text)' }}
          >
            Punto de equilibrio
          </span>
        </div>
        {coverage !== null && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: isAbove ? 'rgba(5,150,105,0.1)' : 'rgba(245,200,66,0.1)',
              color: isAbove ? 'var(--green)' : 'var(--gold)',
            }}
          >
            {isAbove ? 'Por encima ✓' : 'Por debajo'}
          </span>
        )}
      </div>

      {/* Cifras principales */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
          marginBottom: 16,
        }}
      >
        {[
          {
            label: 'Ingresos del período',
            value: fmt(totalIncome),
            sub: null,
          },
          {
            label: 'Punto de equilibrio',
            value: breakEvenRevenue !== null ? fmt(breakEvenRevenue) : '—',
            sub: 'necesitas vender esto para no perder',
            highlight: true,
          },
          {
            label: isAbove ? 'Margen sobre equilibrio' : 'Faltan para equilibrio',
            value:
              gap !== null
                ? isAbove
                  ? fmt(-gap)
                  : fmt(gap)
                : '—',
            sub: null,
            positive: isAbove,
          },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              background: 'var(--surface)',
              border: `1px solid ${item.highlight ? 'rgba(245,200,66,0.2)' : 'var(--border)'}`,
            }}
          >
            <p
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontWeight: 700,
                color: 'var(--muted)',
                margin: '0 0 4px',
              }}
            >
              {item.label}
            </p>
            <p
              className="font-syne font-bold"
              style={{
                fontSize: 16,
                margin: '0 0 2px',
                color:
                  item.highlight
                    ? 'var(--gold)'
                    : item.positive === true
                    ? 'var(--green)'
                    : item.positive === false
                    ? 'var(--red)'
                    : 'var(--text)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {item.value}
            </p>
            {item.sub && (
              <p style={{ fontSize: 10, color: 'var(--muted)', margin: 0 }}>
                {item.sub}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Barra de progreso */}
      {coverage !== null && (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 5,
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>
              Cobertura actual
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: isAbove ? 'var(--green)' : 'var(--gold)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {Math.round(Math.min(coverage, 999))}%
            </span>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 4,
              background: 'var(--hover)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Marcador del equilibrio (100%) */}
            <div
              style={{
                position: 'absolute',
                left: '100%',
                top: 0,
                bottom: 0,
                width: 2,
                background: 'var(--border2)',
                transform: 'translateX(-1px)',
                zIndex: 2,
              }}
            />
            <div
              style={{
                height: '100%',
                width: `${Math.min(coverage, 100)}%`,
                borderRadius: 4,
                background: isAbove
                  ? 'linear-gradient(90deg, #059669, #34d399)'
                  : 'linear-gradient(90deg, #F5C842, #F09A1A)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 3,
            }}
          >
            <span style={{ fontSize: 9, color: 'var(--muted)' }}>$0</span>
            <span style={{ fontSize: 9, color: 'var(--muted)' }}>
              Equilibrio: {breakEvenRevenue !== null ? fmt(breakEvenRevenue) : '—'}
            </span>
          </div>
        </div>
      )}

      {/* Descomposición de costos */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: 'rgba(220,38,38,0.05)',
            border: '1px solid rgba(220,38,38,0.15)',
          }}
        >
          <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: 'var(--red)', margin: '0 0 3px' }}>
            Costos fijos
          </p>
          <p className="font-syne font-bold" style={{ fontSize: 15, color: 'var(--text)', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
            {fmt(fixedExpenses)}
          </p>
          <p style={{ fontSize: 10, color: 'var(--muted)', margin: '2px 0 0' }}>
            arriendo, sueldos, servicios
          </p>
        </div>
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: 'rgba(107,114,128,0.05)',
            border: '1px solid var(--border)',
          }}
        >
          <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: 'var(--muted)', margin: '0 0 3px' }}>
            Costos variables
          </p>
          <p className="font-syne font-bold" style={{ fontSize: 15, color: 'var(--text)', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
            {fmt(variableExpenses)}
          </p>
          <p style={{ fontSize: 10, color: 'var(--muted)', margin: '2px 0 0' }}>
            compras, comisiones, envíos
          </p>
        </div>
      </div>

      {/* Insight contextual */}
      <div
        style={{
          padding: '10px 12px',
          borderRadius: 8,
          background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.15)',
          display: 'flex',
          gap: 8,
          alignItems: 'flex-start',
        }}
      >
        <span style={{ fontSize: 13, flexShrink: 0 }}>💡</span>
        <p style={{ fontSize: 11, color: 'var(--text2)', margin: 0, lineHeight: 1.6 }}>
          {breakEvenRevenue === null ? (
            'Marca tus gastos fijos (arriendo, sueldos, servicios) con la etiqueta "Fijo" para activar este análisis.'
          ) : isAbove ? (
            <>
              Estás cubriendo tus costos. El margen de contribución es{' '}
              <strong>{Math.round(contributionMarginRatio * 100)}%</strong> — de cada $100 que vendes,{' '}
              <strong>${Math.round(contributionMarginRatio * 100)}</strong> quedan para pagar tus costos fijos y generar utilidad.
            </>
          ) : gap !== null ? (
            <>
              Necesitas{' '}
              <strong>{fmt(gap)} más en ventas</strong> para cubrir todos tus costos fijos del período.
              Tus costos fijos mensuales estimados son <strong>{fmt(monthlyFixed)}</strong>.
              Revisa si puedes reducir alguno o acelerar las ventas.
            </>
          ) : (
            'Activa el análisis registrando ingresos y marcando tus gastos fijos.'
          )}
        </p>
      </div>
    </div>
  )
}
