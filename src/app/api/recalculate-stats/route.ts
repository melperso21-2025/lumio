import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function isoWeekYear(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return { year: d.getUTCFullYear(), week }
}

function weeksInRange(startStr: string, endStr: string): { year: number; week_number: number }[] {
  const weeks = new Set<string>()
  const cursor = new Date(startStr)
  const end = new Date(endStr)

  while (cursor <= end) {
    const { year, week } = isoWeekYear(cursor)
    weeks.add(`${year}|${week}`)
    cursor.setUTCDate(cursor.getUTCDate() + 7)
  }

  // Asegurar incluir la semana de la fecha final
  const { year: ey, week: ew } = isoWeekYear(end)
  weeks.add(`${ey}|${ew}`)

  return Array.from(weeks).map((k) => {
    const [y, w] = k.split('|')
    return { year: Number(y), week_number: Number(w) }
  })
}

export async function POST() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('company_id, role, is_pulse_admin')
    .eq('id', user.id)
    .single()

  const companyId = userData?.company_id
  const canRun = userData?.role === 'admin' || userData?.is_pulse_admin

  if (!companyId || !canRun)
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  // ── Paso 1: gross_total + stats de customers ───────────────────────────
  const { error: statsErr } = await supabase.rpc('recalculate_sales_totals', {
    p_company_id: companyId,
  })
  if (statsErr) return NextResponse.json({ error: statsErr.message }, { status: 500 })

  // ── Paso 2: rango de fechas de ventas (solo 2 filas, no limitado) ──────
  const { data: rangeData, error: rangeErr } = await supabase
    .from('sales')
    .select('sale_date')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .not('sale_date', 'is', null)
    .order('sale_date', { ascending: true })
    .limit(1)

  if (rangeErr) return NextResponse.json({ error: rangeErr.message }, { status: 500 })

  const { data: rangeDataMax } = await supabase
    .from('sales')
    .select('sale_date')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .not('sale_date', 'is', null)
    .order('sale_date', { ascending: false })
    .limit(1)

  const minDate = rangeData?.[0]?.sale_date as string | undefined
  const maxDate = rangeDataMax?.[0]?.sale_date as string | undefined

  if (!minDate || !maxDate) {
    return NextResponse.json({ ok: true, snapshotsCalculated: 0 })
  }

  // ── Paso 3: calcular snapshot por cada semana del rango ────────────────
  const weeks = weeksInRange(minDate, maxDate)

  let snapshotsOk = 0
  const snapshotErrors: string[] = []

  for (const { year, week_number } of weeks) {
    const { error } = await supabase.rpc('calculate_weekly_snapshot', {
      p_company_id: companyId,
      p_week_number: week_number,
      p_year: year,
    })
    if (error) snapshotErrors.push(`S${week_number}/${year}: ${error.message}`)
    else snapshotsOk++
  }

  return NextResponse.json({
    ok: true,
    snapshotsCalculated: snapshotsOk,
    snapshotErrors: snapshotErrors.slice(0, 10),
  })
}
