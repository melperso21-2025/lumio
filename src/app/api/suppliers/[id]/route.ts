import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { validateSupplier } from '@/lib/validations'

// ── GET ────────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users').select('company_id').eq('id', user.id).single()
    if (!userData?.company_id) return NextResponse.json({ error: 'Sin empresa asignada' }, { status: 403 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: supplier, error } = await (supabaseAdmin as any)
      .from('suppliers')
      .select(
        'id, name, first_name, last_name, is_company, id_type, tax_id, phone, email, address, bank_name, bank_account, account_type, bank_tax_id, is_active, created_at, default_lead_time_days, payment_terms'
      )
      .eq('id', id)
      .eq('company_id', userData.company_id)
      .is('deleted_at', null)
      .single()

    if (error || !supplier) return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })

    // Associated products
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: products } = await (supabaseAdmin as any)
      .from('products')
      .select('id, name, sku, sale_price, unit_cost, current_stock, unit_label, product_type, is_active')
      .eq('supplier_id', id)
      .eq('company_id', userData.company_id)
      .is('deleted_at', null)
      .order('name', { ascending: true })
      .limit(200)

    return NextResponse.json({ supplier, products: products ?? [] })
  } catch (err) {
    console.error('GET /api/suppliers/[id]:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users').select('company_id').eq('id', user.id).single()
    if (!userData?.company_id) return NextResponse.json({ error: 'Sin empresa asignada' }, { status: 403 })

    const body = await request.json()
    // Extract metadata before passing body to validator (validator ignores it)
    const { metadata, ...supplierBody } = body

    const result = validateSupplier(supplierBody, userData.company_id)
    if (!result.valid) {
      return NextResponse.json({ error: 'Validación fallida', errors: result.errors }, { status: 400 })
    }

    const updatePayload = {
      ...result.data,
      ...(metadata !== undefined ? { metadata } : {}),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error: updateError } = await (supabaseAdmin as any)
      .from('suppliers')
      .update(updatePayload)
      .eq('id', id)
      .eq('company_id', userData.company_id)
      .is('deleted_at', null)
      .select()
      .single()

    if (updateError || !updated) {
      return NextResponse.json({ error: updateError?.message ?? 'No se pudo actualizar' }, { status: 400 })
    }

    return NextResponse.json({ supplier: updated })
  } catch (err) {
    console.error('PATCH /api/suppliers/[id]:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ── DELETE (soft) ──────────────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users').select('company_id, role').eq('id', user.id).single()
    if (!userData?.company_id) return NextResponse.json({ error: 'Sin empresa asignada' }, { status: 403 })
    if (!['admin', 'manager'].includes(userData.role ?? '')) {
      return NextResponse.json({ error: 'Sin permisos para eliminar' }, { status: 403 })
    }

    // Guard: reject if supplier has active products
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: activeProducts } = await (supabaseAdmin as any)
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('supplier_id', id)
      .is('deleted_at', null)
      .eq('is_active', true)

    if (activeProducts && activeProducts > 0) {
      return NextResponse.json(
        {
          error: `No puedes eliminar este proveedor porque tiene ${activeProducts} producto(s) activo(s) asociado(s). Reasigna o elimina los productos primero.`,
        },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from('suppliers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', userData.company_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/suppliers/[id]:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
