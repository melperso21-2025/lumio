import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// ── GET ─────────────────────────────────────────────────────────────────────

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
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id)
      return NextResponse.json({ error: 'Sin empresa asignada' }, { status: 403 })

    const { data: product, error } = await supabaseAdmin
      .from('products')
      .select(
        `id, name, sku, sale_price, unit_cost, supplier_price,
         current_stock, min_stock_alert, lead_time_days,
         category_id, supplier_id, is_active,
         product_type, unit_type, unit_label,
         is_perishable, shelf_life_days, expiry_date,
         product_categories(id, name),
         suppliers(id, name)`
      )
      .eq('id', id)
      .eq('company_id', userData.company_id)
      .is('deleted_at', null)
      .single()

    if (error || !product)
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })

    // Movement history
    const { data: movements } = await supabaseAdmin
      .from('inventory_movements')
      .select('id, type, reason, quantity, movement_date, notes, batch_number, created_at')
      .eq('product_id', id)
      .eq('company_id', userData.company_id)
      .order('movement_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100)

    // Price history
    const { data: priceHistory } = await supabaseAdmin
      .from('product_price_history')
      .select('id, sale_price, unit_cost, supplier_price, changed_at, notes')
      .eq('product_id', id)
      .eq('company_id', userData.company_id)
      .order('changed_at', { ascending: false })
      .limit(50)

    return NextResponse.json({ product, movements: movements ?? [], priceHistory: priceHistory ?? [] })
  } catch (err) {
    console.error('GET /api/products/[id]:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ── PATCH ────────────────────────────────────────────────────────────────────

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
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id)
      return NextResponse.json({ error: 'Sin empresa asignada' }, { status: 403 })

    if (!['admin', 'manager'].includes(userData.role ?? ''))
      return NextResponse.json(
        { error: 'Solo admin o manager pueden editar productos' },
        { status: 403 }
      )

    // Verify ownership and read current prices for comparison
    const { data: existing } = await supabaseAdmin
      .from('products')
      .select('id, company_id, sale_price, unit_cost, supplier_price')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (!existing)
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    if (existing.company_id !== userData.company_id)
      return NextResponse.json({ error: 'Sin permisos para este producto' }, { status: 403 })

    const body = await request.json() as Record<string, unknown>
    const now = new Date().toISOString()

    // Soft delete branch
    if (body.deleted_at) {
      const { error: delErr } = await supabaseAdmin
        .from('products')
        .update({ deleted_at: now, updated_at: now })
        .eq('id', id)

      if (delErr)
        return NextResponse.json({ error: delErr.message }, { status: 500 })

      return NextResponse.json({ ok: true })
    }

    // Data update branch — current_stock is never modified here
    const allowed = [
      'name', 'sku', 'sale_price', 'unit_cost', 'supplier_price',
      'category_id', 'supplier_id',
      'product_type', 'unit_type', 'unit_label',
      'is_perishable', 'shelf_life_days', 'expiry_date',
      'min_stock_alert', 'lead_time_days',
      'is_active',
    ]

    const updates: Record<string, unknown> = { updated_at: now }
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }

    if (!updates.name || !(updates.name as string).toString().trim())
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })

    const { error: updateErr } = await supabaseAdmin
      .from('products')
      .update(updates)
      .eq('id', id)

    if (updateErr)
      return NextResponse.json({ error: updateErr.message }, { status: 500 })

    // Registrar historial de precios si alguno cambió
    const newSalePrice     = 'sale_price'     in updates ? (updates.sale_price     as number | null) : existing.sale_price
    const newUnitCost      = 'unit_cost'      in updates ? (updates.unit_cost      as number | null) : existing.unit_cost
    const newSupplierPrice = 'supplier_price' in updates ? (updates.supplier_price as number | null) : existing.supplier_price

    const priceChanged =
      newSalePrice     !== existing.sale_price     ||
      newUnitCost      !== existing.unit_cost      ||
      newSupplierPrice !== existing.supplier_price

    if (priceChanged) {
      await supabaseAdmin.from('product_price_history').insert({
        product_id:     id,
        company_id:     userData.company_id,
        sale_price:     newSalePrice,
        unit_cost:      newUnitCost,
        supplier_price: newSupplierPrice,
        changed_by:     user.id,
        notes:          (body.price_change_notes as string | undefined) ?? null,
      })
    }

    const { data: updated } = await supabaseAdmin
      .from('products')
      .select(
        `id, name, sku, sale_price, unit_cost, supplier_price,
         current_stock, min_stock_alert, lead_time_days,
         category_id, supplier_id, is_active,
         product_type, unit_type, unit_label,
         is_perishable, shelf_life_days, expiry_date`
      )
      .eq('id', id)
      .single()

    return NextResponse.json({ product: updated })
  } catch (err) {
    console.error('PATCH /api/products/[id]:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
