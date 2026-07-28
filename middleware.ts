import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { authLimiter, aiLimiter, apiLimiter, checkRateLimit } from '@/lib/ratelimit'

// Obtiene la IP real del cliente aunque esté detrás de un proxy/Vercel
function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const ip   = getClientIP(request)

  // ── Rate limiting por tipo de ruta ────────────────────────────────────
  if (path.startsWith('/api/')) {
    let limiter   = apiLimiter
    let limitKey  = `api:${ip}`

    if (path.startsWith('/api/auth/')) {
      limiter  = authLimiter
      limitKey = `auth:${ip}`
    } else if (path.startsWith('/api/ai-insights/') || path.startsWith('/api/ai/')) {
      limiter  = aiLimiter
      limitKey = `ai:${ip}`
    }

    const { allowed, remaining, reset } = await checkRateLimit(limiter, limitKey)

    if (!allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Demasiadas solicitudes. Intenta de nuevo en unos segundos.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': reset ? String(Math.ceil((reset - Date.now()) / 1000)) : '60',
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }

    // Añadir header informativo si está disponible
    if (remaining !== undefined) {
      const res = NextResponse.next()
      res.headers.set('X-RateLimit-Remaining', String(remaining))
      // No retornamos aquí — seguimos al flujo normal de auth
    }
  }

  // ── Security headers en todas las respuestas ──────────────────────────
  let supabaseResponse = NextResponse.next({ request })

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

  // Si hay sesión y está en login → redirigir al dashboard,
  // pero solo si también tiene el lumio-session-token válido.
  // Sin ese token dejaría en un loop: dashboard→login→dashboard.
  if (user && request.nextUrl.pathname === '/login') {
    const hasLumioToken = !!request.cookies.get('lumio-session-token')?.value
    if (hasLumioToken) {
      const dashboardUrl = request.nextUrl.clone()
      dashboardUrl.pathname = '/dashboard'
      return NextResponse.redirect(dashboardUrl)
    }
  }

  // Verificar session token solo para rutas autenticadas no-API
  if (user && !isPublicRoute && !request.nextUrl.pathname.startsWith('/api/')) {
    const sessionToken = request.cookies.get('lumio-session-token')?.value

    if (!sessionToken) {
      const loginUrl = new URL('/login?error=session_expired', request.url)
      return NextResponse.redirect(loginUrl)
    }

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

  // Añadir security headers a la respuesta final
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
  supabaseResponse.headers.set('X-Frame-Options', 'DENY')
  supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  supabaseResponse.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  )
  supabaseResponse.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
