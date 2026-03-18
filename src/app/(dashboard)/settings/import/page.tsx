import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import AiInsightBox from '@/components/ui/AiInsightBox'
import ImportSection from '@/components/settings/ImportSection'

export default async function SettingsImportPage() {
  // 1. Auth
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
  const userRole = userData?.role
  const isPulseAdmin = userData?.is_pulse_admin ?? false
  const canImport = userRole === 'admin' || isPulseAdmin

  // Si no hay companyId → mensaje igual que otros módulos
  if (!companyId) {
    return (
      <>
        <Topbar
          pageTitle="Importar datos"
          pageSubtitle="Carga masiva desde CSV"
        />
        <div style={{ padding: 20 }}>
          <p
            style={{
              fontFamily: 'var(--font-syne)',
              color: 'var(--muted)',
              fontSize: 14,
            }}
          >
            No tienes una empresa asignada.
          </p>
        </div>
      </>
    )
  }

  // 2. Obtener canales y categorías para mapeo en importación
  const { data: channelsList } = await supabase
    .from('sales_channels')
    .select('id, name, type')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('name')

  const { data: categoriesList } = await supabase
    .from('product_categories')
    .select('id, name')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('name')

  const channels = channelsList ?? []
  const categories = categoriesList ?? []

  return (
    <>
      <Topbar
        pageTitle="Importar datos"
        pageSubtitle="Carga masiva desde CSV"
      />

      <div
        style={{
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Sección 2 — Si no puede importar */}
        {!canImport && (
          <AiInsightBox
            variant="blue"
            title="Acceso restringido"
            text="Solo los administradores pueden importar datos masivos."
          />
        )}

        {/* Sección 3 — Si puede importar, mostrar AiInsightBox informativo */}
        {canImport && (
          <AiInsightBox
            variant="gold"
            title="✦ Cómo funciona la importación"
            text="Descarga la plantilla CSV del tipo de datos que quieres importar, complétala con tu información y súbela. Lumio validará cada fila antes de guardar. Los errores se muestran fila por fila para que puedas corregirlos."
          />
        )}

        {/* Sección 4 — 3 ImportSection en flex column gap 20 */}
        {canImport && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <ImportSection
              type="sales"
              title="Importar ventas"
              description="Carga el historial de transacciones de ventas."
              companyId={companyId}
              channels={channels}
            />
            <ImportSection
              type="customers"
              title="Importar clientes"
              description="Carga tu base de datos de clientes existente."
              companyId={companyId}
              channels={channels}
            />
            <ImportSection
              type="products"
              title="Importar productos"
              description="Carga tu catálogo de productos e inventario inicial."
              companyId={companyId}
              categories={categories}
            />
          </div>
        )}
      </div>
    </>
  )
}
