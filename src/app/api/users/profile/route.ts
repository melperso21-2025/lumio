import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// ── PATCH /api/users/profile ───────────────────────────────────────────────
// Actualiza el perfil del usuario autenticado.
// Usa supabaseAdmin para el UPDATE (necesario para avatar_url que
// puede tener restricciones de RLS en algunos setups).
// La identidad se valida con el server client antes de actuar.

export async function PATCH(request: NextRequest) {
  try {
    // 1. Validar identidad con el client de sesión
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // 2. Leer body
    const body = (await request.json()) as {
      first_name?: string
      last_name?: string
      full_name?: string
      alias?: string | null
      job_title?: string
      phone?: string | null
      notify_whatsapp?: boolean
      notify_email?: boolean
      avatar_url?: string
    }

    // 3. Construir payload — solo campos permitidos
    const payload: Record<string, unknown> = {}
    if (body.first_name   !== undefined) payload.first_name   = body.first_name.trim()
    if (body.last_name    !== undefined) payload.last_name    = body.last_name.trim()
    if (body.full_name    !== undefined) payload.full_name    = body.full_name.trim()
    if (body.alias        !== undefined) payload.alias        = body.alias ? body.alias.trim() : null
    if (body.job_title    !== undefined) payload.job_title    = body.job_title.trim()
    if (body.phone        !== undefined) payload.phone        = body.phone ? body.phone.trim() : null
    if (body.notify_whatsapp !== undefined) payload.notify_whatsapp = body.notify_whatsapp
    if (body.notify_email    !== undefined) payload.notify_email    = body.notify_email
    if (body.avatar_url   !== undefined) payload.avatar_url   = body.avatar_url

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: 'Sin campos para actualizar' }, { status: 400 })
    }

    // 4. UPDATE con supabaseAdmin validando que el id coincide con el usuario autenticado
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(payload)
      .eq('id', user.id)
      .select('id, first_name, last_name, full_name, job_title, phone, avatar_url, notify_whatsapp, notify_email')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
