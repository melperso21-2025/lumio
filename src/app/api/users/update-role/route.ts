import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest) {
  try {
    const { userId, role } = await request.json()

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'Faltan parámetros' },
        { status: 400 }
      )
    }

    const validRoles = ['admin', 'manager', 'operator']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Rol inválido' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 1. Verificar que quien cambia el rol es admin
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user)
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: changerData } = await supabase
      .from('users')
      .select('role, is_pulse_admin, company_id')
      .eq('id', user.id)
      .single()

    if (changerData?.role !== 'admin' && !changerData?.is_pulse_admin) {
      return NextResponse.json(
        { error: 'Sin permisos para cambiar roles' },
        { status: 403 }
      )
    }

    // 2. Verificar que el usuario a modificar pertenece a la misma empresa
    const { data: targetUser } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', userId)
      .single()

    if (
      targetUser?.company_id !== changerData?.company_id &&
      !changerData?.is_pulse_admin
    ) {
      return NextResponse.json(
        { error: 'Sin permisos para este usuario' },
        { status: 403 }
      )
    }

    // 3. Actualizar rol
    const { error: updateError } = await supabase
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error actualizando rol:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
