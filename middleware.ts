import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refrescar sesión — importante no eliminar esto
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Rutas públicas que no requieren autenticación
  const publicRoutes = [
    '/login',
    '/auth/callback',
    '/auth/update-password',
    '/auth/setup-account',
    '/api/auth/', // login, logout, verify-session — evitar loops
  ]
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  // Si no hay sesión y la ruta no es pública → redirigir a login
  if (!user && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // Si hay sesión y está en login → redirigir al dashboard
  if (user && request.nextUrl.pathname === '/login') {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/dashboard'
    return NextResponse.redirect(dashboardUrl)
  }

  // Verificar session token solo para rutas autenticadas no-API
  if (user && !isPublicRoute && !request.nextUrl.pathname.startsWith('/api/')) {
    const sessionToken = request.cookies.get('lumio-session-token')?.value

    if (!sessionToken) {
      // Cookie ausente → sesión expirada o inválida
      const loginUrl = new URL('/login?error=session_expired', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // Verificar token contra la BD a través del API route interno
    try {
      const verifyUrl = new URL('/api/auth/verify-session', request.url)
      const verifyRes = await fetch(verifyUrl.toString(), {
        headers: {
          'x-user-id': user.id,
          'x-session-token': sessionToken,
        },
      })

      if (verifyRes.ok) {
        const { valid } = (await verifyRes.json()) as { valid: boolean }

        if (!valid) {
          // Token no coincide → sesión reemplazada por otro dispositivo
          const loginUrl = new URL('/login?error=session_replaced', request.url)
          const res = NextResponse.redirect(loginUrl)
          res.cookies.delete('lumio-session-token')
          return res
        }
      }
    } catch {
      // Si falla la verificación, dejar pasar (evitar bloqueo por error de red)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Aplica el middleware a todas las rutas excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico
     * - archivos con extensión (png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
