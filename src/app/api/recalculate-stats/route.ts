import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Permitir hasta 5 minutos en Vercel Pro / 60s en Hobby
export const maxDuration = 300

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
  if (statsErr) {
    console.error('[recalculate-stats] statsErr:', statsErr.message)
    return NextResponse.json({ error: 'Error recalculando estadísticas de ventas' }, { status: 500 })
  }

  // ── Paso 2: snapshots de todas las semanas históricas (loop en DB) ─────
  const { data: snapCount, error: snapErr } = await supabase.rpc('recalculate_all_snapshots', {
    p_company_id: companyId,
  })
  if (snapErr) {
    console.error('[recalculate-stats] snapErr:', snapErr.message)
    return NextResponse.json({ error: 'Error recalculando snapshots semanales' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    snapshotsCalculated: snapCount ?? 0,
  })
}
