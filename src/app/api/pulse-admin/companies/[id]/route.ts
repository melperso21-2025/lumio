import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requirePulseAdmin } from '@/lib/pulse-admin/requirePulseAdmin'

const VALID_PLANS = new Set(['trial', 'basic', 'standard', 'pro'])
const VALID_STATUS = new Set(['trial', 'active', 'suspended'])

function parseDateOnly(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v !== 'string') return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
  return v
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePulseAdmin()
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = (await request.json()) as Record<string, unknown>
  const update: Record<string, unknown> = {}

  if (typeof body.name === 'string') {
    const n = body.name.trim()
    if (!n) {
      return NextResponse.json(
        { error: 'El nombre no puede estar vacío' },
        { status: 400 }
      )
    }
    update.name = n
  }
  if (body.tax_id !== undefined) {
    const t = typeof body.tax_id === 'string' ? body.tax_id.trim() : ''
    if (t && !/^\d{13}$/.test(t)) {
      return NextResponse.json(
        { error: 'El RUC debe tener 13 dígitos' },
        { status: 400 }
      )
    }
    update.tax_id = t || null
  }
  if (body.sector !== undefined) {
    update.sector =
      typeof body.sector === 'string' ? body.sector.trim() || null : null
  }
  if (body.plan !== undefined) {
    if (typeof body.plan === 'string' && VALID_PLANS.has(body.plan)) {
      update.plan = body.plan
    } else
      return NextResponse.json(
        { error: 'El plan debe ser: trial, basic, standard o pro' },
        { status: 400 }
      )
  }
  if (body.status !== undefined) {
    if (typeof body.status === 'string' && VALID_STATUS.has(body.status)) {
      update.status = body.status
    } else
      return NextResponse.json(
        { error: 'El estado debe ser: trial, active o suspended' },
        { status: 400 }
      )
  }
  if (body.max_users !== undefined) {
    const n = Number(body.max_users)
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      return NextResponse.json(
        { error: 'max_users debe ser un entero ≥ 0' },
        { status: 400 }
      )
    }
    update.max_users = n
  }
  if (body.allow_user_invites !== undefined) {
    if (typeof body.allow_user_invites !== 'boolean') {
      return NextResponse.json(
        { error: 'allow_user_invites debe ser boolean' },
        { status: 400 }
      )
    }
    update.allow_user_invites = body.allow_user_invites
  }
  if (body.trial_expires_at !== undefined) {
    update.trial_expires_at = parseDateOnly(body.trial_expires_at)
  }
  if (body.operational_since !== undefined) {
    update.operational_since = parseDateOnly(body.operational_since)
  }
  if (body.pulse_notes !== undefined) {
    update.pulse_notes =
      typeof body.pulse_notes === 'string' ? body.pulse_notes : null
  }
  if (body.branch_count !== undefined) {
    const n = Number(body.branch_count)
    if (Number.isFinite(n) && n >= 0) update.branch_count = n
  }
  if (body.active_modules !== undefined) {
    if (
      !Array.isArray(body.active_modules) ||
      !body.active_modules.every((m) => typeof m === 'string')
    ) {
      return NextResponse.json(
        { error: 'active_modules debe ser un array de strings' },
        { status: 400 }
      )
    }
    update.active_modules = body.active_modules
  }
  if (body.metadata !== undefined) {
    if (body.metadata !== null && typeof body.metadata !== 'object') {
      return NextResponse.json(
        { error: 'metadata inválido' },
        { status: 400 }
      )
    }
    update.metadata = body.metadata
  }
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags) || !body.tags.every((t) => typeof t === 'string')) {
      return NextResponse.json({ error: 'tags inválido' }, { status: 400 })
    }
    update.tags = body.tags
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: 'Nada que actualizar' },
      { status: 400 }
    )
  }

  const { data: company, error } = await supabaseAdmin
    .from('companies')
    .update(update)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  if (!company) {
    return NextResponse.json(
      { error: 'Empresa no encontrada' },
      { status: 404 }
    )
  }

  return NextResponse.json({ company })
}
