// Funciones de fecha — sin 'use client', usable desde Server y Client Components
//
// Importante: `new Date('YYYY-MM-DD')` interpreta UTC medianoche y, al usar métodos
// locales o `toISOString().slice(0,10)`, el día puede desplazarse (p. ej. América).
// Para calendario de negocio usamos siempre fecha **local** (lunes–domingo).

// ── Fechas locales (sin desfase UTC) ───────────────────────────

/** Parse 'YYYY-MM-DD' como medianoche en la zona horaria local. */
export function parseLocalDate(ymd: string): Date {
  const parts = ymd.split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return new Date(ymd)
  }
  const [y, m, d] = parts
  return new Date(y, m - 1, d)
}

/**
 * Convierte un Date a string YYYY-MM-DD usando la fecha LOCAL del entorno.
 * Usar en lugar de date.toISOString().slice(0,10) para evitar el desfase UTC.
 * Funciona igual en servidor (Node) y navegador, en cualquier timezone.
 */
export function toLocalISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** YYYY-MM-DD en calendario UTC (alineado a setUTCDate / semanas ISO). */
function utcYmd(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Redondea un rango de fechas a semanas ISO completas (lunes→domingo).
 * Usado en el Dashboard para que los snapshots correspondan a semanas enteras.
 * - from → lunes de la semana que contiene `from`
 * - to → domingo de la semana que contiene `to`
 */
export function roundToFullWeeks(from: string, to: string): { from: string; to: string } {
  const fromDate = new Date(`${from.slice(0, 10)}T12:00:00Z`)
  const toDate = new Date(`${to.slice(0, 10)}T12:00:00Z`)

  const fromDay = fromDate.getUTCDay() || 7
  fromDate.setUTCDate(fromDate.getUTCDate() - (fromDay - 1))

  const toDay = toDate.getUTCDay() || 7
  toDate.setUTCDate(toDate.getUTCDate() + (7 - toDay))

  return {
    from: utcYmd(fromDate),
    to: utcYmd(toDate),
  }
}

/**
 * Año ISO 8601 y número de semana (el jueves de la semana fija año y nº).
 * Cálculos internos en UTC para evitar desfaces por timezone.
 */
export function isoWeek(d: Date): { year: number; week_number: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayOfWeek = date.getUTCDay() || 7 // 1=lun … 7=dom
  date.setUTCDate(date.getUTCDate() + 4 - dayOfWeek) // jueves de la semana ISO
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week_number = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  )
  return { year: date.getUTCFullYear(), week_number }
}

/**
 * Semana ISO de una fecha "YYYY-MM-DD" (jueves determina año y semana).
 */
export function isoWeekFromString(dateStr: string): { year: number; week: number } {
  const d = new Date(`${dateStr.slice(0, 10)}T12:00:00Z`)
  const { year, week_number } = isoWeek(d)
  return { year, week: week_number }
}

/**
 * Formatea un string DATE de PostgreSQL ("YYYY-MM-DD") para mostrar en UI.
 * NO usar new Date(iso) directo — lo interpretaría como UTC y correría un día
 * en zonas horarias negativas (América). Usar SOLO para campos tipo DATE puro.
 * Para campos TIMESTAMPTZ (created_at, etc.) usar new Date(iso) directamente.
 */
export function formatBusinessDate(
  iso: string | null | undefined,
  locale = 'es-EC'
): string {
  if (!iso) return '—'
  try {
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

/** Formatea una fecha local a 'YYYY-MM-DD' (sin conversión UTC). */
export function formatLocalDateString(d: Date): string {
  return toLocalISO(d)
}

/** Hoy como YYYY-MM-DD en calendario local. */
export function getTodayLocalString(): string {
  return formatLocalDateString(new Date())
}

// ── Helper para pages (default = Esta semana, lunes → hoy) ─────

export function getDefaultDateRange(): { from: string; to: string } {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  monday.setHours(0, 0, 0, 0)
  return {
    from: toLocalISO(monday),
    to: toLocalISO(now),
  }
}

/**
 * Período anterior con la misma cantidad de días (inclusive) que [from, to],
 * terminando el día anterior a `from`. Alineado a calendario local.
 */
export function getPreviousPeriodRolling(
  fromStr: string,
  toStr: string
): { prevFrom: string; prevTo: string } {
  const fromDate = parseLocalDate(fromStr)
  const toDate = parseLocalDate(toStr)
  const daysDiff =
    Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1
  const prevToDate = new Date(fromDate)
  prevToDate.setDate(prevToDate.getDate() - 1)
  const prevFromDate = new Date(prevToDate)
  prevFromDate.setDate(prevFromDate.getDate() - daysDiff + 1)
  return {
    prevFrom: formatLocalDateString(prevFromDate),
    prevTo: formatLocalDateString(prevToDate),
  }
}

/**
 * Semanas ISO que intersectan [fromStr, toStr] (YYYY-MM-DD).
 * Recalcula desde cero por día (idempotente vs snapshots en BD).
 * T12:00:00Z centra el instante en el día calendario en cualquier zona horaria.
 */
export function getWeeksInRange(
  fromStr: string,
  toStr: string
): { year: number; week_number: number }[] {
  const result: { year: number; week_number: number }[] = []
  const seen = new Set<string>()

  const from = new Date(`${fromStr.slice(0, 10)}T12:00:00Z`)
  const to = new Date(`${toStr.slice(0, 10)}T12:00:00Z`)

  const cursor = new Date(from.getTime())
  while (cursor <= to) {
    const { year, week_number } = isoWeek(cursor)
    const key = `${year}-${week_number}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push({ year, week_number })
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return result
}

/** Número de semana ISO para una fecha 'YYYY-MM-DD' (semana lunes–domingo). */
export function getIsoWeekNumberFromYmd(ymd: string): number | null {
  const w = getWeeksInRange(ymd, ymd)
  return w.length > 0 ? w[0].week_number : null
}

/** Año y semana “snapshot” alineados con weekly_snapshots / dashboard (hoy local). */
export function getCurrentSnapshotWeekYear(): {
  year: number
  week_number: number
} {
  const today = getTodayLocalString()
  const weeks = getWeeksInRange(today, today)
  if (weeks.length > 0) return weeks[0]
  const y = new Date().getFullYear()
  return { year: y, week_number: 1 }
}

/**
 * Lunes y domingo (YYYY-MM-DD, UTC) de la semana ISO en `year` / `week_number`.
 * Alineado con ISO 8601 (la semana 1 contiene el 4 de enero).
 */
export function getIsoWeekMondaySunday(
  year: number,
  weekNumber: number
): { monday: string; sunday: string } {
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  const week1Monday = new Date(jan4.getTime() - (jan4Day - 1) * 86400000)
  const weekMonday = new Date(
    week1Monday.getTime() + (weekNumber - 1) * 7 * 86400000
  )
  const weekSunday = new Date(weekMonday.getTime() + 6 * 86400000)
  return {
    monday: weekMonday.toISOString().slice(0, 10),
    sunday: weekSunday.toISOString().slice(0, 10),
  }
}
