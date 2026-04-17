import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // Limpiar session_token en BD para invalidar sesión en todos los dispositivos
    await supabaseAdmin
      .from('users')
      .update({ session_token: null, session_token_created_at: null })
      .eq('id', user.id)
  }

  // Cerrar sesión en Supabase (limpia cookies de auth)
  await supabase.auth.signOut()

  // Eliminar cookie de sesión personalizada
  response.cookies.delete('lumio-session-token')

  return response
}
