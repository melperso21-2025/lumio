import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import AiInsightBox from '@/components/ui/AiInsightBox'
import FinanceCatalogsManager from '@/components/settings/FinanceCatalogsManager'

export default async function SettingsFinancePage() {
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

  const canAccess =
    isPulseAdmin || userRole === 'admin' || userRole === 'manager'

  if (!companyId) {
    return (
      <>
        <Topbar pageTitle="Configuración · Finanzas" pageSubtitle="Catálogos" />
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
        pageTitle="Configuración · Finanzas"
        pageSubtitle="Categorías de transacciones bancarias"
      />

      <div
        style={{
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {!canAccess && (
          <AiInsightBox
            variant="blue"
            title="Acceso restringido"
            text="Solo administradores y gerentes pueden gestionar los catálogos financieros."
          />
        )}

        {canAccess && (
          <>
            <div>
              <h1
                className="font-syne font-bold"
                style={{ fontSize: 18, color: 'var(--text)', marginBottom: 4 }}
              >
                Catálogos financieros
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text2)' }}>
                Configura las categorías disponibles para tus transacciones bancarias.
                Estas categorías también se usan en la importación masiva de movimientos.
              </p>
            </div>

            <FinanceCatalogsManager companyId={companyId} />
          </>
        )}
      </div>
    </>
  )
}
