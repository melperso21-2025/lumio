import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: saleId } = await params

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
      return NextResponse.json({ error: 'Solo admin o manager pueden anular ventas' }, { status: 403 })

    const companyId = userData.company_id

    // Verificar que la venta existe y pertenece a esta empresa
    const { data: sale } = await supabaseAdmin
      .from('sales')
      .select('id, company_id, status')
      .eq('id', saleId)
      .is('deleted_at', null)
      .single()

    if (!sale) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })
    if (sale.company_id !== companyId)
      return NextResponse.json({ error: 'Sin permisos para esta venta' }, { status: 403 })
    if (sale.status === 'cancelled')
      return NextResponse.json({ error: 'La venta ya está anulada' }, { status: 400 })

    const now = new Date().toISOString()

    // Soft-delete sale_items → el trigger sync_inventory_from_sale_item
    // detecta el cambio de deleted_at y revierte el inventario automáticamente
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: itemsError } = await (supabaseAdmin as any)
      .from('sale_items')
      .update({ deleted_at: now })
      .eq('sale_id', saleId)
      .is('deleted_at', null)

    if (itemsError)
      return NextResponse.json({ error: itemsError.message }, { status: 500 })

    // Marcar la venta como cancelada
    const { error: saleError } = await supabaseAdmin
      .from('sales')
      .update({
        status: 'cancelled',
        updated_at: now,
      })
      .eq('id', saleId)

    if (saleError)
      return NextResponse.json({ error: saleError.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/sales/[id]/cancel:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
