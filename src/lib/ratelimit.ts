import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Fail-open: si no hay credenciales de Upstash configuradas,
// devuelve siempre éxito para no bloquear la app.
function makeRatelimiter(requests: number, window: `${number} ${'s' | 'm' | 'h'}`) {
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) return null

  const redis = new Redis({ url, token })
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: false,
  })
}

// Auth y verify-session: 10 requests/minuto por IP
export const authLimiter = makeRatelimiter(10, '1 m')

// Endpoints de IA (costosos): 5 requests/5 minutos por IP
export const aiLimiter = makeRatelimiter(5, '5 m')

// API general: 60 requests/minuto por IP
export const apiLimiter = makeRatelimiter(60, '1 m')

export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ allowed: boolean; remaining?: number; reset?: number }> {
  if (!limiter) return { allowed: true }

  const { success, remaining, reset } = await limiter.limit(identifier)
  return { allowed: success, remaining, reset }
}
