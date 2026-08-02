import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

async function auth(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: u } = await supabase.from('users').select('company_id, role').eq('id', user.id).single()
  return u?.company_id ? u : null
}

// ── GET ────────────────────────────────────────────────────────────────────

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

// ── PATCH — actualiza cabecera + ítems ─────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const userData = await auth(supabase)
  if (!userData) return NextResponse.json({ error: 'No autenticado o sin empresa' }, { status: 401 })
  if (!['admin', 'manager'].includes(userData.role ?? ''))
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const body = await request.json() as {
    supplier_id?:   string | null
    purchase_date?: string
    invoice_ref?:   string | null
    payment_method?: string
    credit_days?:   number
    tax_amount?:    number
    notes?:         string | null
    status?:        string
    items?: { product_id?: string | null; description?: string; quantity: number; unit_cost: number }[]
  }

  // Update header
  const headerPatch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.supplier_id   !== undefined) headerPatch.supplier_id   = body.supplier_id ?? null
  if (body.purchase_date !== undefined) headerPatch.purchase_date = body.purchase_date
  if (body.invoice_ref   !== undefined) headerPatch.invoice_ref   = body.invoice_ref ?? null
  if (body.payment_method !== undefined) headerPatch.payment_method = body.payment_method
  if (body.credit_days   !== undefined) headerPatch.credit_days   = body.credit_days
  if (body.tax_amount    !== undefined) headerPatch.tax_amount    = body.tax_amount
  if (body.notes         !== undefined) headerPatch.notes         = body.notes ?? null
  if (body.status        !== undefined) headerPatch.status        = body.status

  // Recalculate totals from items if provided
  if (body.items) {
    const subtotal = body.items.reduce((s, i) => s + i.quantity * i.unit_cost, 0)
    headerPatch.subtotal = subtotal
    headerPatch.total    = subtotal + (body.tax_amount ?? 0)
  }

  const { error: hErr } = await supabaseAdmin
    .from('purchases')
    .update(headerPatch)
    .eq('id', id)
    .eq('company_id', userData.company_id)
    .is('deleted_at', null)

  if (hErr) return NextResponse.json({ error: hErr.message }, { status: 500 })

  // Replace items if provided
  if (body.items) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any).from('purchase_items').delete().eq('purchase_id', id)

    if (body.items.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: iErr } = await (supabaseAdmin as any)
        .from('purchase_items')
        .insert(
          body.items.map(i => ({
            company_id:  userData.company_id,
            purchase_id: id,
            product_id:  i.product_id ?? null,
            description: i.description ?? null,
            quantity:    i.quantity,
            unit_cost:   i.unit_cost,
          }))
        )
      if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}

// ── DELETE (soft) ──────────────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const userData = await auth(supabase)
  if (!userData) return NextResponse.json({ error: 'No autenticado o sin empresa' }, { status: 401 })
  if (!['admin', 'manager'].includes(userData.role ?? ''))
    return NextResponse.json({ error: 'Sin permisos para eliminar' }, { status: 403 })

  // Guard: no eliminar si tiene pagos registrados en AP
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: apCount } = await (supabaseAdmin as any)
    .from('accounts_payable')
    .select('id', { count: 'exact', head: true })
    .eq('purchase_id', id)
    .not('paid_at', 'is', null)

  if (apCount && apCount > 0) {
    return NextResponse.json(
      { error: 'Esta compra tiene pagos registrados. Anúlala en lugar de eliminarla.' },
      { status: 400 }
    )
  }

  const { error } = await supabaseAdmin
    .from('purchases')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('company_id', userData.company_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
