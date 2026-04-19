import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import SuppliersOverview from '@/components/suppliers/SuppliersOverview'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SuppliersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  const companyId = userData?.company_id

  if (!companyId) {
    return (
      <>
        <Topbar pageTitle="Proveedores" pageSubtitle="Directorio" />
        <div style={{ padding: '14px 16px' }}>
          <p style={{ fontFamily: 'var(--font-syne)', color: 'var(--muted)', fontSize: 14 }}>
            No tienes una empresa asignada.
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar pageTitle="Proveedores" pageSubtitle="Directorio de proveedores" />
      <div style={{ padding: '14px 16px', height: 'calc(100vh - 52px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <SuppliersOverview companyId={companyId} />
      </div>
    </>
  )
}
