'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface SaleStatus {
  id: string
  name: string
  color: string
  is_active: boolean
  sort_order: number
}

const PRESET_COLORS = [
  '#6B7280', '#3B82F6', '#10B981', '#F59E0B',
  '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6',
]

const inputStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border2)',
  color: 'var(--text)',
  fontFamily: 'var(--font-jakarta)',
  padding: '7px 11px',
  borderRadius: 7,
  fontSize: 13,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 9,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 600,
  marginBottom: 4,
}

function onFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = 'var(--gold)'
  e.target.style.boxShadow = '0 0 0 3px var(--gold-bg)'
}
function onBlur(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = 'var(--border2)'
  e.target.style.boxShadow = 'none'
}

interface SaleStatusesManagerProps {
  companyId: string
  canDelete: boolean
}

export default function SaleStatusesManager({ companyId, canDelete }: SaleStatusesManagerProps) {
  const supabase = createClient()

  const [statuses, setStatuses]       = useState<SaleStatus[]>([])
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [editingStatus, setEditingStatus] = useState<SaleStatus | null>(null)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [togglingId, setTogglingId]   = useState<string | null>(null)
  const [deletingId, setDeletingId]   = useState<string | null>(null)

  const [name, setName]   = useState('')
  const [color, setColor] = useState('#6B7280')

  async function fetchStatuses() {
    setLoading(true)
    const { data } = await supabase
      .from('sale_statuses')
      .select('id, name, color, is_active, sort_order')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('sort_order')
      .order('name')
    setStatuses((data as SaleStatus[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchStatuses() }, [companyId]) // eslint-disable-line react-hooks/exhaustive-deps

  function openAddForm() {
    setEditingStatus(null)
    setName(''); setColor('#6B7280')
    setError(null)
    setShowForm(true)
  }

  function openEditForm(s: SaleStatus) {
    setEditingStatus(s)
    setName(s.name)
    setColor(s.color)
    setError(null)
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingStatus(null)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('El nombre es obligatorio.'); return }
    setSaving(true); setError(null)

    const payload = { name: name.trim(), color: color || '#6B7280' }

    if (editingStatus) {
      const { error: upErr } = await supabase.from('sale_statuses').update(payload).eq('id', editingStatus.id)
      if (upErr) { setError(upErr.message); setSaving(false); return }
    } else {
      const { error: insErr } = await supabase.from('sale_statuses').insert({
        ...payload, company_id: companyId, is_active: true, sort_order: statuses.length,
      })
      if (insErr) { setError(insErr.message); setSaving(false); return }
    }

    setSaving(false)
    cancelForm()
    fetchStatuses()
  }

  async function handleToggle(id: string, active: boolean) {
    setTogglingId(id)
    await supabase.from('sale_statuses').update({ is_active: active }).eq('id', id)
    setTogglingId(null)
    fetchStatuses()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este estado? Las ventas que lo tengan asignado quedarán con ese valor.')) return
    setDeletingId(id)
    await supabase.from('sale_statuses').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    setDeletingId(null)
    fetchStatuses()
  }

  async function moveUp(s: SaleStatus, idx: number) {
    if (idx === 0) return
    const prev = statuses[idx - 1]
    await Promise.all([
      supabase.from('sale_statuses').update({ sort_order: prev.sort_order }).eq('id', s.id),
      supabase.from('sale_statuses').update({ sort_order: s.sort_order }).eq('id', prev.id),
    ])
    fetchStatuses()
  }

  async function moveDown(s: SaleStatus, idx: number) {
    if (idx === statuses.length - 1) return
    const next = statuses[idx + 1]
    await Promise.all([
      supabase.from('sale_statuses').update({ sort_order: next.sort_order }).eq('id', s.id),
      supabase.from('sale_statuses').update({ sort_order: s.sort_order }).eq('id', next.id),
    ])
    fetchStatuses()
  }

  const activeStatuses = statuses.filter((s) => s.is_active)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 className="font-syne font-bold" style={{ fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>
            Estados de venta
          </h3>
          <p style={{ fontSize: 11, color: 'var(--muted)' }}>
            {loading ? '…' : `${activeStatuses.length} estado${activeStatuses.length !== 1 ? 's' : ''} activo${activeStatuses.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={openAddForm}
            className="font-syne font-bold text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #F5C842, #F09A1A)', color: '#1A1B2E', border: 'none' }}
          >
            + Nuevo estado
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}
        >
          <div className="font-syne font-bold" style={{ fontSize: 13, color: 'var(--text)' }}>
            {editingStatus ? 'Editar estado' : 'Nuevo estado'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'flex-end' }}>
            <div>
              <label style={labelStyle}>Nombre *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: En proceso, Pendiente..." style={inputStyle} onFocus={onFocus} onBlur={onBlur} autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  style={{ width: 38, height: 36, borderRadius: 7, border: '1px solid var(--border2)', cursor: 'pointer', padding: 2, background: 'var(--surface)' }}
                />
                <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{color}</span>
              </div>
            </div>
          </div>

          {/* Color presets */}
          <div>
            <label style={{ ...labelStyle, marginBottom: 6 }}>Colores sugeridos</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  title={c}
                  style={{
                    width: 26, height: 26, borderRadius: 6, background: c, border: color === c ? '2px solid var(--text)' : '2px solid transparent',
                    cursor: 'pointer', flexShrink: 0,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div>
            <label style={labelStyle}>Vista previa</label>
            <span style={{
              display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              color: color, background: `${color}22`, border: `1px solid ${color}55`,
            }}>
              {name || 'Estado de venta'}
            </span>
          </div>

          {error && <p style={{ fontSize: 12, color: 'var(--red)', margin: 0 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={cancelForm} style={{ flex: 1, padding: '7px 14px', borderRadius: 7, fontSize: 13, background: 'var(--hover)', color: 'var(--text2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="font-syne font-bold"
              style={{ flex: 1, padding: '7px 18px', borderRadius: 7, fontSize: 13, background: saving ? 'rgba(232,165,0,0.5)' : 'linear-gradient(135deg, #F5C842, #F09A1A)', color: '#1A1B2E', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Guardando…' : editingStatus ? 'Guardar cambios' : 'Crear estado'}
            </button>
          </div>
        </form>
      )}

      {/* Lista */}
      {loading ? (
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>Cargando…</p>
      ) : statuses.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--muted)', padding: '8px 0' }}>No hay estados configurados. Los estados te permiten clasificar y dar seguimiento a tus ventas.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {statuses.map((s, idx) => {
            const isInactive = !s.is_active
            return (
              <div
                key={s.id}
                style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto auto', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: isInactive ? 'transparent' : 'var(--bg)', opacity: isInactive ? 0.55 : 1 }}
              >
                {/* Orden */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <button type="button" onClick={() => moveUp(s, idx)} disabled={idx === 0}
                    style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer', color: 'var(--muted)', fontSize: 10, padding: '0 2px', lineHeight: 1, opacity: idx === 0 ? 0.3 : 1 }}>
                    ▲
                  </button>
                  <button type="button" onClick={() => moveDown(s, idx)} disabled={idx === statuses.length - 1}
                    style={{ background: 'none', border: 'none', cursor: idx === statuses.length - 1 ? 'not-allowed' : 'pointer', color: 'var(--muted)', fontSize: 10, padding: '0 2px', lineHeight: 1, opacity: idx === statuses.length - 1 ? 0.3 : 1 }}>
                    ▼
                  </button>
                </div>

                {/* Nombre + chip */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    color: s.color, background: `${s.color}22`, border: `1px solid ${s.color}55`,
                  }}>
                    {s.name}
                  </span>
                </div>

                {/* Editar */}
                <button type="button" onClick={() => openEditForm(s)}
                  style={{ padding: '3px 10px', borderRadius: 5, border: '1px solid var(--border2)', background: 'var(--hover)', color: 'var(--text2)', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Editar
                </button>

                {/* Toggle */}
                <button type="button" onClick={() => handleToggle(s.id, !s.is_active)} disabled={togglingId === s.id}
                  style={{ padding: '3px 10px', borderRadius: 5, border: `1px solid ${isInactive ? 'rgba(59,130,246,0.3)' : 'rgba(16,185,129,0.3)'}`, background: isInactive ? 'rgba(59,130,246,0.08)' : 'rgba(16,185,129,0.08)', color: isInactive ? 'var(--blue)' : '#10b981', fontSize: 11, cursor: togglingId === s.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: togglingId === s.id ? 0.5 : 1 }}>
                  {togglingId === s.id ? '…' : isInactive ? 'Activar' : 'Activo'}
                </button>

                {/* Eliminar */}
                {canDelete && (
                  <button type="button" onClick={() => handleDelete(s.id)} disabled={deletingId === s.id}
                    style={{ padding: '3px 8px', borderRadius: 5, border: '1px solid rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.06)', color: 'var(--red)', fontSize: 11, cursor: deletingId === s.id ? 'not-allowed' : 'pointer', opacity: deletingId === s.id ? 0.5 : 1 }}>
                    {deletingId === s.id ? '…' : 'Eliminar'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <p style={{ fontSize: 11, color: 'var(--muted)' }}>
        Los estados configurados aquí aparecen al registrar una venta y en los filtros del historial.
      </p>
    </div>
  )
}
