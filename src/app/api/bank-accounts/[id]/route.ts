import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { validateAccountNumber } from '@/lib/validations'

function authError(msg: string, status: number) {
  return NextResponse.json({ error: msg }, { status })
}

async function getUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: userData } = await supabase
    .from('users').select('company_id, role').eq('id', user.id).single()
  return userData?.company_id ? userData : null
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
    if (!userData) return authError('No autenticado o sin empresa', 401)

    const body = await request.json() as {
      bank_name?: string
      account_type?: string
      account_number?: string
    }

    if (!body.bank_name?.trim()) {
      return authError('El nombre del banco es obligatorio', 400)
    }

    if (body.account_number?.trim()) {
      const res = validateAccountNumber(body.account_number.trim())
      if (!res.valid) return authError(res.error ?? 'Número de cuenta inválido', 400)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error } = await (supabaseAdmin as any)
      .from('bank_accounts')
      .update({
        bank_name: body.bank_name.trim(),
        account_type: body.account_type ?? 'checking',
        account_number: body.account_number?.trim() || null,
      })
      .eq('id', id)
      .eq('company_id', userData.company_id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error || !updated) {
      return NextResponse.json({ error: error?.message ?? 'No se pudo actualizar' }, { status: 400 })
    }

    return NextResponse.json({ account: updated })
  } catch (err) {
    console.error('PATCH /api/bank-accounts/[id]:', err)
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
    if (!userData) return authError('No autenticado o sin empresa', 401)

    if (!['admin', 'manager'].includes(userData.role ?? '')) {
      return authError('Sin permisos para eliminar', 403)
    }

    // Guard: no eliminar si tiene transacciones activas
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: txCount } = await (supabaseAdmin as any)
      .from('bank_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', id)
      .is('deleted_at', null)

    if (txCount && txCount > 0) {
      return NextResponse.json(
        { error: `Esta cuenta tiene ${txCount} transacción(es) registrada(s). Elimina los movimientos primero.` },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from('bank_accounts')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', id)
      .eq('company_id', userData.company_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/bank-accounts/[id]:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
