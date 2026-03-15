'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ── Tipos ──────────────────────────────────────────────────
interface Channel {
  id: string
  name: string
}

interface QuickSaleFormProps {
  channels?: Channel[]
}

const STATUS_OPTIONS = [
  { value: 'closed',  label: 'Cerrada'   },
  { value: 'review',  label: 'Revisión'  },
  { value: 'contact', label: 'Contacto'  },
] as const

const inputBaseStyle: React.CSSProperties = {
  background:   'var(--surface)',
  border:       '1px solid var(--border2)',
  color:        'var(--text)',
  fontFamily:   'var(--font-jakarta)',
  width:        '100%',
  padding:      '8px 12px',
  borderRadius: 8,
  fontSize:     14,
}

const labelStyle: React.CSSProperties = {
  fontSize:      9,
  color:         'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight:    600,
  display:       'block',
  marginBottom:  4,
}

// ── Helpers de focus/blur para inputs ─────────────────────
function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = 'var(--gold)'
  e.target.style.boxShadow   = '0 0 0 3px var(--gold-bg)'
  e.target.style.outline     = 'none'
}
function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = 'var(--border2)'
  e.target.style.boxShadow   = 'none'
}

// ── Componente ─────────────────────────────────────────────
export default function QuickSaleForm({ channels = [] }: QuickSaleFormProps) {
  const router = useRouter()

  const [open,           setOpen]          = useState(false)
  const [loading,        setLoading]       = useState(false)
  const [error,          setError]         = useState<string | null>(null)
  const [success,        setSuccess]       = useState(false)
  const [gross_total,    setGrossTotal]    = useState('')
  const [lines_per_order,setLinesPerOrder] = useState(1)
  const [channel_id,     setChannelId]     = useState('')
  const [status,         setStatus]        = useState('closed')
  const [notes,          setNotes]         = useState('')

  // Resetea todos los campos
  function resetForm() {
    setGrossTotal('')
    setLinesPerOrder(1)
    setChannelId('')
    setStatus('closed')
    setNotes('')
    setError(null)
    setSuccess(false)
  }

  function handleClose() {
    if (loading) return
    setOpen(false)
    resetForm()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const total = parseFloat(gross_total)
    if (Number.isNaN(total) || total < 0) {
      setError('El total debe ser un número válido mayor a 0.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    // Obtener usuario autenticado
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Sesión expirada. Vuelve a iniciar sesión.')
      setLoading(false)
      return
    }

    // Obtener company_id del usuario
    const { data: userRow } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    const company_id = userRow?.company_id
    if (!company_id) {
      setError('No tienes una empresa asignada. Contacta a tu administrador.')
      setLoading(false)
      return
    }

    const today = new Date().toISOString().slice(0, 10)

    // Insertar la venta
    const { error: insertError } = await supabase.from('sales').insert({
      company_id,
      sale_date:       today,
      gross_total:     total,
      lines_per_order: lines_per_order || 1,
      channel_id:      channel_id || null,
      status:          status || 'closed',
      notes:           notes.trim() || null,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    // Éxito
    setSuccess(true)
    setLoading(false)
    resetForm()
    router.refresh()

    // Cerrar el modal después de 1.2s para mostrar el mensaje de éxito
    setTimeout(() => {
      setOpen(false)
      setSuccess(false)
    }, 1200)
  }

  return (
    <>
      {/* Botón disparador */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-syne font-bold text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
        style={{
          background: 'linear-gradient(135deg, #F5C842, #F09A1A)',
          color:      '#1A1B2E',
        }}
      >
        + Registrar venta
      </button>

      {/* Modal */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Registrar venta"
          style={{
            position:       'fixed',
            inset:          0,
            zIndex:         50,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            background:     'rgba(0,0,0,0.45)',
          }}
          onClick={handleClose}
        >
          <div
            style={{
              background:   'var(--card)',
              border:       '1px solid var(--border)',
              borderRadius: 12,
              padding:      24,
              width:        '100%',
              maxWidth:     420,
              boxShadow:    '0 20px 40px rgba(0,0,0,0.14)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3
                className="font-syne font-bold"
                style={{ fontSize: 16, color: 'var(--text)' }}
              >
                Registrar venta
              </h3>
              <button
                type="button"
                onClick={handleClose}
                style={{ color: 'var(--muted)', fontSize: 18, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            {/* Mensaje de éxito */}
            {success && (
              <div
                style={{
                  background:   'rgba(5,150,105,0.08)',
                  border:       '1px solid rgba(5,150,105,0.2)',
                  borderRadius: 8,
                  padding:      '10px 14px',
                  marginBottom: 16,
                  fontSize:     12,
                  color:        'var(--green)',
                  fontWeight:   500,
                }}
              >
                ✓ Venta registrada correctamente
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Total $ */}
              <div>
                <label htmlFor="qs-total" style={labelStyle}>Total $</label>
                <input
                  id="qs-total"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={gross_total}
                  onChange={(e) => setGrossTotal(e.target.value)}
                  placeholder="0.00"
                  style={inputBaseStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              {/* Canal de venta */}
              {channels.length > 0 && (
                <div>
                  <label htmlFor="qs-channel" style={labelStyle}>Canal de venta</label>
                  <select
                    id="qs-channel"
                    value={channel_id}
                    onChange={(e) => setChannelId(e.target.value)}
                    style={inputBaseStyle}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  >
                    <option value="">Sin canal</option>
                    {channels.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Líneas por pedido */}
              <div>
                <label htmlFor="qs-lines" style={labelStyle}>Líneas por pedido</label>
                <input
                  id="qs-lines"
                  type="number"
                  min="1"
                  value={lines_per_order}
                  onChange={(e) => setLinesPerOrder(parseInt(e.target.value, 10) || 1)}
                  style={inputBaseStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              {/* Estado */}
              <div>
                <label htmlFor="qs-status" style={labelStyle}>Estado</label>
                <select
                  id="qs-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={inputBaseStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Notas */}
              <div>
                <label htmlFor="qs-notes" style={labelStyle}>Notas (opcional)</label>
                <textarea
                  id="qs-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones sobre la venta"
                  style={{ ...inputBaseStyle, resize: 'vertical' }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              {/* Error */}
              {error && (
                <div
                  style={{
                    background:   'rgba(220,38,38,0.06)',
                    border:       '1px solid rgba(220,38,38,0.2)',
                    borderRadius: 8,
                    padding:      '8px 12px',
                    fontSize:     12,
                    color:        'var(--red)',
                  }}
                >
                  {error}
                </div>
              )}

              {/* Botones */}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  style={{
                    flex:         1,
                    padding:      '9px 0',
                    borderRadius: 8,
                    fontSize:     13,
                    fontWeight:   500,
                    background:   'var(--hover)',
                    color:        'var(--text2)',
                    border:       '1px solid var(--border)',
                    cursor:       loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="font-syne font-bold"
                  style={{
                    flex:         1,
                    padding:      '9px 0',
                    borderRadius: 8,
                    fontSize:     13,
                    background:   loading
                      ? 'rgba(232,165,0,0.5)'
                      : 'linear-gradient(135deg, #F5C842, #F09A1A)',
                    color:        '#1A1B2E',
                    border:       'none',
                    cursor:       loading ? 'not-allowed' : 'pointer',
                    opacity:      loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Guardando...' : 'Registrar venta'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  )
}
