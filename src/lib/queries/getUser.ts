import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * Retorna los datos del usuario autenticado en el request actual.
 * React.cache() garantiza que la query a `users` se ejecuta una
 * sola vez por request, sin importar cuántas veces se llame esta
 * función (layout + pages comparten el resultado).
 */
export const getUserData = cache(async () => {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from('users')
    .select('company_id, full_name, role, is_pulse_admin, avatar_url')
    .eq('id', user.id)
    .single()

  return data ?? null
})

/**
 * Atajo para los casos donde solo se necesita el company_id.
 * Reutiliza el caché de getUserData() — no lanza una query extra.
 */
export async function getCompanyId(): Promise<string | null> {
  const data = await getUserData()
  return data?.company_id ?? null
}
