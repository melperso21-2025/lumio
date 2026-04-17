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

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>')
  return ctx
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
