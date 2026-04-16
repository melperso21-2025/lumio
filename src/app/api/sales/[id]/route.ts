import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: saleId } = await params

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

    const { data: sale, error: saleError } = await supabaseAdmin
      .from('sales')
      .select(
        'id, sale_date, customer_id, branch_id, channel_id, status, gross_total, discount_amount, production_cost, lines_per_order'
      )
      .eq('id', saleId)
      .eq('company_id', userData.company_id)
      .is('deleted_at', null)
      .single()

    if (saleError || !sale) {
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: items, error: itemsError } = await (supabaseAdmin as any)
      .from('sale_items')
      .select(
        'product_id, quantity, unit_price, unit_cost, discount_amount, subtotal, products(name, sku, current_stock)'
      )
      .eq('sale_id', saleId)
      .is('deleted_at', null)

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    return NextResponse.json({ sale: { ...sale, items: items ?? [] } })
  } catch (error) {
    console.error('Error obteniendo venta:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

interface IncomingItem {
  product_id: string
  quantity: number
  unit_price: number
  unit_cost: number
  discount_amount: number
}

interface SaleItemRow {
  id: string
  product_id: string
  quantity: number
  unit_price: number
  unit_cost: number
  discount_amount: number
}

interface ProductRow {
  id: string
  name: string
  current_stock: number
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: saleId } = await params

    // Auth: use cookie-based client
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
        { error: 'Solo admin o manager pueden editar ventas' },
        { status: 403 }
      )
    }

    const companyId = userData.company_id

    // Verify sale exists and belongs to this company
    const { data: sale } = await supabaseAdmin
      .from('sales')
      .select('id, company_id')
      .eq('id', saleId)
      .is('deleted_at', null)
      .single()

    if (!sale) {
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })
    }
    if (sale.company_id !== companyId) {
      return NextResponse.json({ error: 'Sin permisos para esta venta' }, { status: 403 })
    }

    // Parse and validate body
    const body = await request.json()
    const { sale_date, customer_id, branch_id, channel_id, status, items } = body as {
      sale_date: string
      customer_id: string
      branch_id: string
      channel_id: string
      status: string
      items: IncomingItem[]
    }

    if (!sale_date || !customer_id || !branch_id || !channel_id || !status) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: sale_date, customer_id, branch_id, channel_id, status' },
        { status: 400 }
      )
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'La venta debe tener al menos un ítem' },
        { status: 400 }
      )
    }

    // Validate no duplicate product_ids in the incoming list
    const incomingProductIds = items.map(i => i.product_id)
    if (new Set(incomingProductIds).size !== incomingProductIds.length) {
      return NextResponse.json(
        { error: 'La lista de ítems contiene productos duplicados' },
        { status: 400 }
      )
    }

    // Load current active sale_items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: currentItemsData } = await (supabaseAdmin as any)
      .from('sale_items')
      .select('id, product_id, quantity, unit_price, unit_cost, discount_amount')
      .eq('sale_id', saleId)
      .is('deleted_at', null)

    const existingItems: SaleItemRow[] = currentItemsData ?? []

    // Collect all product IDs involved (incoming + existing) for a single query
    const allProductIds = [
      ...new Set([...incomingProductIds, ...existingItems.map(i => i.product_id)]),
    ]

    const { data: productsData } = await supabaseAdmin
      .from('products')
      .select('id, name, current_stock')
      .eq('company_id', companyId)
      .in('id', allProductIds)

    const productMap = new Map<string, ProductRow>(
      (productsData ?? []).map(p => [
        p.id,
        { id: p.id, name: p.name, current_stock: p.current_stock ?? 0 },
      ])
    )

    // Validate every incoming product_id exists in this company
    for (const item of items) {
      if (!productMap.has(item.product_id)) {
        return NextResponse.json(
          { error: `Producto no encontrado: ${item.product_id}` },
          { status: 400 }
        )
      }
    }

    // Classify lines
    const existingByProduct = new Map<string, SaleItemRow>(
      existingItems.map(i => [i.product_id, i])
    )
    const incomingByProduct = new Map<string, IncomingItem>(
      items.map(i => [i.product_id, i])
    )

    const toDelete: SaleItemRow[] = []
    const toInsert: IncomingItem[] = []

    // Existing lines: removed or changed → soft delete; unchanged → skip
    for (const existing of existingItems) {
      const incoming = incomingByProduct.get(existing.product_id)
      if (!incoming) {
        // Line removed entirely
        toDelete.push(existing)
      } else {
        const unchanged =
          Number(existing.quantity) === Number(incoming.quantity) &&
          Number(existing.unit_price) === Number(incoming.unit_price) &&
          Number(existing.discount_amount) === Number(incoming.discount_amount || 0)

        if (!unchanged) {
          toDelete.push(existing)
          toInsert.push(incoming)
        }
        // unchanged: leave untouched
      }
    }

    // Brand-new lines (product not in current sale)
    for (const incoming of items) {
      if (!existingByProduct.has(incoming.product_id)) {
        toInsert.push(incoming)
      }
    }

    // Stock validation
    // When a line is being soft-deleted, its quantity returns to stock.
    // available = current_stock + returned_quantity
    const returnsByProduct = new Map<string, number>()
    for (const del of toDelete) {
      returnsByProduct.set(
        del.product_id,
        (returnsByProduct.get(del.product_id) ?? 0) + del.quantity
      )
    }

    for (const item of toInsert) {
      const product = productMap.get(item.product_id)!
      const returned = returnsByProduct.get(item.product_id) ?? 0
      const availableStock = product.current_stock + returned

      if (item.quantity > availableStock) {
        return NextResponse.json(
          {
            error:
              `Stock insuficiente para "${product.name}". ` +
              `Disponible: ${availableStock}, solicitado: ${item.quantity}.`,
          },
          { status: 400 }
        )
      }
    }

    // Execute changes — supabaseAdmin bypasses RLS on sale_items
    const now = new Date().toISOString()

    if (toDelete.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: deleteError } = await (supabaseAdmin as any)
        .from('sale_items')
        .update({ deleted_at: now })
        .in(
          'id',
          toDelete.map(d => d.id)
        )

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }
    }

    if (toInsert.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabaseAdmin as any)
        .from('sale_items')
        .insert(
          toInsert.map(item => ({
            company_id: companyId,
            sale_id: saleId,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            unit_cost: item.unit_cost,
            discount_amount: item.discount_amount || 0,
            // subtotal is GENERATED ALWAYS — never insert
          }))
        )

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    // Update sales header fields only
    // gross_total, discount_amount, production_cost, lines_per_order
    // are managed exclusively by tg_recalculate_sale_totals
    const { error: saleUpdateError } = await supabaseAdmin
      .from('sales')
      .update({
        sale_date,
        customer_id,
        branch_id,
        channel_id,
        status,
        updated_at: now,
      })
      .eq('id', saleId)

    if (saleUpdateError) {
      return NextResponse.json({ error: saleUpdateError.message }, { status: 500 })
    }

    // Return updated sale with its current active items
    const { data: updatedSale } = await supabaseAdmin
      .from('sales')
      .select(
        'id, sale_date, customer_id, branch_id, channel_id, status, gross_total, discount_amount, production_cost, lines_per_order, updated_at'
      )
      .eq('id', saleId)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedItems } = await (supabaseAdmin as any)
      .from('sale_items')
      .select('id, product_id, quantity, unit_price, unit_cost, discount_amount, subtotal')
      .eq('sale_id', saleId)
      .is('deleted_at', null)

    return NextResponse.json({
      sale: updatedSale,
      items: updatedItems ?? [],
    })
  } catch (error) {
    console.error('Error actualizando venta:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
