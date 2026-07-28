import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = (await request.json()) as {
      email: string
      password: string
    }

    // La respuesta se crea antes para que el cliente SSR pueda setear cookies en ella
    const response = NextResponse.json({ success: true })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.user) {
      return NextResponse.json(
        {
          message:
            error?.message === 'Invalid login credentials'
              ? 'Email o contraseña incorrectos. Verifica tus datos.'
              : (error?.message ?? 'Error al iniciar sesión'),
        },
        { status: 401 }
      )
    }

    // Garantizar que existe una membresía para el usuario en su empresa activa
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('company_id, role')
      .eq('id', data.user.id)
      .single()

    if (userRow?.company_id) {
      await supabaseAdmin
        .from('user_company_memberships')
        .upsert(
          {
            user_id:    data.user.id,
            company_id: userRow.company_id,
            role:       userRow.role ?? 'operator',
            is_default: true,
          },
          { onConflict: 'user_id,company_id' }
        )
    }

    // Generar token único de sesión
    const sessionToken = crypto.randomUUID()

    await supabaseAdmin
      .from('users')
      .update({
        session_token: sessionToken,
        session_token_created_at: new Date().toISOString(),
      })
      .eq('id', data.user.id)

    // Cookie httpOnly con el token de sesión
    response.cookies.set('lumio-session-token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 horas
      path: '/',
    })

    return response
  } catch {
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
