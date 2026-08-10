'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ENTITY_DEFS, type EntityType } from '@/lib/import/entityConfig'

// ── Types ─────────────────────────────────────────────────────────────────

interface ImportLog {
  id: string
  entity_type: string
  file_name: string
  total_rows: number
  success_rows: number
  error_rows: number
  status: 'processing' | 'success' | 'partial' | 'failed' | 'rolled_back'
  errors: { row: number; message: string }[] | null
  imported_ids: string[] | null
  created_at: string
  completed_at: string | null
  imported_by: string
  users?: { email: string } | null
}

interface ImportHistoryProps {
  companyId: string
  userRole: string
}

// ── Status config ─────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  processing:  { label: 'Procesando', bg: 'rgba(37,99,235,0.1)',  color: 'var(--blue)'   },
  success:     { label: 'Exitoso',    bg: 'rgba(5,150,105,0.1)',  color: 'var(--green)'  },
  partial:     { label: 'Parcial',    bg: 'rgba(217,119,6,0.1)',  color: 'var(--orange)' },
  failed:      { label: 'Fallido',    bg: 'rgba(220,38,38,0.1)',  color: 'var(--red)'    },
  rolled_back: { label: 'Revertido',  bg: 'var(--hover)',         color: 'var(--muted)'  },
}

// ── Shared styles ─────────────────────────────────────────────────────────

const fStyle: React.CSSProperties = {
  padding: '5px 10px',
  fontSize: 11,
  borderRadius: 6,
  border: '1px solid var(--border2)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontFamily: 'var(--font-jakarta)',
}

// ── Component ─────────────────────────────────────────────────────────────

