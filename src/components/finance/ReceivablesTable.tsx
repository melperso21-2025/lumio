'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Receivable = {
  id: string
  amount: number | null
  due_date: string | null
  issue_date: string | null
  invoice_ref: string | null
  status: string | null
  notes: string | null
  customer_id: string | null
  customers: { full_name: string | null } | null
}

interface ReceivablesTableProps {
  receivables: Receivable[]
  totalPending: number
  totalOverdue: number
  canEdit: boolean
}

export default function ReceivablesTable({
  receivables: initialReceivables,
  totalPending: initialPending,
  totalOverdue: initialOverdue,
  canEdit,
}: ReceivablesTableProps) {
  const router = useRouter()
  const [receivables, setReceivables] = useState(initialReceivables)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const totalPending = receivables.filter(r => r.status !== 'overdue').reduce((s, r) => s + (r.amount ?? 0), 0)
  const totalOverdue = receivables.filter(r => r.status === 'overdue').reduce((s, r) => s + (r.amount ?? 0), 0)

  async function markAsPaid(id: string) {
    setLoadingId(id)
    setError(null)
    try {
      const res = await fetch(`/api/accounts-receivable/${id}/mark-paid`, { method: 'POST' })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? 'Error al actualizar')
        setLoadingId(null)
        return
      }
      setReceivables(prev => prev.filter(r => r.id !== id))
      setConfirmId(null)
      router.refresh()
    } catch {
      setError('Error de red')
    } finally {
      setLoadingId(null)
    }
  }

  if (receivables.length === 0) {
    return (
      <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '16px 0' }}>
        No hay cuentas por cobrar pendientes.
      </p>
    )
  }

  return (
    <>
      {/* Totals header */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--font-syne)' }}>
          Pendiente: <strong style={{ color: 'var(--blue)' }}>${totalPending.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
        </span>
        <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--font-syne)' }}>
          Vencido: <strong style={{ color: 'var(--red)' }}>${totalOverdue.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
        </span>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8, padding: '6px 10px', background: 'rgba(240,96,96,0.08)', borderRadius: 6, border: '1px solid rgba(240,96,96,0.2)' }}>
          {error}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              {['Cliente', 'Referencia', 'Emitida', 'Vence', 'Monto', 'Estado', ...(canEdit ? [''] : [])].map((h) => (
                <th
                  key={h}
                  scope="col"
                  style={{
                    textAlign: h === 'Monto' ? 'right' : 'left',
                    padding: '6px 10px',
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--muted)',
                    borderBottom: '1px solid var(--border)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {receivables.map((r) => {
              const isOverdue = r.status === 'overdue'
              const isConfirming = confirmId === r.id
              const isLoading = loadingId === r.id
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '7px 10px', color: 'var(--text)', whiteSpace: 'nowrap', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.customers?.full_name ?? '—'}
                  </td>
                  <td style={{ padding: '7px 10px', color: 'var(--text2)', fontFamily: 'monospace', fontSize: 10 }}>
                    {r.invoice_ref ?? '—'}
                  </td>
                  <td style={{ padding: '7px 10px', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                    {r.issue_date ?? '—'}
                  </td>
                  <td style={{ padding: '7px 10px', color: isOverdue ? 'var(--red)' : 'var(--text2)', fontWeight: isOverdue ? 600 : 400, whiteSpace: 'nowrap' }}>
                    {r.due_date}
                  </td>
                  <td style={{ padding: '7px 10px', color: 'var(--text)', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    ${(r.amount ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '7px 10px' }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20,
                      background: isOverdue ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.12)',
                      color: isOverdue ? 'var(--red)' : 'var(--blue)',
                    }}>
                      {isOverdue ? 'Vencida' : 'Pendiente'}
                    </span>
                  </td>
                  {canEdit && (
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                      {isConfirming ? (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <span style={{ fontSize: 10, color: 'var(--text2)' }}>¿Confirmar?</span>
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => markAsPaid(r.id)}
                            style={{
                              padding: '3px 8px', fontSize: 10, borderRadius: 5, border: '1px solid rgba(46,216,138,0.3)',
                              background: 'rgba(46,216,138,0.1)', color: 'var(--green)', cursor: 'pointer', fontWeight: 600,
                            }}
                          >
                            {isLoading ? '…' : 'Sí'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmId(null)}
                            style={{
                              padding: '3px 8px', fontSize: 10, borderRadius: 5, border: '1px solid var(--border2)',
                              background: 'var(--hover)', color: 'var(--text2)', cursor: 'pointer',
                            }}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmId(r.id)}
                          style={{
                            padding: '3px 10px', fontSize: 10, borderRadius: 5, border: '1px solid rgba(46,216,138,0.25)',
                            background: 'rgba(46,216,138,0.07)', color: 'var(--green)', cursor: 'pointer', fontWeight: 600,
                            fontFamily: 'var(--font-jakarta)',
                          }}
                        >
                          Marcar pagada
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
