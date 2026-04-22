import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requirePulseAdmin } from '@/lib/pulse-admin/requirePulseAdmin'

export async function GET() {
  const auth = await requirePulseAdmin()
  if ('error' in auth) return auth.error

  const { data: companies, error: companiesError } = await supabaseAdmin
    .from('companies')
    .select(
      'id, name, tax_id, sector, plan, status, max_users, allow_user_invites, trial_expires_at, created_at, pulse_notes, active_modules, branch_count, operational_since, metadata, tags'
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (companiesError) {
    return NextResponse.json(
      { error: companiesError.message },
      { status: 500 }
    )
  }

  const ids = (companies ?? []).map((c) => c.id)
  if (ids.length === 0) {
    return NextResponse.json({ companies: [] })
  }

  const { data: userRows, error: userErr } = await supabaseAdmin
    .from('users')
    .select('company_id')
    .in('company_id', ids)
    .is('deleted_at', null)

  if (userErr) {
    return NextResponse.json({ error: userErr.message }, { status: 500 })
  }

  const countByCompany: Record<string, number> = {}
  userRows?.forEach((u) => {
    if (!u.company_id) return
    countByCompany[u.company_id] = (countByCompany[u.company_id] ?? 0) + 1
  })

  const withCounts = (companies ?? []).map((c) => ({
    ...c,
    user_count: countByCompany[c.id] ?? 0,
  }))

  return NextResponse.json({ companies: withCounts })
}

const VALID_PLANS = new Set(['trial', 'basic', 'standard', 'pro'])
const VALID_STATUS = new Set(['trial', 'active', 'suspended'])

function parseDateOnly(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v !== 'string') return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
  return v
}

export async function POST(request: NextRequest) {
  const auth = await requirePulseAdmin()
  if ('error' in auth) return auth.error

  const body = (await request.json()) as Record<string, unknown>
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return NextResponse.json(
      { error: 'El nombre de la empresa es obligatorio' },
      { status: 400 }
    )
  }

  const taxIdRaw = typeof body.tax_id === 'string' ? body.tax_id.trim() : ''
  if (taxIdRaw && !/^\d{13}$/.test(taxIdRaw)) {
    return NextResponse.json(
      { error: 'El RUC debe tener 13 dígitos' },
      { status: 400 }
    )
  }

  const planRaw = typeof body.plan === 'string' ? body.plan : 'trial'
  if (!VALID_PLANS.has(planRaw)) {
    return NextResponse.json(
      { error: 'El plan debe ser: trial, basic, standard o pro' },
      { status: 400 }
    )
  }
  const plan = planRaw

  const statusRaw = typeof body.status === 'string' ? body.status : 'trial'
  if (!VALID_STATUS.has(statusRaw)) {
    return NextResponse.json(
      { error: 'El estado debe ser: trial, active o suspended' },
      { status: 400 }
    )
  }
  const status = statusRaw

  let maxUsers = 3
  if (body.max_users !== undefined && body.max_users !== null) {
    const n = Number(body.max_users)
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      return NextResponse.json(
        { error: 'max_users debe ser un entero ≥ 0' },
        { status: 400 }
      )
    }
    maxUsers = n
  }

  const allowInvites =
    typeof body.allow_user_invites === 'boolean'
      ? body.allow_user_invites
      : true

  const row = {
    name,
    tax_id: taxIdRaw || null,
    sector: typeof body.sector === 'string' ? body.sector.trim() || null : null,
    plan,
    status,
    max_users: maxUsers,
    allow_user_invites: allowInvites,
    trial_expires_at: parseDateOnly(body.trial_expires_at),
    operational_since: parseDateOnly(body.operational_since),
    pulse_notes: typeof body.pulse_notes === 'string' ? body.pulse_notes : null,
  }

  const { data: company, error: insertError } = await supabaseAdmin
    .from('companies')
    .insert(row)
    .select()
    .single()

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 400 }
    )
  }

  return NextResponse.json({ company }, { status: 201 })
}
