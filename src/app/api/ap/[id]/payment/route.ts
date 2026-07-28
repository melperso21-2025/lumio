import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: apId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('company_id, role').eq('id', user.id).single()
  if (!userData?.company_id)
    return NextResponse.json({ error: 'Sin empresa asignada' }, { status: 403 })
  if (!['admin', 'manager'].includes(userData.role ?? ''))
    return NextResponse.json({ error: 'Solo admin o manager pueden registrar pagos' }, { status: 403 })

  const { data: ap } = await supabaseAdmin
    .from('accounts_payable')
    .select('id, company_id, amount, amount_paid, balance, status')
    .eq('id', apId)
    .eq('company_id', userData.company_id)
    .single()

  if (!ap) return NextResponse.json({ error: 'CxP no encontrada' }, { status: 404 })
  if (ap.status === 'paid') return NextResponse.json({ error: 'Ya está pagada' }, { status: 400 })

  const body = await request.json() as {
    amount: number
    payment_date?: string
    payment_method?: string
    notes?: string
  }

  if (!body.amount || body.amount <= 0)
    return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })

  const balance = (ap.balance as number) ?? (ap.amount - ap.amount_paid)
  if (body.amount > balance + 0.001)
    return NextResponse.json({ error: `El pago ($${body.amount}) supera el saldo ($${balance.toFixed(2)})` }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('ap_payments')
    .insert({
      company_id:     userData.company_id,
      ap_id:          apId,
      amount:         body.amount,
      payment_date:   body.payment_date   ?? new Date().toISOString().slice(0, 10),
      payment_method: body.payment_method ?? 'transfer',
      notes:          body.notes          ?? null,
      created_by:     user.id,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: apId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('company_id').eq('id', user.id).single()
  if (!userData?.company_id)
    return NextResponse.json({ error: 'Sin empresa asignada' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('ap_payments')
    .select('id, payment_date, amount, payment_method, notes, created_at')
    .eq('ap_id', apId)
    .eq('company_id', userData.company_id)
    .order('payment_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ payments: data ?? [] })
}
