import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

async function getUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('users').select('company_id, role').eq('id', user.id).single()
  return data?.company_id ? data : null
}

// ── PATCH ──────────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const userData = await getUser(supabase)
    if (!userData) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const body = await request.json() as {
      type?: string
      account_id?: string
      amount?: number
      category?: string | null
      concept?: string | null
      tx_date?: string
      is_fixed?: boolean
    }

    if (!body.amount || body.amount <= 0) {
      return NextResponse.json({ error: 'El monto debe ser mayor a 0' }, { status: 400 })
    }
    if (!body.category?.trim()) {
      return NextResponse.json({ error: 'La categoría es obligatoria' }, { status: 400 })
    }

    // Verify transaction belongs to this company
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tx } = await (supabaseAdmin as any)
      .from('bank_transactions')
      .select('id, bank_accounts!inner(company_id)')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (!tx || tx.bank_accounts?.company_id !== userData.company_id) {
      return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error } = await (supabaseAdmin as any)
      .from('bank_transactions')
      .update({
        type: body.type,
        account_id: body.account_id,
        amount: body.amount,
        category: body.category?.trim(),
        concept: body.concept?.trim() || null,
        tx_date: body.tx_date,
        is_fixed: body.is_fixed ?? false,
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error || !updated) {
      return NextResponse.json({ error: error?.message ?? 'No se pudo actualizar' }, { status: 400 })
    }

    return NextResponse.json({ transaction: updated })
  } catch (err) {
    console.error('PATCH /api/bank-transactions/[id]:', err)
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
    const userData = await getUser(supabase)
    if (!userData) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // Verify ownership via join
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tx } = await (supabaseAdmin as any)
      .from('bank_transactions')
      .select('id, bank_accounts!inner(company_id)')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (!tx || tx.bank_accounts?.company_id !== userData.company_id) {
      return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from('bank_transactions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/bank-transactions/[id]:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
