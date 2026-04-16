import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { email, full_name, role, job_title, company_id } =
      await request.json()

    if (!email || !full_name || !company_id) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 1. Verificar que el usuario que invita es admin
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user)
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: inviterData } = await supabase
      .from('users')
      .select('role, is_pulse_admin, company_id')
      .eq('id', user.id)
      .single()

    if (inviterData?.role !== 'admin' && !inviterData?.is_pulse_admin) {
      return NextResponse.json(
        { error: 'Sin permisos para invitar usuarios' },
        { status: 403 }
      )
    }

    if (
      inviterData?.company_id !== company_id &&
      !inviterData?.is_pulse_admin
    ) {
      return NextResponse.json(
        { error: 'Sin permisos para esta empresa' },
        { status: 403 }
      )
    }

    // 2. Crear usuario en Supabase Auth con invitación
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      })

    let userId: string | undefined = authData?.user?.id

    if (authError) {
      // Si el usuario ya existe en auth, buscar su id para crear/actualizar en users
      if (authError.message.includes('already been registered')) {
        const { data: listData } =
          await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
        const existingUser = listData?.users?.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase()
        )
        userId = existingUser?.id
      } else {
        return NextResponse.json(
          { error: authError.message },
          { status: 400 }
        )
      }
    }

    if (userId) {
      // 3. Crear registro en tabla users
      const { error: userError } = await supabaseAdmin
        .from('users')
        .upsert(
          {
            id: userId,
            company_id: company_id,
            full_name: full_name,
            email: email,
            role: role ?? 'operator',
            job_title: job_title ?? null,
            is_pulse_admin: false,
          },
          {
            onConflict: 'id',
          }
        )

      if (userError) {
        return NextResponse.json(
          { error: userError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: `Invitación enviada a ${email}`,
    })
  } catch (error) {
    console.error('Error invitando usuario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
