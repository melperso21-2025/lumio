// Formato de números para KPIs — locale es-EC (miles con punto, decimales con coma)

const LOCALE = 'es-EC' as const

/** Miles en formato es-EC sin parte decimal: 1.234 */
function isEsIntegerWithDotThousands(s: string): boolean {
  return /^\d{1,3}(\.\d{3})+$/.test(s)
}

/**
 * Formatea el valor mostrado en KpiCard (número o string tipo toFixed).
 * Si el string ya viene localizado (contiene coma decimal) o es miles 1.234, no lo altera.
 */
export function formatKpiDisplayValue(value: string | number): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toLocaleString(LOCALE, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  }
  if (typeof value === 'string') {
    const t = value.trim()
    if (t === '' || t === '—' || t === '-') return value
    // Ya localizado (ej. 1.234,56 o texto con coma)
    if (t.includes(',')) return value
    if (isEsIntegerWithDotThousands(t)) return t
    const neg = t.startsWith('-')
    const core = neg ? t.slice(1) : t
    if (isEsIntegerWithDotThousands(core)) return t
    if (/^-?\d+(\.\d+)?$/.test(t)) {
      return parseFloat(t).toLocaleString(LOCALE, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    }
    return value
  }
  return String(value)
}

/**
 * Añade separadores de miles en textos secundarios del KPI (Ant:, montos $ sin localizar).
 * No altera cadenas que ya tienen coma decimal (formato es-EC completo).
 */
export function formatKpiCompare(compare: string): string {
  if (!compare || compare.includes(',')) return compare

  let s = compare.replace(/\$([\d.]+)/g, (full, raw: string) => {
    if (/^\d{1,3}(\.\d{3})+$/.test(raw)) return full
    const n = parseFloat(raw)
    if (!Number.isFinite(n)) return full
    return `$${n.toLocaleString(LOCALE, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`
  })

  // Ant: 1234 | Ant: 12,5% (toFixed) — no pisar miles tipo 1.234
  s = s.replace(/\b(Ant:\s+)([\d.]+)\s*(%?)/g, (full, prefix: string, raw: string, pct: string) => {
    if (/^\d{1,3}(\.\d{3})+$/.test(raw)) return full
    const n = parseFloat(raw)
    if (!Number.isFinite(n)) return full
    return (
      prefix +
      n.toLocaleString(LOCALE, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }) +
      pct
    )
  })

  s = s.replace(/^(\d+)(\s+ing\s+\/\s+)(\d+)(\s+egr)$/i, (_, a, mid, b, end) => {
    const na = parseInt(a, 10)
    const nb = parseInt(b, 10)
    return (
      `${na.toLocaleString(LOCALE, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}${mid}${nb.toLocaleString(LOCALE, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}${end}`
    )
  })

  return s
}
