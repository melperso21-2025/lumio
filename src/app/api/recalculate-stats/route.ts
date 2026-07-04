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

  // 1. Recalcula gross_total en sales desde sale_items
  //    El trigger tg_update_customer_stats se dispara automáticamente
  //    y actualiza lifetime_value + last_purchase_at en customers.
  const { error: salesErr } = await supabase.rpc('recalculate_sales_totals', {
    p_company_id: companyId,
  })

  if (salesErr) return NextResponse.json({ error: salesErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
