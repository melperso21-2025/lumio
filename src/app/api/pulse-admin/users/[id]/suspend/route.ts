import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requirePulseAdmin } from '@/lib/pulse-admin/requirePulseAdmin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePulseAdmin()
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = (await request.json()) as { suspend: boolean }

  const { error } = await supabaseAdmin
    .from('users')
    .update({ deleted_at: body.suspend ? new Date().toISOString() : null })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
