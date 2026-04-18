import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import AiInsightBox from '@/components/ui/AiInsightBox'
import ProductCatalogsManager from '@/components/settings/ProductCatalogsManager'

export default async function SettingsProductsPage() {
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
        <Topbar pageTitle="Configuración · Productos" pageSubtitle="Categorías" />
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
        pageTitle="Configuración · Productos"
        pageSubtitle="Categorías del catálogo"
      />

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!canAccess && (
          <AiInsightBox
            variant="blue"
            title="Acceso restringido"
            text="Solo administradores y gerentes pueden gestionar las categorías de productos."
          />
        )}

        {canAccess && (
          <>
            <div>
              <h1
                className="font-syne font-bold"
                style={{ fontSize: 18, color: 'var(--text)', marginBottom: 4 }}
              >
                Catálogos de productos
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text2)' }}>
                Gestiona las categorías del catálogo de productos. Puedes crear jerarquías
                asignando una categoría padre. El slug se genera automáticamente desde el nombre.
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
              <ProductCatalogsManager companyId={companyId} canDelete={canDelete} />
            </div>
          </>
        )}
      </div>
    </>
  )
}
