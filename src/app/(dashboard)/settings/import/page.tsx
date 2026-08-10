import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import AiInsightBox from '@/components/ui/AiInsightBox'
import ImportWizard from '@/components/settings/import/ImportWizard'
import ImportHistory from '@/components/settings/import/ImportHistory'
import RecalculateStatsButton from '@/components/settings/import/RecalculateStatsButton'
import ImportChecklist from '@/components/settings/import/ImportChecklist'

export default async function SettingsImportPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const activeTab = params.tab === 'history' ? 'history' : 'import'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('company_id, role, is_pulse_admin')
    .eq('id', user.id)
    .single()

  const companyId   = userData?.company_id
  const userRole    = userData?.role ?? 'operator'
  const isPulseAdmin= userData?.is_pulse_admin ?? false
  const canImport   = userRole === 'admin' || isPulseAdmin

  if (!companyId) {
    return (
      <>
        <Topbar pageTitle="Importar datos" pageSubtitle="Carga masiva" />
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
      <Topbar pageTitle="Importar datos" pageSubtitle="Carga masiva desde Excel o CSV" />

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14, height: 'calc(100vh - 52px)', overflow: 'hidden' }}>

        {!canImport && (
          <AiInsightBox
            variant="blue"
            title="Acceso restringido"
            text="Solo los administradores pueden importar datos masivos."
          />
        )}

        {canImport && (
          <>
            {/* ── Tabs ── */}
            <TabBar active={activeTab} />

            {/* ── Content ── */}
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
              {activeTab === 'import' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Checklist de estado */}
                  <ImportChecklist companyId={companyId} />

                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <h1 className="font-syne font-bold" style={{ fontSize: 17, color: 'var(--text)', margin: '0 0 4px' }}>
                      Importación de datos
                    </h1>
                    <p style={{ fontSize: 12, color: 'var(--text2)' }}>
                      Importa proveedores, productos, clientes, ventas y más desde Excel o CSV.
                      El sistema valida todos los datos antes de guardarlos.
                    </p>
                  </div>
                  <ImportWizard companyId={companyId} />

                  <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />

                  <div>
                    <p className="font-syne font-bold" style={{ fontSize: 13, color: 'var(--text)', margin: '0 0 8px' }}>
                      Post-importación
                    </p>
                    <RecalculateStatsButton />
                  </div>
                </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  <h1 className="font-syne font-bold" style={{ fontSize: 17, color: 'var(--text)', margin: '0 0 12px', flexShrink: 0 }}>
                    Historial de importaciones
                  </h1>
                  <ImportHistory companyId={companyId} userRole={userRole} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ── Tab bar (server-renderable with links) ────────────────────────────────

function TabBar({ active }: { active: string }) {
  const tabs = [
    { key: 'import',  label: '📤 Importar datos',  href: '/settings/import' },
    { key: 'history', label: '📋 Historial',        href: '/settings/import?tab=history' },
  ]
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', paddingBottom: 0, flexShrink: 0 }}>
      {tabs.map((t) => (
        <a
          key={t.key}
          href={t.href}
          style={{
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'var(--font-syne)',
            color: active === t.key ? 'var(--gold)' : 'var(--muted)',
            borderBottom: active === t.key ? '2px solid var(--gold)' : '2px solid transparent',
            textDecoration: 'none',
            transition: 'all 0.12s',
            marginBottom: -1,
          }}
        >
          {t.label}
        </a>
      ))}
    </div>
  )
}
