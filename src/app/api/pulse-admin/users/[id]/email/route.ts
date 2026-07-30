import { NextRequest, NextResponse } from 'next/server'
import { requirePulseAdmin } from '@/lib/pulse-admin/requirePulseAdmin'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resend, FROM } from '@/lib/email/resend'
import { inviteUserHtml, inviteUserText } from '@/lib/email/templates/inviteUser'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePulseAdmin()
  if ('error' in auth) return auth.error

  const { id } = await params
  const body = (await request.json()) as { email?: string }
  const newEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }

  // Verificar que el usuario existe y está pendiente (sin last_seen_at)
  const { data: target, error: fetchErr } = await supabaseAdmin
    .from('users')
    .select('id, full_name, email, role, company_id, last_seen_at, deleted_at')
    .eq('id', id)
    .maybeSingle()

  if (fetchErr || !target) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  if (target.deleted_at) {
    return NextResponse.json({ error: 'El usuario está suspendido' }, { status: 400 })
  }

  if (target.email?.toLowerCase() === newEmail) {
    return NextResponse.json({ error: 'El email es igual al actual' }, { status: 400 })
  }

  const base = process.env.NEXT_PUBLIC_APP_URL
  if (!base) {
    return NextResponse.json({ error: 'Falta NEXT_PUBLIC_APP_URL' }, { status: 500 })
  }

  // 1. Actualizar email en auth.users
  const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(id, {
    email: newEmail,
    email_confirm: true,
  })
  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 400 })
  }

  // 2. Actualizar email en tabla users
  const { error: dbErr } = await supabaseAdmin
    .from('users')
    .update({ email: newEmail })
    .eq('id', id)

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 })
  }

  // 3. Generar nuevo enlace de invitación y enviar
  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('name')
    .eq('id', target.company_id)
    .single()

  let linkData = null

  const invite = await supabaseAdmin.auth.admin.generateLink({
    type: 'invite',
    email: newEmail,
    options: { redirectTo: `${base}/auth/callback?type=invite` },
  })

  if (invite.error) {
    // Fallback: recovery si ya confirmado
    const recovery = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: newEmail,
      options: { redirectTo: `${base}/auth/callback?type=invite` },
    })
    if (!recovery.error) linkData = recovery.data
  } else {
    linkData = invite.data
  }

  if (linkData?.properties?.action_link) {
    await resend.emails.send({
      from: FROM,
      to: newEmail,
      subject: `Tu invitación a ${company?.name ?? 'Lumio'} — nuevo enlace de acceso`,
      html: inviteUserHtml({
        fullName: target.full_name ?? '',
        companyName: company?.name ?? '',
        inviterName: 'Pulse Admin',
        role: target.role ?? 'operator',
        actionLink: linkData.properties.action_link,
      }),
      text: inviteUserText({
        fullName: target.full_name ?? '',
        companyName: company?.name ?? '',
        inviterName: 'Pulse Admin',
        role: target.role ?? 'operator',
        actionLink: linkData.properties.action_link,
      }),
    })
  }

  return NextResponse.json({ success: true, email: newEmail })
}
