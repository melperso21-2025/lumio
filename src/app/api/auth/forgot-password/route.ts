import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resend, FROM } from '@/lib/email/resend'
import { resetPasswordHtml, resetPasswordText } from '@/lib/email/templates/resetPassword'
import { authLimiter, checkRateLimit } from '@/lib/ratelimit'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'anon'
    const rl = await checkRateLimit(authLimiter, `forgot-password:${ip}`)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Intenta de nuevo en un momento.' },
        { status: 429 }
      )
    }

    const body = (await request.json()) as { email?: string }
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
    }

    const base = process.env.NEXT_PUBLIC_APP_URL
    if (!base) {
      return NextResponse.json({ error: 'Falta NEXT_PUBLIC_APP_URL' }, { status: 500 })
    }

    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: `${base}/auth/confirm?mode=recovery` },
      })

    // Respuesta genérica para no revelar si el email existe
    if (linkError || !linkData?.properties?.action_link) {
      return NextResponse.json({ success: true })
    }

    await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'Restablecer contraseña — Lumio',
      html: resetPasswordHtml({ actionLink: linkData.properties.action_link }),
      text: resetPasswordText({ actionLink: linkData.properties.action_link }),
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('forgot-password', e)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
