import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentSnapshotWeekYear } from '@/lib/dateUtils'

type SnapshotError = { companyId: string; message: string }

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: userData, error: userErr } = await supabase
    .from('users')
    .select('is_pulse_admin')
    .eq('id', user.id)
    .single()

  if (userErr) {
    return NextResponse.json(
      { error: userErr.message },
      { status: 500 }
    )
  }

  if (!userData?.is_pulse_admin) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }

  const tasks: { companyId: string; weekNumber: number; year: number }[] = []

  // Recalcular todas las filas históricas en weekly_snapshots (misma empresa + año + semana)
  if (body.all === true && body.recalculateAll === true) {
    const { data: existingSnapsRaw, error: snapsError } = await supabase
      .from('weekly_snapshots')
      .select('company_id, year, week_number')
      .order('year', { ascending: true })
      .order('week_number', { ascending: true })

    if (snapsError) {
      return NextResponse.json(
        { error: snapsError.message },
        { status: 500 }
      )
    }

    type SnapKey = { company_id: string; year: number; week_number: number }
    const existingSnaps = (existingSnapsRaw ?? []) as unknown as SnapKey[]

    const seen = new Set<string>()
    const unique: SnapKey[] = []
    for (const row of existingSnaps) {
      const key = `${row.company_id}|${row.year}|${row.week_number}`
      if (seen.has(key)) continue
      seen.add(key)
      unique.push(row)
    }

    const errors: SnapshotError[] = []
    let processed = 0

    for (const snap of unique) {
      const { error: rpcError } = await supabase.rpc(
        'calculate_weekly_snapshot',
        {
          p_company_id: snap.company_id,
          p_week_number: snap.week_number,
          p_year: snap.year,
        }
      )

      if (rpcError) {
        errors.push({ companyId: snap.company_id, message: rpcError.message })
      } else {
        processed += 1
      }
    }

    return NextResponse.json({
      success: true,
      message: `Recalculados ${unique.length} snapshots históricos`,
      processed,
      errors,
    })
  }

  if (body.all === true) {
    const { year, week_number } = getCurrentSnapshotWeekYear()
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id')
      .is('deleted_at', null)
      .eq('status', 'active')

    if (companiesError) {
      return NextResponse.json(
        { error: companiesError.message },
        { status: 500 }
      )
    }

    for (const c of companies ?? []) {
      tasks.push({
        companyId: c.id,
        weekNumber: week_number,
        year,
      })
    }
  } else {
    const companyId = body.companyId
    const weekNumber = body.weekNumber
    const year = body.year
    if (
      typeof companyId !== 'string' ||
      typeof weekNumber !== 'number' ||
      typeof year !== 'number'
    ) {
      return NextResponse.json(
        {
          error:
            'Se requiere { all: true } o { companyId, weekNumber, year }',
        },
        { status: 400 }
      )
    }
    tasks.push({ companyId, weekNumber, year })
  }

  const errors: SnapshotError[] = []
  let processed = 0

  for (const t of tasks) {
    const { error: rpcError } = await supabase.rpc('calculate_weekly_snapshot', {
      p_company_id: t.companyId,
      p_week_number: t.weekNumber,
      p_year: t.year,
    })

    if (rpcError) {
      errors.push({ companyId: t.companyId, message: rpcError.message })
    } else {
      processed += 1
    }
  }

  return NextResponse.json({
    success: true,
    processed,
    errors,
  })
}
