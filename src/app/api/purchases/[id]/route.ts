import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('company_id').eq('id', user.id).single()
  if (!userData?.company_id)
    return NextResponse.json({ error: 'Sin empresa asignada' }, { status: 403 })

  const { data: purchase, error } = await supabaseAdmin
    .from('purchases')
    .select('*, suppliers(id, name)')
    .eq('id', id)
    .eq('company_id', userData.company_id)
    .is('deleted_at', null)
    .single()

  if (error || !purchase)
    return NextResponse.json({ error: 'Compra no encontrada' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: items } = await (supabaseAdmin as any)
    .from('purchase_items')
    .select('id, product_id, description, quantity, unit_cost, subtotal, products(name, sku)')
    .eq('purchase_id', id)

  return NextResponse.json({ purchase: { ...purchase, items: items ?? [] } })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('company_id, role').eq('id', user.id).single()
  if (!userData?.company_id)
    return NextResponse.json({ error: 'Sin empresa asignada' }, { status: 403 })
  if (!['admin', 'manager'].includes(userData.role ?? ''))
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const body = await request.json() as { status?: string }

  const { error } = await supabaseAdmin
    .from('purchases')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('company_id', userData.company_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
