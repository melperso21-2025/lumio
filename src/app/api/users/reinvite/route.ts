import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resend, FROM } from '@/lib/email/resend'
import { inviteUserHtml, inviteUserText } from '@/lib/email/templates/inviteUser'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      userId?: string
      email?: string
    }
    const { userId, email } = body

    if (!userId || !email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Faltan userId o email' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: inviter } = await supabase
      .from('users')
      .select('role, is_pulse_admin, company_id, full_name')
      .eq('id', authUser.id)
      .single()

    if (!inviter) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 403 })
    }

    const { data: target, error: targetErr } = await supabaseAdmin
      .from('users')
      .select('id, company_id, email, full_name, role')
      .eq('id', userId)
      .is('deleted_at', null)
      .maybeSingle()

    if (targetErr || !target) {
      return NextResponse.json(
        { error: 'Usuario destino no encontrado' },
        { status: 404 }
      )
    }

    if (target.email?.toLowerCase() !== email.trim().toLowerCase()) {
      return NextResponse.json(
        { error: 'El email no coincide con el usuario' },
        { status: 400 }
      )
    }

    const isPulse = inviter.is_pulse_admin === true
    const isCompanyAdmin =
      inviter.role === 'admin' && !isPulse

    if (isCompanyAdmin) {
      if (inviter.company_id !== target.company_id) {
        return NextResponse.json(
          { error: 'Sin permisos para este usuario' },
          { status: 403 }
        )
      }
    } else if (!isPulse) {
      return NextResponse.json(
        { error: 'Sin permisos para reenviar invitaciones' },
        { status: 403 }
      )
    }

    const base = process.env.NEXT_PUBLIC_APP_URL
    if (!base) {
      return NextResponse.json(
        { error: 'Falta NEXT_PUBLIC_APP_URL' },
        { status: 500 }
      )
    }

    // Intentar invite; si ya está confirmado en Supabase, usar recovery
    // con el mismo redirectTo para que el callback lo trate igual (→ setup-account)
    let { data: linkData, error: invErr } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: target.email!,
        options: { redirectTo: `${base}/auth/callback?type=invite` },
      })

    if (invErr) {
      const recovery = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: target.email!,
        options: { redirectTo: `${base}/auth/callback?type=invite` },
      })
      if (recovery.error) {
        return NextResponse.json({ error: recovery.error.message }, { status: 400 })
      }
      linkData = recovery.data
    }

    // Obtener nombre de empresa para el email
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('name')
      .eq('id', target.company_id)
      .single()

    if (linkData?.properties?.action_link) {
      await resend.emails.send({
        from: FROM,
        to: target.email!,
        subject: `Te invitaron a unirte a ${company?.name ?? 'tu empresa'} en Lumio`,
        html: inviteUserHtml({
          fullName: target.full_name ?? '',
          companyName: company?.name ?? '',
          inviterName: inviter.full_name ?? 'Tu administrador',
          role: target.role ?? 'operator',
          actionLink: linkData.properties.action_link,
        }),
        text: inviteUserText({
          fullName: target.full_name ?? '',
          companyName: company?.name ?? '',
          inviterName: inviter.full_name ?? 'Tu administrador',
          role: target.role ?? 'operator',
          actionLink: linkData.properties.action_link,
        }),
      })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('reinvite', e)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
