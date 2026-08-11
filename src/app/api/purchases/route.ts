import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('company_id').eq('id', user.id).single()
  if (!userData?.company_id)
    return NextResponse.json({ error: 'Sin empresa asignada' }, { status: 403 })

  const sp = request.nextUrl.searchParams
  const isoDate = /^\d{4}-\d{2}-\d{2}$/
  const from = isoDate.test(sp.get('from') ?? '') ? sp.get('from')! : new Date(new Date().setDate(1)).toISOString().slice(0, 10)
  const to   = isoDate.test(sp.get('to')   ?? '') ? sp.get('to')!   : new Date().toISOString().slice(0, 10)

  const { data, error } = await supabaseAdmin
    .from('purchases')
    .select('id, purchase_date, invoice_ref, subtotal, tax_amount, total, payment_method, credit_days, status, notes, created_at, suppliers(id, name)')
    .eq('company_id', userData.company_id)
    .is('deleted_at', null)
    .gte('purchase_date', from)
    .lte('purchase_date', to)
    .order('purchase_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ purchases: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('company_id, role').eq('id', user.id).single()
  if (!userData?.company_id)
    return NextResponse.json({ error: 'Sin empresa asignada' }, { status: 403 })
  if (!['admin', 'manager'].includes(userData.role ?? ''))
    return NextResponse.json({ error: 'Solo admin o manager pueden registrar compras' }, { status: 403 })

  const body = await request.json() as {
    supplier_id?:    string
    purchase_date:   string
    invoice_ref?:    string
    payment_method:  string
    credit_days?:    number
    tax_amount?:     number
    notes?:          string
    items: { product_id?: string; description?: string; quantity: number; unit_cost: number }[]
  }

  if (!body.purchase_date)
    return NextResponse.json({ error: 'Falta purchase_date' }, { status: 400 })
  if (!Array.isArray(body.items) || body.items.length === 0)
    return NextResponse.json({ error: 'La compra debe tener al menos un ítem' }, { status: 400 })

  const { data: purchase, error: pErr } = await supabaseAdmin
    .from('purchases')
    .insert({
      company_id:     userData.company_id,
      supplier_id:    body.supplier_id   ?? null,
      purchase_date:  body.purchase_date,
      invoice_ref:    body.invoice_ref   ?? null,
      payment_method: body.payment_method ?? 'cash',
      credit_days:    body.credit_days   ?? 30,
      tax_amount:     body.tax_amount    ?? 0,
      notes:          body.notes         ?? null,
      created_by:     user.id,
    })
    .select('id')
    .single()

  if (pErr || !purchase)
    return NextResponse.json({ error: pErr?.message ?? 'Error al crear compra' }, { status: 500 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: itemsErr } = await (supabaseAdmin as any)
    .from('purchase_items')
    .insert(
      body.items.map(i => ({
        company_id:  userData.company_id,
        purchase_id: purchase.id,
        product_id:  i.product_id  ?? null,
        description: i.description ?? null,
        quantity:    i.quantity,
        unit_cost:   i.unit_cost,
      }))
    )

  if (itemsErr)
    return NextResponse.json({ error: itemsErr.message }, { status: 500 })

  return NextResponse.json({ purchase_id: purchase.id }, { status: 201 })
}
