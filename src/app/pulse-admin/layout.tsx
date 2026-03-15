import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Layout del panel Pulse Admin.
 * Solo accesible si el usuario tiene is_pulse_admin === true.
 */
export default async function PulseAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('is_pulse_admin')
    .eq('id', user.id)
    .single()

  if (userData?.is_pulse_admin !== true) {
    redirect('/dashboard')
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#080810',
      }}
    >
      {/* Banner superior */}
      <div
        style={{
          background: '#0F1020',
          borderBottom: '1px solid rgba(245,200,66,0.2)',
          padding: '6px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-syne)',
            fontWeight: 700,
            fontSize: 12,
            color: '#F5C842',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#F5C842',
              boxShadow: '0 0 6px #F5C842',
            }}
          />
          Pulse Superadmin · Panel de control
        </div>
        <div style={{ fontSize: 10, color: 'rgba(245,200,66,0.5)' }}>
          Solo visible para el equipo Pulse
        </div>
      </div>
      {/* Contenido */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}
