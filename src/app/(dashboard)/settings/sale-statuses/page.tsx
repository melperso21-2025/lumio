import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import SaleStatusesManager from '@/components/settings/SaleStatusesManager'

export const dynamic = 'force-dynamic'

export default async function SettingsSaleStatusesPage() {
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
      <Topbar pageTitle="Configuración · Ventas" pageSubtitle="Estados de venta" />

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!canAccess ? (
          <p style={{ fontFamily: 'var(--font-syne)', color: 'var(--muted)', fontSize: 14 }}>
            Solo administradores y gerentes pueden gestionar los estados de venta.
          </p>
        ) : (
          <>
            <div>
              <h1 className="font-syne font-bold" style={{ fontSize: 18, color: 'var(--text)', marginBottom: 4 }}>
                Estados de venta
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text2)' }}>
                Define los estados que puede tener una venta en tu negocio. Aparecen al registrar ventas
                y como filtros en el historial. Puedes asignarles colores para identificarlos rápidamente.
              </p>
            </div>

            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
              <SaleStatusesManager companyId={companyId} canDelete={canDelete} />
            </div>
          </>
        )}
      </div>
    </>
  )
}
