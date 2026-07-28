import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(
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

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'Sin empresa asignada' }, { status: 403 })
    }

    const allowedRoles = ['admin', 'manager', 'pulse_admin']
    if (!allowedRoles.includes(userData.role ?? '')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({})) as { paid_date?: string }
    const paidDate = body.paid_date ?? new Date().toISOString().slice(0, 10)

    const { data, error } = await supabaseAdmin
      .from('accounts_receivable')
      .update({ status: 'paid', paid_at: paidDate })
      .eq('id', id)
      .eq('company_id', userData.company_id)
      .select('id, status')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
