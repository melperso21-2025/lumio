import Topbar from '@/components/layout/Topbar'

/**
 * Página placeholder para la gestión de empresas en Pulse Admin.
 */
export default function PulseAdminCompaniesPage() {
  return (
    <>
      <Topbar
        pageTitle="Empresas"
        pageSubtitle="Gestión de cuentas cliente"
      />
      <div style={{ padding: '14px 16px' }}>
        <p
          style={{
            fontFamily: 'var(--font-syne)',
            color: 'var(--muted)',
            fontSize: 14,
            textAlign: 'center',
            marginTop: 48,
          }}
        >
          🚧 Gestión de empresas — próximamente
        </p>
      </div>
    </>
  )
}
