import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data: sessionData, error } =
      await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      if (type === 'recovery' || next === '/auth/update-password') {
        return NextResponse.redirect(`${origin}/auth/update-password`)
      }

      // Invitación: type=invite viene del redirectTo que pasamos en generateLink
      if (type === 'invite') {
        return NextResponse.redirect(`${origin}/auth/setup-account`)
      }

      // Fallback heurístico por si el type no llega (no debería ocurrir)
      const user = sessionData?.user
      const isFirstLogin =
        user?.confirmed_at &&
        user?.last_sign_in_at &&
        Math.abs(
          new Date(user.confirmed_at).getTime() -
            new Date(user.last_sign_in_at).getTime()
        ) < 5000

      if (isFirstLogin) {
        return NextResponse.redirect(`${origin}/auth/setup-account`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Si algo falla, redirigir al login con error
  return NextResponse.redirect(`${origin}/login?error=auth`)
}
