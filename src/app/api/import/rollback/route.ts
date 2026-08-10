import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ENTITY_DEFS } from '@/lib/import/entityConfig'

export async function POST(request: NextRequest) {
  try {
    const { importLogId } = await request.json() as { importLogId: string }
    if (!importLogId) {
      return NextResponse.json({ error: 'importLogId es obligatorio' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users')
      .select('company_id, role, is_pulse_admin')
      .eq('id', user.id)
      .single()

    const canRollback = userData?.role === 'admin' || userData?.is_pulse_admin
    if (!canRollback) {
      return NextResponse.json({ error: 'Solo administradores pueden hacer rollback' }, { status: 403 })
    }

    const companyId = userData?.company_id
    if (!companyId) {
      return NextResponse.json({ error: 'Sin empresa asignada' }, { status: 403 })
    }

    // Fetch the import log
    const { data: logRow, error: logErr } = await supabaseAdmin
      .from('import_logs')
      .select('id, company_id, entity_type, status, imported_ids, success_rows')
      .eq('id', importLogId)
      .single()

    if (logErr || !logRow) {
      return NextResponse.json({ error: 'Registro de importación no encontrado' }, { status: 404 })
    }
    if (logRow.company_id !== companyId) {
      return NextResponse.json({ error: 'Sin permisos para este registro' }, { status: 403 })
    }
    if (!['success', 'partial'].includes(logRow.status)) {
      return NextResponse.json({ error: `No se puede hacer rollback de un registro con estado "${logRow.status}"` }, { status: 400 })
    }

    const entityType = logRow.entity_type as keyof typeof ENTITY_DEFS
    const importedIds: string[] = logRow.imported_ids ?? []

    if (importedIds.length === 0) {
      return NextResponse.json({ error: 'No hay registros para revertir' }, { status: 400 })
    }

    const now = new Date().toISOString()
    let rolledBack = 0

    // Handle inventory_movements of type 'initial' — revert current_stock manually
    if (entityType === 'inventory_movements') {
      // Get the movements to revert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: movements } = await (supabaseAdmin as any)
        .from('inventory_movements')
        .select('id, product_id, type, quantity, reason')
        .in('id', importedIds)

      for (const mov of movements ?? []) {
        const qty = Number(mov.quantity ?? 0)
        if (qty <= 0) continue

        // Reverse the stock change
        const delta = mov.type === 'in' ? -qty : mov.type === 'out' ? qty : 0
        if (delta !== 0) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabaseAdmin as any).rpc('increment_stock', {
              p_product_id: mov.product_id,
              p_delta:      delta,
            })
          } catch {
            // RPC no disponible — el trigger de DB recalculará el stock
          }
        }
      }
    }

    // Products with initial stock: revert current_stock to 0
    if (entityType === 'products') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin as any)
        .from('products')
        .update({ current_stock: 0 })
        .in('id', importedIds)
        .catch(() => null)

      // Hard-delete related initial movements (inventory_movements has no deleted_at)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin as any)
        .from('inventory_movements')
        .delete()
        .in('product_id', importedIds)
        .eq('reason', 'initial')
        .catch(() => null)
    }

    // Delete the imported records
    const entityDef = ENTITY_DEFS[entityType]
    const table = entityDef?.table
    if (table) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabaseAdmin as any
      const { error: delErr } = entityDef.noSoftDelete
        ? await sb.from(table).delete().in('id', importedIds)
        : await sb.from(table).update({ deleted_at: now }).in('id', importedIds)

      if (delErr) {
        return NextResponse.json({ error: `Error al revertir: ${delErr.message}` }, { status: 500 })
      }
      rolledBack = importedIds.length
    }

    // Update log status
    await supabaseAdmin
      .from('import_logs')
      .update({ status: 'rolled_back', completed_at: now })
      .eq('id', importLogId)

    return NextResponse.json({ success: true, rolledBack })

  } catch (err) {
    console.error('POST /api/import/rollback:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Error interno: ${msg}` }, { status: 500 })
  }
}
