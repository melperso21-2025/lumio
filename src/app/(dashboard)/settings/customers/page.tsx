import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import AiInsightBox from '@/components/ui/AiInsightBox'
import CustomerCatalogsManager from '@/components/settings/CustomerCatalogsManager'

export default async function SettingsCustomersPage() {
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

  const companyId = userData?.company_id
  const userRole = userData?.role ?? 'operator'
  const isPulseAdmin = userData?.is_pulse_admin ?? false

  const canAccess =
    isPulseAdmin || userRole === 'admin' || userRole === 'manager'

  if (!companyId) {
    return (
      <>
        <Topbar pageTitle="Configuración · Clientes" pageSubtitle="Catálogos" />
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
        pageTitle="Configuración · Clientes"
        pageSubtitle="Tipos de cliente y etiquetas"
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
            text="Solo administradores y gerentes pueden gestionar los catálogos de clientes."
          />
        )}

        {canAccess && (
          <>
            <div>
              <h1
                className="font-syne font-bold"
                style={{ fontSize: 18, color: 'var(--text)', marginBottom: 4 }}
              >
                Catálogos de clientes
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text2)' }}>
                Configura los tipos de cliente y las etiquetas disponibles en tu empresa.
                Los tipos y etiquetas creados aquí aparecerán en el formulario de nuevo cliente.
              </p>
            </div>

            <CustomerCatalogsManager
              companyId={companyId}
              userRole={userRole}
            />
          </>
        )}
      </div>
    </>
  )
}
