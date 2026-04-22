import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import CompaniesManager, {
  type CompanyListRow,
} from '@/components/pulse-admin/CompaniesManager'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function loadCompanies(): Promise<CompanyListRow[]> {
  const supabase = await createClient()
  const { data: companies, error: cErr } = await supabase
    .from('companies')
    .select(
      'id, name, tax_id, sector, plan, status, max_users, allow_user_invites, trial_expires_at, created_at, pulse_notes, operational_since'
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (cErr || !companies) {
    return []
  }

  const ids = companies.map((c) => c.id)
  if (ids.length === 0) {
    return []
  }

  const { data: urows } = await supabase
    .from('users')
    .select('company_id')
    .in('company_id', ids)
    .is('deleted_at', null)

  const countBy: Record<string, number> = {}
  urows?.forEach((u) => {
    if (u.company_id) countBy[u.company_id] = (countBy[u.company_id] ?? 0) + 1
  })

  return companies.map((c) => ({
    id: c.id,
    name: c.name,
    tax_id: c.tax_id,
    sector: c.sector,
    plan: c.plan,
    status: c.status,
    max_users: c.max_users ?? 3,
    allow_user_invites: c.allow_user_invites ?? true,
    trial_expires_at: c.trial_expires_at,
    created_at: c.created_at,
    pulse_notes: c.pulse_notes,
    operational_since: c.operational_since,
    user_count: countBy[c.id] ?? 0,
  }))
}

export default async function PulseAdminCompaniesPage() {
  const rows = await loadCompanies()
  return (
    <>
      <Topbar
        pageTitle="Empresas"
        pageSubtitle="Gestión de cuentas cliente"
      />
      <div style={{ padding: '14px 16px' }}>
        <Suspense
          fallback={
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Cargando…</p>
          }
        >
          <CompaniesManager initialCompanies={rows} />
        </Suspense>
      </div>
    </>
  )
}
