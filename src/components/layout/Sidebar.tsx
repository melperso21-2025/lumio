'use client'

import type { CSSProperties } from 'react'
import { useLayoutEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@/lib/context/UserContext'

// ── Tipos ──────────────────────────────────────────────────

export interface SidebarProps {
  userName?: string
  companyName?: string
  /** Oculta la barra (p. ej. guarda preferencia en DashboardShell) */
  onRequestHide?: () => void
}

interface NavItem {
  href: string
  label: string
  icon: string
  badge?: string | '★'
  /**
   * Roles que pueden ver este item.
   * Si está vacío o undefined → todos lo ven.
   * 'pulse' es un pseudo-rol que sólo aplica cuando isPulseAdmin=true.
   */
  roles?: string[]
}

interface NavSection {
  id: string
  label: string
  items: NavItem[]
}

const SIDEBAR_SECTIONS_KEY = 'lumio:sidebar:sections'

function pathMatchesItem(path: string, href: string): boolean {
  if (href === '/dashboard') return path === '/dashboard'
  return path.startsWith(href)
}

function getActiveSectionId(
  path: string,
  list: { id: string; items: { href: string }[] }[]
): string | null {
  for (const s of list) {
    for (const it of s.items) {
      if (pathMatchesItem(path, it.href)) return s.id
    }
  }
  return null
}

// ── Componente ──────────────────────────────────────────────

export default function Sidebar({
  userName = 'Usuario',
  companyName,
  onRequestHide,
}: SidebarProps) {
  const pathname = usePathname()
  const { userRole, isPulseAdmin } = useUser()

  const [expanded, setExpanded] = useState<Record<string, boolean> | null>(null)

  const initials = userName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const isActive = (href: string): boolean => pathMatchesItem(pathname, href)

  // Sin roles → visible para todos
  // 'pulse' → SOLO cuando isPulseAdmin=true
  // Resto → se compara con userRole; isPulseAdmin ve todo lo demás
  const canSee = useCallback(
    (item: NavItem): boolean => {
      if (!item.roles || item.roles.length === 0) return true
      if (item.roles.includes('pulse')) return isPulseAdmin
      if (isPulseAdmin) return true
      return item.roles.includes(userRole)
    },
    [isPulseAdmin, userRole]
  )

  const sections: NavSection[] = useMemo(
    () => [
      {
        id: 'main',
        label: 'Principal',
        items: [{ href: '/dashboard', label: 'Dashboard', icon: '◈' }],
      },
      {
        id: 'operations',
        label: 'Operaciones',
        items: [
          { href: '/finance', label: 'Bancos', icon: '🏦', roles: ['manager', 'admin'] },
          { href: '/customers', label: 'Clientes', icon: '👥' },
          { href: '/inventory', label: 'Inventario', icon: '📦', roles: ['operator', 'manager', 'admin'] },
          { href: '/suppliers', label: 'Proveedores', icon: '🏭', roles: ['operator', 'manager', 'admin'] },
          { href: '/sales', label: 'Ventas', icon: '💰' },
        ],
      },
      {
        id: 'analytics',
        label: 'Analítica',
        items: [
          { href: '/profit-loss', label: 'P&G', icon: '📈', roles: ['manager', 'admin'] },
          { href: '/ad-campaigns', label: 'Pautas', icon: '📣', badge: '★', roles: ['operator', 'manager', 'admin'] },
        ],
      },
      {
        id: 'intelligence',
        label: 'Inteligencia',
        items: [
          { href: '/ai-insights', label: 'IA Insights', icon: '✦', badge: 'New', roles: ['manager', 'admin'] },
        ],
      },
      {
        id: 'settings',
        label: 'Configuración',
        items: [
          { href: '/settings/customers', label: 'Clientes', icon: '🏷', roles: ['admin', 'manager'] },
          { href: '/settings/finance', label: 'Finanzas', icon: '💳', roles: ['admin', 'manager'] },
          { href: '/settings/import', label: 'Importar datos', icon: '⬆', roles: ['admin'] },
          { href: '/settings/products', label: 'Productos', icon: '📦', roles: ['admin', 'manager'] },
          { href: '/settings/sales-channels', label: 'Canales de venta', icon: '📡', roles: ['admin', 'manager'] },
          { href: '/settings/users', label: 'Usuarios & Roles', icon: '🔐', roles: ['admin'] },
        ],
      },
      {
        id: 'pulse',
        label: '● Pulse Admin',
        items: [
          { href: '/pulse-admin', label: 'Panel Pulse', icon: '🏢', roles: ['pulse'] },
        ],
      },
    ],
    []
  )

  const visibleSections = useMemo(
    () =>
      sections
        .map((section) => ({ ...section, items: section.items.filter(canSee) }))
        .filter((section) => section.items.length > 0),
    [sections, canSee]
  )

  const persist = useCallback((next: Record<string, boolean>) => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(SIDEBAR_SECTIONS_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }, [])

  const readSaved = useCallback((): Record<string, boolean> | null => {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(SIDEBAR_SECTIONS_KEY)
      if (!raw) return null
      const p = JSON.parse(raw) as Record<string, boolean>
      return typeof p === 'object' && p !== null ? p : null
    } catch {
      return null
    }
  }, [])

  // Preferencias (localStorage) + sección de la ruta actual siempre expandida
  useLayoutEffect(() => {
    const saved = readSaved()
    const activeId = getActiveSectionId(pathname, visibleSections)
    const ids = visibleSections.map((s) => s.id)
    const next: Record<string, boolean> = {}
    for (const id of ids) {
      if (saved && typeof saved[id] === 'boolean') {
        next[id] = saved[id]!
      } else {
        next[id] = activeId === id
      }
    }
    if (activeId) next[activeId] = true
    setExpanded(next)
  }, [pathname, readSaved, visibleSections])

  const toggleSection = (id: string) => {
    setExpanded((prev) => {
      if (!prev) return prev
      const next = { ...prev, [id]: !prev[id] }
      persist(next)
      return next
    })
  }

  const hideBtnStyle: CSSProperties = {
    flexShrink: 0,
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    border: '1px solid var(--border2)',
    background: 'var(--hover)',
    color: 'var(--muted)',
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: 'var(--font-syne)',
    lineHeight: 1,
  }

  return (
    <aside
      className="flex flex-col justify-between overflow-hidden shrink-0"
      style={{
        width: 200,
        height: '100vh',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
      }}
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="shrink-0 flex items-start justify-between gap-1 pt-2.5 px-2.5 pb-2">
          <Link href="/dashboard" className="block min-w-0">
            <div
              className="font-syne font-extrabold text-lg tracking-tight leading-tight"
              style={{ color: 'var(--text)' }}
            >
              lu<span style={{ color: 'var(--gold)' }}>m</span>io
            </div>
            <div
              className="text-[9px] mt-0.5 tracking-widest uppercase"
              style={{ color: 'var(--muted)' }}
            >
              by Pulse
            </div>
          </Link>
          {onRequestHide && (
            <button
              type="button"
              onClick={onRequestHide}
              aria-label="Ocultar menú lateral"
              title="Ocultar menú"
              style={hideBtnStyle}
            >
              «
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-1.5 pb-3" aria-label="Navegación principal">
          {visibleSections.map((section) => {
            const isOpen = expanded ? expanded[section.id] === true : false
            return (
              <div key={section.id} className="mb-3">
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between gap-1.5 text-left cursor-pointer"
                  style={{
                    padding: '4px 8px',
                    marginBottom: 2,
                    color: 'var(--muted)',
                    background: 'transparent',
                    border: 'none',
                  }}
                  aria-expanded={isOpen}
                >
                  <span className="text-[8px] uppercase tracking-wide font-inherit block leading-tight">
                    {section.label}
                  </span>
                  <span
                    className="shrink-0 text-[10px] leading-none w-3 text-center"
                    style={{ color: 'var(--muted)' }}
                    aria-hidden
                  >
                    {isOpen ? '▾' : '▸'}
                  </span>
                </button>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateRows: isOpen ? '1fr' : '0fr',
                    transition: 'grid-template-rows 150ms ease',
                  }}
                >
                  <div style={{ overflow: 'hidden', minHeight: 0 }}>
                    <ul
                      className="space-y-0.5 pt-0.5"
                      style={{
                        opacity: isOpen ? 1 : 0,
                        transition: 'opacity 150ms ease',
                        pointerEvents: isOpen ? 'auto' : 'none',
                      }}
                    >
                      {section.items.map((item) => {
                        const active = isActive(item.href)
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              className="flex items-center justify-between gap-1.5 rounded-md text-[12px] transition-colors"
                              style={{
                                padding: '6px 10px',
                                color: active ? 'var(--gold)' : 'var(--text2)',
                                background: active ? 'var(--gold-bg)' : 'transparent',
                                borderLeft: active
                                  ? '2px solid var(--gold)'
                                  : '2px solid transparent',
                              }}
                              onMouseEnter={(e) => {
                                if (!active) e.currentTarget.style.background = 'var(--hover)'
                              }}
                              onMouseLeave={(e) => {
                                if (!active) e.currentTarget.style.background = 'transparent'
                              }}
                            >
                              <span className="flex items-center gap-1.5 min-w-0 truncate">
                                <span className="shrink-0 text-[13px] leading-none">
                                  {item.icon}
                                </span>
                                {item.label}
                              </span>
                              {item.badge && (
                                <span
                                  className="shrink-0 text-[9px] px-1 py-0.5 rounded font-semibold"
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
                </div>
              </div>
            )
          })}
        </nav>
      </div>

      <div
        className="shrink-0 flex items-center gap-2"
        style={{
          borderTop: '1px solid var(--border)',
          padding: '8px 10px',
        }}
      >
        <div
          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-syne font-bold text-[10px]"
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
