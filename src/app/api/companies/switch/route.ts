import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { company_id } = (await request.json()) as { company_id?: string }
  if (!company_id) {
    return NextResponse.json({ error: 'Falta company_id' }, { status: 400 })
  }

  // Verificar que el usuario tiene membresía en esa empresa
  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('user_company_memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('company_id', company_id)
    .single()

  if (membershipError || !membership) {
    return NextResponse.json(
      { error: 'No tienes acceso a esa empresa' },
      { status: 403 }
    )
  }

  // Actualizar la empresa y rol activos en users
  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ company_id, role: membership.role })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, company_id, role: membership.role })
}
