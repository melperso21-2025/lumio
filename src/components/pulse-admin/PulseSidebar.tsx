'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

interface PulseSidebarProps {
  userName: string
}

function NavItem({
  href,
  icon,
  label,
  active,
  muted = false,
}: {
  href: string
  icon: string
  label: string
  active: boolean
  muted?: boolean
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 10px',
        borderRadius: 8,
        marginBottom: 1,
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        color: active ? '#F5C842' : muted ? '#6060A0' : '#9294AC',
        background: active ? 'rgba(245,200,66,0.1)' : 'transparent',
        border: active
          ? '1px solid rgba(245,200,66,0.2)'
          : '1px solid transparent',
        textDecoration: 'none',
        transition: 'all 0.12s',
      }}
    >
      <span
        style={{
          fontSize: 13,
          width: 16,
          textAlign: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      {label}
    </Link>
  )
}

export default function PulseSidebar({ userName }: PulseSidebarProps) {
  const pathname = usePathname()

  return (
    <nav
      style={{
        width: 220,
        flexShrink: 0,
        background: '#0F1020',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '18px 16px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-syne)',
            fontWeight: 800,
            fontSize: 21,
            letterSpacing: '-0.02em',
          }}
        >
          <span style={{ color: '#E8E8F0' }}>lu</span>
          <span style={{ color: '#E8A500' }}>m</span>
          <span style={{ color: '#E8E8F0' }}>io</span>
        </div>
        <div
          style={{
            fontSize: 9,
            color: '#6060A0',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            marginTop: 2,
          }}
        >
          by Pulse
        </div>
      </div>

      {/* Navegación */}
      <div
        style={{
          flex: 1,
          padding: '12px 10px 4px',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            fontSize: 9,
            color: 'rgba(245,200,66,0.5)',
            textTransform: 'uppercase',
            letterSpacing: '0.13em',
            padding: '0 8px',
            marginBottom: 4,
            fontWeight: 600,
          }}
        >
          Panel Pulse
        </div>

        <NavItem
          href="/pulse-admin"
          icon="◈"
          label="Visión general"
          active={pathname === '/pulse-admin'}
        />
        <NavItem
          href="/pulse-admin/companies"
          icon="🏢"
          label="Empresas"
          active={pathname === '/pulse-admin/companies'}
        />
        <NavItem
          href="/pulse-admin/metrics"
          icon="📊"
          label="Métricas MVP"
          active={pathname === '/pulse-admin/metrics'}
        />

        <div
          style={{
            fontSize: 9,
            color: 'rgba(245,200,66,0.5)',
            textTransform: 'uppercase',
            letterSpacing: '0.13em',
            padding: '12px 8px 4px',
            fontWeight: 600,
          }}
        >
          Acceso
        </div>

        <NavItem
          href="/dashboard"
          icon="←"
          label="Volver a cliente"
          active={false}
          muted
        />
      </div>

      {/* User chip */}
      <div
        style={{
          marginTop: 'auto',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '7px 8px',
            borderRadius: 8,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'linear-gradient(135deg,#7C3AED,#5B21B6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {userName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div
              style={{
                fontSize: 12,
                color: '#E8E8F0',
                fontWeight: 500,
              }}
            >
              {userName}
            </div>
            <div style={{ fontSize: 10, color: '#6060A0' }}>
              Superadmin · Pulse
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
