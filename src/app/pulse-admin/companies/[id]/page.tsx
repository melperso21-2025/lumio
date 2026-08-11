import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import CompanyDetail from '@/components/pulse-admin/CompanyDetail'
import { getCompanyKpis } from '@/lib/pulse-admin/companyKpis'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PulseAdminCompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: company, error: cErr } = await supabase
    .from('companies')
    .select(
      'id, name, tax_id, sector, plan, status, max_users, allow_user_invites, trial_expires_at, operational_since, pulse_notes, active_modules, metadata, tags, branch_count, created_at, updated_at'
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (cErr || !company) {
    notFound()
  }

  const { data: userRows, error: uErr } = await supabase
    .from('users')
    .select('id, full_name, email, role, last_seen_at, deleted_at')
    .eq('company_id', id)
    .order('created_at', { ascending: true })

  const users = uErr ? [] : (userRows ?? [])

  const { count: activeUserCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', id)
    .is('deleted_at', null)

  const kpis = await getCompanyKpis(supabase, id)

  return (
    <>
      <Topbar pageTitle={company.name} pageSubtitle="Detalle de empresa" />
      <CompanyDetail
        key={company.updated_at ?? company.id}
        company={{
          id: company.id,
          name: company.name,
          tax_id: company.tax_id,
          sector: company.sector,
          plan: company.plan,
          status: company.status,
          max_users: company.max_users ?? 3,
          allow_user_invites: company.allow_user_invites ?? true,
          trial_expires_at: company.trial_expires_at,
          operational_since: company.operational_since,
          pulse_notes: company.pulse_notes,
          active_modules: company.active_modules,
          metadata: company.metadata,
          tags: company.tags,
          branch_count: company.branch_count,
          created_at: company.created_at,
        }}
        users={users}
        kpis={kpis}
        activeUserCount={activeUserCount ?? 0}
      />
    </>
  )
}
