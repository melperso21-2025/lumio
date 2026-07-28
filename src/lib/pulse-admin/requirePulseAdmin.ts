import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Autenticación mínima para rutas /api/pulse-admin/* (solo is_pulse_admin).
 */
export async function requirePulseAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }),
    }
  }
  const { data: userRow } = await supabase
    .from('users')
    .select('id, is_pulse_admin')
    .eq('id', user.id)
    .single()

  if (userRow?.is_pulse_admin !== true) {
    return {
      error: NextResponse.json(
        { error: 'Solo el equipo Pulse puede realizar esta acción' },
        { status: 403 }
      ),
    }
  }
  return { supabase, user, userId: user.id }
}
