'use client'

import { useState } from 'react'

interface EditUserRoleFormProps {
  userId: string
  currentRole: string
  isPulseAdmin?: boolean
  currentUserId?: string
}

export default function EditUserRoleForm({
  userId,
  currentRole,
  isPulseAdmin = false,
  currentUserId,
}: EditUserRoleFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [role, setRole] = useState(currentRole)
  const [saved, setSaved] = useState(false)

  // No se puede cambiar el propio rol
  const isSelf = currentUserId === userId
  // Un admin regular no puede asignar ni ver la opción 'admin'
  const canAssignAdmin = isPulseAdmin

  async function handleChange(newRole: string) {
    setRole(newRole)
    setSaved(false)
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/users/update-role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Error al actualizar rol')
        setRole(currentRole) // revertir
        setLoading(false)
        return
      }

      setSaved(true)
      setLoading(false)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Error de conexión')
      setRole(currentRole)
      setLoading(false)
    }
  }

  if (isSelf) {
    return (
      <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-jakarta)', padding: '3px 8px' }}>
        {role === 'admin' ? 'Admin' : role === 'manager' ? 'Gerente' : 'Operativo'}
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <select
        value={role}
        onChange={(e) => handleChange(e.target.value)}
        disabled={loading}
        style={{
          fontSize: 11,
          padding: '3px 8px',
          borderRadius: 6,
          border: '1px solid var(--border2)',
          background: 'var(--surface)',
          color: 'var(--text)',
          fontFamily: 'var(--font-jakarta)',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        <option value="operator">Operativo</option>
        <option value="manager">Gerente</option>
        {canAssignAdmin && <option value="admin">Admin</option>}
      </select>
      {loading && (
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>...</span>
      )}
      {saved && (
        <span style={{ fontSize: 10, color: 'var(--green)' }}>✓</span>
      )}
      {error && (
        <span style={{ fontSize: 10, color: 'var(--red)' }}>✗</span>
      )}
    </div>
  )
}
