'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// ── Tipos ──────────────────────────────────────────────────

export interface SidebarProps {
  userName?: string
  userRole?: string
  companyName?: string
  isPulseAdmin?: boolean
}

interface NavItem {
  href: string
  label: string
  icon: string
  badge?: string | '★'
}

interface NavSection {
  label: string
  items: NavItem[]
}

// ── Componente ──────────────────────────────────────────────

export default function Sidebar({
  userName = 'Usuario',
  userRole = 'Admin',
  companyName,
  isPulseAdmin = false,
}: SidebarProps) {
  const pathname = usePathname()

  // Extrae iniciales para el avatar (primera letra de cada palabra)
  const initials = userName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const isActive = (href: string): boolean => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const sections: NavSection[] = [
    {
      label: 'Principal',
      items: [{ href: '/dashboard', label: 'Dashboard', icon: '◈' }],
    },
    {
      label: 'Operaciones',
      items: [
        { href: '/sales', label: 'Ventas', icon: '💰' },
        { href: '/customers', label: 'Clientes', icon: '👥' },
        { href: '/inventory', label: 'Inventario', icon: '📦' },
        { href: '/finance', label: 'Bancos', icon: '🏦' },
      ],
    },
    {
      label: 'Analítica',
      items: [
        { href: '/ad-campaigns', label: 'Pautas', icon: '📣', badge: '★' },
        { href: '/profit-loss', label: 'P&G', icon: '📈' },
      ],
    },
    {
      label: 'Inteligencia',
      items: [
        {
          href: '/ai-insights',
          label: 'IA Insights',
          icon: '✦',
          badge: 'New',
        },
      ],
    },
    {
      label: 'Configuración',
      items: [
        { href: '/settings/users', label: 'Usuarios & Roles', icon: '🔐' },
        { href: '/settings/import', label: 'Importar datos', icon: '⬆' },
      ],
    },
  ]

  const pulseSection: NavSection = {
    label: '● Pulse Admin',
    items: [{ href: '/pulse-admin', label: 'Panel Pulse', icon: '🏢' }],
  }

  const allSections = isPulseAdmin
    ? [...sections, pulseSection]
    : sections

  return (
    <aside
      className="flex flex-col justify-between overflow-hidden shrink-0"
      style={{
        width: 220,
        height: '100vh',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Contenedor superior: logo + navegación */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Logo */}
        <div className="pt-6 px-4 pb-5 shrink-0">
          <Link href="/dashboard" className="block">
            <div
              className="font-syne font-extrabold text-xl tracking-tight"
              style={{ color: 'var(--text)' }}
            >
              lu<span style={{ color: 'var(--gold)' }}>m</span>io
            </div>
            <div
              className="text-[10px] mt-1 tracking-widest uppercase"
              style={{ color: 'var(--muted)' }}
            >
              by Pulse
            </div>
          </Link>
        </div>

        {/* Navegación — scroll interno si hay mucho contenido */}
        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          {allSections.map((section) => (
            <div key={section.label} className="mb-5">
              <div
                className="px-2 mb-2 text-[9px] uppercase tracking-wide"
                style={{ color: 'var(--muted)' }}
              >
                {section.label}
              </div>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="flex items-center justify-between gap-2 rounded-md text-[12.5px] transition-colors"
                        style={{
                          padding: '7px 12px',
                          color: active ? 'var(--gold)' : 'var(--text2)',
                          background: active ? 'var(--gold-bg)' : 'transparent',
                          borderLeft: active
                            ? '2px solid var(--gold)'
                            : '2px solid transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (!active) {
                            e.currentTarget.style.background = 'var(--hover)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!active) {
                            e.currentTarget.style.background = 'transparent'
                          }
                        }}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span className="shrink-0">{item.icon}</span>
                          {item.label}
                        </span>
                        {item.badge && (
                          <span
                            className="shrink-0 text-[10px] px-1.5 py-0.5 rounded font-semibold"
                            style={{
                              color: 'var(--gold)',
                              background: 'var(--gold-bg)',
                            }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {/* User chip */}
      <div
        className="shrink-0 flex items-center gap-3"
        style={{
          borderTop: '1px solid var(--border)',
          padding: 12,
        }}
      >
        <div
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-syne font-bold text-xs"
          style={{
            background: 'linear-gradient(135deg, #F5C842, #F09A1A)',
            color: '#1A1B2E',
          }}
        >
          {initials || '?'}
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="text-xs font-semibold truncate"
            style={{ color: 'var(--text)' }}
          >
            {userName}
          </div>
          <div
            className="text-[10px] truncate"
            style={{ color: 'var(--muted)' }}
          >
            {userRole}
            {companyName ? ` · ${companyName}` : ''}
          </div>
        </div>
      </div>
    </aside>
  )
}
