import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/layout/DashboardShell'
import { getUserData } from '@/lib/queries/getUser'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const userData = await getUserData()

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
      isPulseAdmin={userData.is_pulse_admin}
      avatarUrl={userData.avatar_url}
    >
      {children}
    </DashboardShell>
  )
}
