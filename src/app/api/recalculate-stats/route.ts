import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  // ── Paso 1: gross_total en sales + lifetime_value / last_purchase_at / total_orders en customers
  const { error: statsErr } = await supabase.rpc('recalculate_sales_totals', {
    p_company_id: companyId,
  })
  if (statsErr) return NextResponse.json({ error: statsErr.message }, { status: 500 })

  // ── Paso 2: obtener todas las semanas con ventas para esta empresa
  const { data: salesWeeks, error: weeksErr } = await supabase
    .from('sales')
    .select('sale_date')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .not('sale_date', 'is', null)

  if (weeksErr) return NextResponse.json({ error: weeksErr.message }, { status: 500 })

  // Calcular semanas ISO únicas (año + semana)
  const weekSet = new Set<string>()
  for (const { sale_date } of salesWeeks ?? []) {
    const d = new Date(sale_date as string)
    // ISO week: Thursday determines the year
    const thursday = new Date(d)
    thursday.setDate(d.getDate() + (4 - (d.getDay() || 7)))
    const year = thursday.getFullYear()
    const startOfYear = new Date(year, 0, 1)
    const weekNumber = Math.ceil(
      ((thursday.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
    )
    weekSet.add(`${year}|${weekNumber}`)
  }

  // ── Paso 3: calcular snapshot por cada semana única
  const weeks = Array.from(weekSet).map((k) => {
    const [y, w] = k.split('|')
    return { year: Number(y), week_number: Number(w) }
  })

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
    snapshotErrors,
  })
}
