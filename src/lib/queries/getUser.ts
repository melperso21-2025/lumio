import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export interface UserCompany {
  company_id: string
  name: string
  role: string
  is_default: boolean
}

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
 * Retorna todas las empresas a las que pertenece el usuario autenticado.
 * Se usa para el selector de empresa en el layout.
 */
export const getUserCompanies = cache(async (): Promise<UserCompany[]> => {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data } = await supabase
    .from('user_company_memberships')
    .select('company_id, role, is_default, companies(name)')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })

  return (data ?? []).map((m) => ({
    company_id: m.company_id,
    role:       m.role,
    is_default: m.is_default,
    name:       (m.companies as unknown as { name: string } | null)?.name ?? '',
  }))
})

/**
 * Atajo para los casos donde solo se necesita el company_id.
 * Reutiliza el caché de getUserData() — no lanza una query extra.
 */
export async function getCompanyId(): Promise<string | null> {
  const data = await getUserData()
  return data?.company_id ?? null
}
