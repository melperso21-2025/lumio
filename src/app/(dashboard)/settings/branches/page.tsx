import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import BranchesManager from '@/components/settings/BranchesManager'

export const dynamic = 'force-dynamic'

export default async function SettingsBranchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('company_id, role, is_pulse_admin')
    .eq('id', user.id)
    .single()

  const companyId    = userData?.company_id
  const userRole     = userData?.role ?? 'operator'
  const isPulseAdmin = userData?.is_pulse_admin ?? false

  const canAccess = isPulseAdmin || userRole === 'admin' || userRole === 'manager'
  const canDelete = isPulseAdmin || userRole === 'admin'

  if (!companyId) redirect('/dashboard')

  return (
    <>
      <Topbar pageTitle="Configuración · Ventas" pageSubtitle="Sucursales" />

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!canAccess ? (
          <p style={{ fontFamily: 'var(--font-syne)', color: 'var(--muted)', fontSize: 14 }}>
            Solo administradores y gerentes pueden gestionar las sucursales.
          </p>
        ) : (
          <>
            <div>
              <h1 className="font-syne font-bold" style={{ fontSize: 18, color: 'var(--text)', marginBottom: 4 }}>
                Sucursales
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text2)' }}>
                Registra tus puntos de venta, bodegas y sucursales. Puedes asignar una sucursal al registrar cada venta
                para saber desde dónde provienen tus ingresos.
              </p>
            </div>

            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
              <BranchesManager companyId={companyId} canDelete={canDelete} />
            </div>
          </>
        )}
      </div>
    </>
  )
}
