import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('full_name, role, is_pulse_admin, company_id')
    .eq('id', user.id)
    .single()

  const { data: companyData } = await supabase
    .from('companies')
    .select('name')
    .eq('id', userData?.company_id)
    .single()

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg)',
      }}
    >
      <Sidebar
        userName={userData?.full_name}
        userRole={userData?.role}
        companyName={companyData?.name}
        isPulseAdmin={userData?.is_pulse_admin}
      />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}
