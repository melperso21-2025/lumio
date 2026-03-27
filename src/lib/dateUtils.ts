// Funciones de fecha — sin 'use client', usable desde Server y Client Components

// ── Helper para pages (default = Esta semana) ─────────────────

export function getDefaultDateRange(): { from: string; to: string } {
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    return {
      from: monday.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    }
  }