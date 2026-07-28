'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/context/UserContext'

export default function CompanySwitcher() {
  const router = useRouter()
  const { companyName, companyId, companies, refreshUser } = useUser()
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Si solo hay una empresa, no mostrar el switcher
  if (companies.length <= 1) {
    return (
      <div
        style={{
          fontSize: 11,
          color: 'var(--muted)',
          padding: '0 12px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={companyName}
      >
        {companyName}
      </div>
    )
  }

  async function handleSwitch(targetCompanyId: string) {
    if (targetCompanyId === companyId || loading) return
    setLoading(targetCompanyId)
    setOpen(false)

    const res = await fetch('/api/companies/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: targetCompanyId }),
    })

    if (res.ok) {
      const { role } = (await res.json()) as { role: string; company_id: string }
      const company = companies.find((c) => c.company_id === targetCompanyId)
      if (company) {
        refreshUser({
          companyId:   targetCompanyId,
          companyName: company.name,
          userRole:    role,
        })
      }
      router.refresh()
    }

    setLoading(null)
  }

  return (
    <div ref={ref} style={{ position: 'relative', padding: '0 12px' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Cambiar empresa"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          padding: '5px 8px',
          borderRadius: 6,
          border: '1px solid var(--border)',
          background: open ? 'var(--hover)' : 'transparent',
          color: 'var(--text2)',
          cursor: 'pointer',
          fontSize: 11,
          textAlign: 'left',
          transition: 'background 0.15s',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
          {companyName || 'Empresa'}
        </span>
        <span style={{ flexShrink: 0, fontSize: 9, opacity: 0.6 }}>▼</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 4px)',
            left: 12,
            right: 12,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '6px 10px 4px', fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Mis empresas
          </div>
          {companies.map((c) => {
            const isActive  = c.company_id === companyId
            const isLoading = loading === c.company_id
            return (
              <button
                key={c.company_id}
                type="button"
                onClick={() => handleSwitch(c.company_id)}
                disabled={isActive || !!loading}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  border: 'none',
                  background: isActive ? 'var(--gold-bg)' : 'transparent',
                  color: isActive ? 'var(--gold)' : 'var(--text)',
                  cursor: isActive ? 'default' : 'pointer',
                  fontSize: 12,
                  textAlign: 'left',
                  borderTop: '1px solid var(--border)',
                  opacity: loading && !isActive && !isLoading ? 0.5 : 1,
                  transition: 'background 0.12s',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: isActive ? 'var(--gold)' : 'var(--border2)',
                  }}
                />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isLoading ? 'Cambiando…' : c.name}
                </span>
                <span style={{ fontSize: 9, color: 'var(--muted)', flexShrink: 0 }}>
                  {c.role}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
