import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { validatePhone, validateTaxId, validateDate } from '@/lib/validations'

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
        'id, full_name, mobile, phone, email, tax_id, id_type, customer_type, label, lifetime_value, last_purchase_at, registered_since, is_company, contact_name, contact_phone, contact_email, address, created_at'
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
      mobile?: string | null
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

    // Validate required fields and Ecuador-specific formats
    const validationErrors: Record<string, string> = {}

    if (!body.full_name?.trim() || body.full_name.trim().length < 2)
      validationErrors.full_name = body.full_name?.trim()
        ? 'El nombre debe tener al menos 2 caracteres'
        : 'El nombre completo es obligatorio'

    if (!body.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))
      validationErrors.email = body.email?.trim()
        ? 'El email no tiene un formato válido'
        : 'El email es obligatorio'

    if (!body.mobile?.trim()) {
      validationErrors.mobile = 'El celular es obligatorio'
    } else {
      const mobileRes = validatePhone(body.mobile)
      if (!mobileRes.valid) validationErrors.mobile = mobileRes.error!
    }

    if (body.phone?.trim()) {
      const digits = body.phone.replace(/\D/g, '')
      if (digits.length < 6 || digits.length > 9)
        validationErrors.phone = 'Teléfono convencional: 6-9 dígitos'
    }

    if (!body.tax_id?.trim()) {
      validationErrors.tax_id = 'El número de identificación es obligatorio'
    } else if (body.id_type && ['cedula', 'ruc', 'pasaporte'].includes(body.id_type)) {
      const taxRes = validateTaxId(body.tax_id.trim(), body.id_type as 'cedula' | 'ruc' | 'pasaporte')
      if (!taxRes.valid) validationErrors.tax_id = taxRes.error!
    }

    if (!body.registered_since) {
      validationErrors.registered_since = 'La fecha de alta es obligatoria'
    } else {
      const dateRes = validateDate(body.registered_since)
      if (!dateRes.valid) validationErrors.registered_since = dateRes.error!
    }

    if (body.contact_phone) {
      const cpRes = validatePhone(body.contact_phone)
      if (!cpRes.valid) validationErrors.contact_phone = cpRes.error!
    }

    // Verify customer_type UUID belongs to this company's catalog
    if (body.customer_type) {
      const { data: ctData } = await supabaseAdmin
        .from('customer_types')
        .select('id')
        .eq('id', body.customer_type)
        .eq('company_id', userData.company_id)
        .is('deleted_at', null)
        .single()
      if (!ctData)
        validationErrors.customer_type = 'Tipo de cliente no válido para esta empresa. Ve a Configuración → Clientes para crearlo.'
    }

    // Verify label UUID belongs to this company's catalog
    if (body.label) {
      const { data: lblData } = await supabaseAdmin
        .from('customer_labels')
        .select('id')
        .eq('id', body.label)
        .eq('company_id', userData.company_id)
        .is('deleted_at', null)
        .single()
      if (!lblData)
        validationErrors.label = 'Etiqueta no válida para esta empresa. Ve a Configuración → Clientes para crearlo.'
    }

    if (Object.keys(validationErrors).length > 0) {
      return NextResponse.json({ error: 'Datos inválidos', errors: validationErrors }, { status: 400 })
    }

    const now = new Date().toISOString()

    const { error: updateError } = await supabaseAdmin
      .from('customers')
      .update({
        full_name: body.full_name!.trim(),
        id_type: body.id_type ?? null,
        tax_id: body.tax_id!.trim(),
        mobile: body.mobile?.trim() ?? null,
        phone: body.phone?.trim() || null,
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
        'id, full_name, mobile, phone, email, tax_id, id_type, customer_type, label, lifetime_value, last_purchase_at, registered_since, is_company, contact_name, contact_phone, contact_email, address, created_at'
      )
      .eq('id', id)
      .single()

    return NextResponse.json({ customer: updated })
  } catch (err) {
    console.error('PATCH /api/customers/[id]:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
