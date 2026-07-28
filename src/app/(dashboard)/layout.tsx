import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/layout/DashboardShell'
import { getUserData, getUserCompanies } from '@/lib/queries/getUser'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [userData, companies] = await Promise.all([
    getUserData(),
    getUserCompanies(),
  ])

  if (!userData) {
    redirect('/login')
  }

  const supabase = await createClient()
  const { data: companyData } = await supabase
    .from('companies')
    .select('name')
    .eq('id', userData.company_id)
    .single()

  return (
    <DashboardShell
      userName={userData.full_name}
      userRole={userData.role}
      companyName={companyData?.name}
      companyId={userData.company_id}
      isPulseAdmin={userData.is_pulse_admin}
      avatarUrl={userData.avatar_url}
      companies={companies}
    >
      {children}
    </DashboardShell>
  )
}
