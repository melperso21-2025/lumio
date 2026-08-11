import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resend, FROM } from '@/lib/email/resend'
import { inviteUserHtml, inviteUserText } from '@/lib/email/templates/inviteUser'

const VALID_ROLES = new Set(['admin', 'manager', 'operator'])

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string
      full_name?: string
      role?: string
      job_title?: string | null
      company_id?: string
      is_pulse_admin_creating?: boolean
    }
    const { email, full_name, job_title, company_id, is_pulse_admin_creating } =
      body
    const role = typeof body.role === 'string' ? body.role : 'operator'

    if (!email || !full_name || !company_id) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      )
    }

    if (!VALID_ROLES.has(role)) {
      return NextResponse.json({ error: 'Rol no válido' }, { status: 400 })
    }

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user)
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: inviterData } = await supabase
      .from('users')
      .select('role, is_pulse_admin, company_id, full_name')
      .eq('id', user.id)
      .single()

    if (inviterData?.role !== 'admin' && !inviterData?.is_pulse_admin) {
      return NextResponse.json(
        { error: 'Sin permisos para invitar usuarios' },
        { status: 403 }
      )
    }

    if (inviterData?.role === 'admin' && !inviterData?.is_pulse_admin) {
      if (role === 'admin') {
        return NextResponse.json(
          {
            error:
              'Los administradores de empresa no pueden crear otros administradores. Contacta a Pulse.',
          },
          { status: 403 }
        )
      }
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

    // Límite y flags de empresa
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('max_users, allow_user_invites, name')
      .eq('id', company_id)
      .is('deleted_at', null)
      .single()

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Empresa no encontrada' },
        { status: 404 }
      )
    }

    const isPulse = inviterData?.is_pulse_admin === true

    if (!isPulse) {
      if (company.allow_user_invites === false) {
        return NextResponse.json(
          {
            error: 'Esta empresa no tiene habilitada la invitación de usuarios',
          },
          { status: 403 }
        )
      }
    }

    if (company.max_users === 0) {
      return NextResponse.json(
        {
          error: 'Esta empresa no puede tener usuarios adicionales',
        },
        { status: 403 }
      )
    }

    const { count: currentUsers, error: countError } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company_id)
      .is('deleted_at', null)

    if (countError) {
      return NextResponse.json(
        { error: countError.message },
        { status: 500 }
      )
    }

    const c = currentUsers ?? 0
    const cap = company.max_users ?? 3
    if (c >= cap) {
      return NextResponse.json(
        {
          error: `Límite de usuarios alcanzado (${c}/${cap}). Contacta a Pulse para aumentar el límite.`,
        },
        { status: 403 }
      )
    }

    // Marcador opcional para auditoría (creación de admin desde Pulse)
    void is_pulse_admin_creating

    // 2. Generar enlace de invitación y enviar por Resend
    const base = process.env.NEXT_PUBLIC_APP_URL
    if (!base) {
      return NextResponse.json(
        { error: 'Falta NEXT_PUBLIC_APP_URL' },
        { status: 500 }
      )
    }
    const { data: linkData, error: authError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email,
        options: { redirectTo: `${base}/auth/confirm?mode=invite` },
      })

    let userId: string | undefined = linkData?.user?.id

    if (authError) {
      if (authError.message.includes('already been registered')) {
        const { data: existingUserRow } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', email.toLowerCase())
          .maybeSingle()
        userId = existingUserRow?.id
      } else {
        return NextResponse.json(
          { error: authError.message },
          { status: 400 }
        )
      }
    }

    // Enviar email con Resend si tenemos el enlace
    if (linkData?.properties?.action_link) {
      await resend.emails.send({
        from: FROM,
        to: email,
        subject: `Te invitaron a unirte a ${company.name} en Lumio`,
        html: inviteUserHtml({
          fullName: full_name,
          companyName: company.name,
          inviterName: inviterData?.full_name ?? 'Tu administrador',
          role,
          actionLink: linkData.properties.action_link,
        }),
        text: inviteUserText({
          fullName: full_name,
          companyName: company.name,
          inviterName: inviterData?.full_name ?? 'Tu administrador',
          role,
          actionLink: linkData.properties.action_link,
        }),
      })
    }

    if (userId) {
      // Verificar si el usuario ya tiene una fila en users (ya pertenece a otra empresa)
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id, company_id')
        .eq('id', userId)
        .single()

      if (existingUser) {
        // Usuario existente: solo agregar la membresía nueva sin tocar su empresa activa
        const { error: membershipError } = await supabaseAdmin
          .from('user_company_memberships')
          .upsert(
            {
              user_id:    userId,
              company_id: company_id,
              role:       role ?? 'operator',
              is_default: false,
            },
            { onConflict: 'user_id,company_id' }
          )

        if (membershipError) {
          return NextResponse.json(
            { error: membershipError.message },
            { status: 500 }
          )
        }
      } else {
        // Usuario nuevo: crear fila en users + membresía default
        const { error: userError } = await supabaseAdmin
          .from('users')
          .insert({
            id:             userId,
            company_id:     company_id,
            full_name:      full_name,
            email:          email,
            role:           role ?? 'operator',
            job_title:      job_title ?? null,
            is_pulse_admin: false,
          })

        if (userError) {
          return NextResponse.json(
            { error: userError.message },
            { status: 500 }
          )
        }

        await supabaseAdmin
          .from('user_company_memberships')
          .insert({
            user_id:    userId,
            company_id: company_id,
            role:       role ?? 'operator',
            is_default: true,
          })
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
