import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import AiInsightBox from '@/components/ui/AiInsightBox'
import SalesChannelsManager from '@/components/settings/SalesChannelsManager'

export default async function SettingsSalesChannelsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
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

  if (!companyId) {
    return (
      <>
        <Topbar pageTitle="Configuración · Ventas" pageSubtitle="Canales de venta" />
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
      <Topbar
        pageTitle="Configuración · Ventas"
        pageSubtitle="Canales de venta"
      />

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!canAccess && (
          <AiInsightBox
            variant="blue"
            title="Acceso restringido"
            text="Solo administradores y gerentes pueden gestionar los canales de venta."
          />
        )}

        {canAccess && (
          <>
            <div>
              <h1
                className="font-syne font-bold"
                style={{ fontSize: 18, color: 'var(--text)', marginBottom: 4 }}
              >
                Canales de venta
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text2)' }}>
                Configura los canales por los que llegan tus ventas. Puedes indicar el tipo,
                la plataforma, si es digital y el porcentaje de comisión. Los canales inactivos
                se ocultan al registrar nuevas ventas.
              </p>
            </div>

            <div
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '16px 18px',
              }}
            >
              <SalesChannelsManager companyId={companyId} canDelete={canDelete} />
            </div>
          </>
        )}
      </div>
    </>
  )
}
