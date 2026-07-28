import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_ROLES = ['admin', 'manager', 'operator'] as const
type Role = typeof VALID_ROLES[number]

// Roles que cada nivel puede asignar (no puede asignar su propio nivel ni superior)
const ASSIGNABLE_BY: Record<string, Role[]> = {
  // pulse_admin puede asignar cualquier rol
  pulse_admin: ['admin', 'manager', 'operator'],
  // admin solo puede asignar manager y operator — no puede crear otros admins
  admin: ['manager', 'operator'],
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId, role } = await request.json()

    if (!userId || !role) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user)
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // Nadie puede cambiar su propio rol
    if (user.id === userId)
      return NextResponse.json({ error: 'No puedes cambiar tu propio rol' }, { status: 403 })

    const { data: changer } = await supabase
      .from('users')
      .select('role, is_pulse_admin, company_id')
      .eq('id', user.id)
      .single()

    if (!changer)
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 403 })

    // Solo admin o pulse_admin pueden llegar aquí
    if (changer.role !== 'admin' && !changer.is_pulse_admin)
      return NextResponse.json({ error: 'Sin permisos para cambiar roles' }, { status: 403 })

    // Determinar qué roles puede asignar quien hace la petición
    const changerLevel = changer.is_pulse_admin ? 'pulse_admin' : changer.role ?? ''
    const assignable = ASSIGNABLE_BY[changerLevel] ?? []

    if (!assignable.includes(role as Role))
      return NextResponse.json(
        { error: 'No tienes permisos para asignar ese rol' },
        { status: 403 }
      )

    // Verificar que el target pertenece a la misma empresa (pulse_admin puede cruzar empresas)
    const { data: target } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', userId)
      .single()

    if (!target)
      return NextResponse.json({ error: 'Usuario destino no encontrado' }, { status: 404 })

    if (target.company_id !== changer.company_id && !changer.is_pulse_admin)
      return NextResponse.json({ error: 'Sin permisos para este usuario' }, { status: 403 })

    // Un admin no puede modificar a otro admin (solo pulse_admin puede)
    if (target.role === 'admin' && !changer.is_pulse_admin)
      return NextResponse.json(
        { error: 'No puedes modificar el rol de otro admin' },
        { status: 403 }
      )

    const { error: updateError } = await supabase
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error actualizando rol:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
