'use client'

import { createContext, useContext, type ReactNode } from 'react'

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface UserContextValue {
  userName: string
  userRole: string
  companyName: string
  isPulseAdmin: boolean
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
}

export function UserProvider({
  children,
  userName,
  userRole,
  companyName,
  isPulseAdmin,
}: UserProviderProps) {
  const value: UserContextValue = {
    userName: userName ?? 'Usuario',
    userRole: userRole ?? 'admin',
    companyName: companyName ?? '',
    isPulseAdmin: isPulseAdmin ?? false,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}
