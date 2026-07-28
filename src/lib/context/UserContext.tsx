'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import type { UserCompany } from '@/lib/queries/getUser'

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface UserContextValue {
  userName: string
  userRole: string
  companyName: string
  companyId: string
  isPulseAdmin: boolean
  avatarUrl: string | null
  /** Lista de empresas a las que pertenece el usuario */
  companies: UserCompany[]
  /** Actualiza campos del contexto en cliente (p. ej. tras cambiar empresa) */
  refreshUser: (updates: Partial<Omit<UserContextValue, 'refreshUser'>>) => void
}

// ── Context + hook ─────────────────────────────────────────────────────────

const UserContext = createContext<UserContextValue | null>(null)

const USER_DEFAULTS: UserContextValue = {
  userName:     'Usuario',
  userRole:     'admin',
  companyName:  '',
  companyId:    '',
  isPulseAdmin: false,
  avatarUrl:    null,
  companies:    [],
  refreshUser:  () => {},
}

export function useUser(): UserContextValue {
  return useContext(UserContext) ?? USER_DEFAULTS
}

// ── Provider ───────────────────────────────────────────────────────────────

interface UserProviderProps {
  children: ReactNode
  userName?: string | null
  userRole?: string | null
  companyName?: string | null
  companyId?: string | null
  isPulseAdmin?: boolean
  avatarUrl?: string | null
  companies?: UserCompany[]
}

export function UserProvider({
  children,
  userName,
  userRole,
  companyName,
  companyId,
  isPulseAdmin,
  avatarUrl,
  companies,
}: UserProviderProps) {
  const [data, setData] = useState({
    userName:    userName    ?? 'Usuario',
    userRole:    userRole    ?? 'admin',
    companyName: companyName ?? '',
    companyId:   companyId   ?? '',
    isPulseAdmin: isPulseAdmin ?? false,
    avatarUrl:   avatarUrl   ?? null,
    companies:   companies   ?? [],
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
