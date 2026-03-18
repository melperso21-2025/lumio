import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PulseSidebar from '@/components/pulse-admin/PulseSidebar'

export default async function PulseAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('full_name, role, is_pulse_admin')
    .eq('id', user.id)
    .single()

  if (userData?.is_pulse_admin !== true) redirect('/dashboard')

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: '#F7F8FC',
      }}
    >
      {/* Sidebar oscuro propio */}
      <PulseSidebar
        userName={userData?.full_name ?? 'Pulse Admin'}
      />

      {/* Columna derecha — fondo blanco */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#F7F8FC',
        }}
      >
        {/* Banner Pulse — franja oscura superior */}
        <div
          style={{
            background: 'linear-gradient(90deg, #0F1020, #1A1A30)',
            borderBottom: '1px solid rgba(245,200,66,0.2)',
            padding: '6px 22px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              style={{ fontSize: 10, color: 'rgba(245,200,66,0.5)' }}
            >
              Solo visible para el equipo Pulse
            </span>
            <a
              href="/dashboard"
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'rgba(245,200,66,0.7)',
                padding: '3px 10px',
                border: '1px solid rgba(245,200,66,0.2)',
                borderRadius: 5,
                background: 'transparent',
                textDecoration: 'none',
                fontFamily: 'var(--font-jakarta)',
              }}
            >
              ← Volver a vista cliente
            </a>
          </div>
        </div>

        {/* Contenido scrollable */}
        <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  )
}
