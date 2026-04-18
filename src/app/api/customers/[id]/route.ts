import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// ── GET ────────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'Sin empresa asignada' }, { status: 403 })
    }

    const { data: customer, error } = await supabaseAdmin
      .from('customers')
      .select(
        'id, full_name, phone, email, tax_id, id_type, customer_type, label, lifetime_value, last_purchase_at, registered_since, is_company, contact_name, contact_phone, contact_email, address, created_at'
      )
      .eq('id', id)
      .eq('company_id', userData.company_id)
      .is('deleted_at', null)
      .single()

    if (error || !customer) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    // Recent sales for this customer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sales } = await (supabaseAdmin as any)
      .from('sales')
      .select(
        'id, sale_date, status, gross_total, discount_amount, lines_per_order, branches(name), sales_channels(name)'
      )
      .eq('customer_id', id)
      .eq('company_id', userData.company_id)
      .is('deleted_at', null)
      .order('sale_date', { ascending: false })
      .limit(20)

    return NextResponse.json({ customer, sales: sales ?? [] })
  } catch (err) {
    console.error('GET /api/customers/[id]:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ── PATCH ──────────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'Sin empresa asignada' }, { status: 403 })
    }

    const allowedRoles = ['admin', 'manager']
    if (!allowedRoles.includes(userData.role ?? '')) {
      return NextResponse.json(
        { error: 'Solo admin o manager pueden editar clientes' },
        { status: 403 }
      )
    }

    // Verify customer belongs to this company
    const { data: existing } = await supabaseAdmin
      .from('customers')
      .select('id, company_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }
    if (existing.company_id !== userData.company_id) {
      return NextResponse.json({ error: 'Sin permisos para este cliente' }, { status: 403 })
    }

    const body = await request.json() as {
      full_name?: string
      id_type?: string
      tax_id?: string
      phone?: string | null
      email?: string | null
      address?: string | null
      customer_type?: string | null
      label?: string | null
      registered_since?: string
      is_company?: boolean
      contact_name?: string | null
      contact_phone?: string | null
      contact_email?: string | null
    }

    // Validate required fields
    if (!body.full_name?.trim()) {
      return NextResponse.json(
        { error: 'El nombre completo es obligatorio' },
        { status: 400 }
      )
    }
    if (!body.tax_id?.trim()) {
      return NextResponse.json(
        { error: 'El número de identificación es obligatorio' },
        { status: 400 }
      )
    }
    if (!body.phone?.trim()) {
      return NextResponse.json({ error: 'El teléfono es obligatorio' }, { status: 400 })
    }
    if (!body.email?.trim()) {
      return NextResponse.json({ error: 'El email es obligatorio' }, { status: 400 })
    }

    const now = new Date().toISOString()

    const { error: updateError } = await supabaseAdmin
      .from('customers')
      .update({
        full_name: body.full_name.trim(),
        id_type: body.id_type ?? null,
        tax_id: body.tax_id.trim(),
        phone: body.phone?.trim() ?? null,
        email: body.email?.trim() ?? null,
        address: body.address ?? null,
        customer_type: body.customer_type ?? null,
        label: body.label ?? null,
        registered_since: body.registered_since ?? null,
        is_company: body.is_company ?? false,
        contact_name: body.contact_name ?? null,
        contact_phone: body.contact_phone ?? null,
        contact_email: body.contact_email ?? null,
        updated_at: now,
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Return updated customer
    const { data: updated } = await supabaseAdmin
      .from('customers')
      .select(
        'id, full_name, phone, email, tax_id, id_type, customer_type, label, lifetime_value, last_purchase_at, registered_since, is_company, contact_name, contact_phone, contact_email, address, created_at'
      )
      .eq('id', id)
      .single()

    return NextResponse.json({ customer: updated })
  } catch (err) {
    console.error('PATCH /api/customers/[id]:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