export default function ImportHistory({ companyId, userRole }: ImportHistoryProps) {
  const router = useRouter()
  const [logs,    setLogs]    = useState<ImportLog[]>([])
  const [loading, setLoading] = useState(true)

  // Error modal
  const [errorLog, setErrorLog] = useState<ImportLog | null>(null)

  // Rollback confirmation
  const [rollbackLog,     setRollbackLog]     = useState<ImportLog | null>(null)
  const [rollbackLoading, setRollbackLoading] = useState(false)
  const [rollbackError,   setRollbackError]   = useState<string | null>(null)
  const [rollbackSuccess, setRollbackSuccess] = useState(false)

  const canAdmin = userRole === 'admin'

  const loadLogs = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('import_logs')
      .select('*, users(email)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(100)

    setLogs(data ?? [])
    setLoading(false)
  }, [companyId])

  useEffect(() => { loadLogs() }, [loadLogs])

  async function handleRollback() {
    if (!rollbackLog) return
    setRollbackLoading(true); setRollbackError(null)
    try {
      const res  = await fetch('/api/import/rollback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ importLogId: rollbackLog.id }),
      })
      const json = await res.json()
      if (!res.ok) { setRollbackError(json.error ?? 'Error al revertir'); setRollbackLoading(false); return }
      setRollbackSuccess(true)
      await loadLogs()
      router.refresh()
      setTimeout(() => {
        setRollbackLog(null)
        setRollbackSuccess(false)
      }, 1500)
    } catch {
      setRollbackError('Error de conexión')
    }
    setRollbackLoading(false)
  }

  if (loading) {
    return <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 24 }}>Cargando historial…</p>
  }

  if (logs.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--muted)' }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>Sin importaciones registradas</p>
        <p style={{ fontSize: 12 }}>Las importaciones que realices aparecerán aquí.</p>
      </div>
    )
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexShrink: 0 }}>
        <p style={{ fontSize: 11, color: 'var(--muted)' }}>{logs.length} registro{logs.length !== 1 ? 's' : ''}</p>
        <button type="button" onClick={loadLogs} style={{ ...fStyle, cursor: 'pointer' }}>
          ↺ Actualizar
        </button>
      </div>

      <div style={{ overflow: 'auto', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead style={{ position: 'sticky', top: 0, background: 'var(--card)', boxShadow: '0 1px 0 var(--border)', zIndex: 1 }}>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Fecha', 'Entidad', 'Archivo', 'Total', 'Exitosas', 'Fallidas', 'Estado', 'Usuario', 'Acciones'].map((h) => (
                <th key={h} style={{ padding: '9px 10px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', whiteSpace: 'nowrap', letterSpacing: '0.06em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const st  = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.failed
              const def = ENTITY_DEFS[log.entity_type as EntityType]
              const canRollback = canAdmin && (log.status === 'success' || log.status === 'partial') && (log.imported_ids?.length ?? 0) > 0
              const hasErrors   = (log.errors?.length ?? 0) > 0

              return (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '9px 10px', color: 'var(--text2)', whiteSpace: 'nowrap', fontSize: 11 }}>
                    {new Date(log.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                    <br />
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                      {new Date(log.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>

                  <td style={{ padding: '9px 10px', fontWeight: 600, color: 'var(--text)' }}>
                    {def?.label ?? log.entity_type}
                  </td>

                  <td style={{ padding: '9px 10px', color: 'var(--text2)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>
                    {log.file_name}
                  </td>

                  <td style={{ padding: '9px 10px', color: 'var(--text2)', textAlign: 'right' }}>
                    {log.total_rows}
                  </td>

                  <td style={{ padding: '9px 10px', color: 'var(--green)', textAlign: 'right', fontWeight: 600 }}>
                    {log.success_rows}
                  </td>

                  <td style={{ padding: '9px 10px', color: log.error_rows > 0 ? 'var(--red)' : 'var(--muted)', textAlign: 'right', fontWeight: log.error_rows > 0 ? 700 : 400 }}>
                    {log.error_rows}
                  </td>

                  <td style={{ padding: '9px 10px' }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, fontWeight: 600, background: st.bg, color: st.color, whiteSpace: 'nowrap' }}>
                      {st.label}
                    </span>
                  </td>

                  <td style={{ padding: '9px 10px', color: 'var(--text2)', fontSize: 11, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {log.users?.email ?? log.imported_by.slice(0, 8) + '…'}
                  </td>

                  <td style={{ padding: '9px 10px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {hasErrors && (
                        <button
                          type="button"
                          onClick={() => setErrorLog(log)}
                          style={{ ...fStyle, cursor: 'pointer', minWidth: 'auto', padding: '3px 8px', fontSize: 11 }}
                        >
                          Ver errores
                        </button>
                      )}
                      {canRollback && (
                        <button
                          type="button"
                          onClick={() => { setRollbackLog(log); setRollbackError(null); setRollbackSuccess(false) }}
                          style={{ cursor: 'pointer', padding: '3px 8px', fontSize: 11, borderRadius: 6, border: '1px solid rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.06)', color: 'var(--red)', fontFamily: 'var(--font-jakarta)' }}
                        >
                          Rollback
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Error modal ── */}
      {errorLog && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setErrorLog(null)}
        >
          <div
            style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 560, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.14)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 className="font-syne font-bold" style={{ fontSize: 15, color: 'var(--text)', margin: 0 }}>
                Errores — {ENTITY_DEFS[errorLog.entity_type as EntityType]?.label ?? errorLog.entity_type}
              </h3>
              <button type="button" onClick={() => setErrorLog(null)} style={{ color: 'var(--muted)', fontSize: 18, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
            </div>

            <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>
              {errorLog.file_name} · {new Date(errorLog.created_at).toLocaleDateString('es-EC')}
            </p>

            {(errorLog.errors ?? []).length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>Sin errores registrados.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600, fontSize: 10, width: 60 }}>Fila</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600, fontSize: 10 }}>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {(errorLog.errors ?? []).map((e, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(220,38,38,0.08)' }}>
                      <td style={{ padding: '6px 10px', color: 'var(--red)', fontWeight: 700 }}>{e.row}</td>
                      <td style={{ padding: '6px 10px', color: 'var(--text2)' }}>{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Rollback confirmation modal ── */}
      {rollbackLog && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }}
          onClick={() => { if (!rollbackLoading) setRollbackLog(null) }}
        >
          <div
            style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 400, boxShadow: '0 20px 40px rgba(0,0,0,0.14)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {rollbackSuccess ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--font-syne)' }}>
                  Rollback completado
                </p>
                <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
                  {rollbackLog.success_rows} registros eliminados
                </p>
              </div>
            ) : (
              <>
                <h3 className="font-syne font-bold" style={{ fontSize: 15, color: 'var(--text)', marginBottom: 10 }}>
                  ¿Revertir importación?
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>
                  <strong>{ENTITY_DEFS[rollbackLog.entity_type as EntityType]?.label}</strong> — {rollbackLog.file_name}
                </p>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
                  Se eliminarán los <strong>{rollbackLog.imported_ids?.length ?? rollbackLog.success_rows}</strong> registros importados en esta sesión. Esta acción no se puede deshacer.
                </p>

                {rollbackError && (
                  <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: 'var(--red)' }}>
                    {rollbackError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => setRollbackLog(null)} disabled={rollbackLoading}
                    style={{ flex: 1, padding: '9px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: 'var(--hover)', color: 'var(--text2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button type="button" onClick={handleRollback} disabled={rollbackLoading}
                    style={{ flex: 1, padding: '9px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'rgba(220,38,38,0.1)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.25)', cursor: rollbackLoading ? 'not-allowed' : 'pointer', opacity: rollbackLoading ? 0.7 : 1 }}>
                    {rollbackLoading ? 'Revirtiendo…' : 'Confirmar rollback'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
