'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface UserContextValue {
  userName: string
  userRole: string
  companyName: string
  isPulseAdmin: boolean
  avatarUrl: string | null
  /** Actualiza campos del contexto en cliente (p. ej. tras editar perfil) */
  refreshUser: (updates: Partial<Omit<UserContextValue, 'refreshUser'>>) => void
}

// ── Context + hook ─────────────────────────────────────────────────────────

const UserContext = createContext<UserContextValue | null>(null)

const USER_DEFAULTS: UserContextValue = {
  userName:     'Usuario',
  userRole:     'admin',
  companyName:  '',
  isPulseAdmin: false,
  avatarUrl:    null,
  refreshUser:  () => {},
}

export function useUser(): UserContextValue {
  // Devuelve defaults en lugar de lanzar para que los componentes
  // (Topbar, Sidebar) no fallen silenciosamente si el Provider
  // no está disponible durante la hidratación inicial.
  return useContext(UserContext) ?? USER_DEFAULTS
}

// ── Provider ───────────────────────────────────────────────────────────────

interface UserProviderProps {
  children: ReactNode
  userName?: string | null
  userRole?: string | null
  companyName?: string | null
  isPulseAdmin?: boolean
  avatarUrl?: string | null
}

export function UserProvider({
  children,
  userName,
  userRole,
  companyName,
  isPulseAdmin,
  avatarUrl,
}: UserProviderProps) {
  const [data, setData] = useState({
    userName:    userName    ?? 'Usuario',
    userRole:    userRole    ?? 'admin',
    companyName: companyName ?? '',
    isPulseAdmin: isPulseAdmin ?? false,
    avatarUrl:   avatarUrl   ?? null,
  })

  const refreshUser = (
    updates: Partial<Omit<UserContextValue, 'refreshUser'>>
  ) => {
    setData((prev) => ({ ...prev, ...updates }))
  }

  return (
    <UserContext.Provider value={{ ...data, refreshUser }}>
      {children}
    </UserContext.Provider>
  )
}
