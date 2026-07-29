'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Branch {
  id: string
  name: string
  type: string | null
  address: string | null
  phone: string | null
  is_active: boolean
}

const BRANCH_TYPES = ['principal', 'sucursal', 'bodega', 'punto_venta']
const BRANCH_TYPE_LABELS: Record<string, string> = {
  principal: 'Principal',
  sucursal: 'Sucursal',
  bodega: 'Bodega',
  punto_venta: 'Punto de venta',
}

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

function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = 'var(--gold)'
  e.target.style.boxShadow = '0 0 0 3px var(--gold-bg)'
}
function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = 'var(--border2)'
  e.target.style.boxShadow = 'none'
}

interface BranchesManagerProps {
  companyId: string
  canDelete: boolean
}

export default function BranchesManager({ companyId, canDelete }: BranchesManagerProps) {
  const supabase = createClient()

  const [branches, setBranches]     = useState<Branch[]>([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form fields
  const [name, setName]       = useState('')
  const [type, setType]       = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone]     = useState('')

  async function fetchBranches() {
    setLoading(true)
    const { data } = await supabase
      .from('branches')
      .select('id, name, type, address, phone, is_active')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name')
    setBranches((data as Branch[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchBranches() }, [companyId]) // eslint-disable-line react-hooks/exhaustive-deps

  function openAddForm() {
    setEditingBranch(null)
    setName(''); setType(''); setAddress(''); setPhone('')
    setError(null)
    setShowForm(true)
  }

  function openEditForm(b: Branch) {
    setEditingBranch(b)
    setName(b.name)
    setType(b.type ?? '')
    setAddress(b.address ?? '')
    setPhone(b.phone ?? '')
    setError(null)
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingBranch(null)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('El nombre es obligatorio.'); return }
    setSaving(true); setError(null)

    const payload = {
      company_id: companyId,
      name: name.trim(),
      type: type || null,
      address: address.trim() || null,
      phone: phone.trim() || null,
    }

    if (editingBranch) {
      const { error: upErr } = await supabase.from('branches').update(payload).eq('id', editingBranch.id)
      if (upErr) { setError(upErr.message); setSaving(false); return }
    } else {
      const { error: insErr } = await supabase.from('branches').insert({ ...payload, is_active: true })
      if (insErr) { setError(insErr.message); setSaving(false); return }
    }

    setSaving(false)
    cancelForm()
    fetchBranches()
  }

  async function handleToggle(id: string, active: boolean) {
    setTogglingId(id)
    await supabase.from('branches').update({ is_active: active }).eq('id', id)
    setTogglingId(null)
    fetchBranches()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta sucursal?')) return
    setDeletingId(id)
    await supabase.from('branches').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    setDeletingId(null)
    fetchBranches()
  }

  const active   = branches.filter((b) => b.is_active)
  const inactive = branches.filter((b) => !b.is_active)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 className="font-syne font-bold" style={{ fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>
            Sucursales
          </h3>
          <p style={{ fontSize: 11, color: 'var(--muted)' }}>
            {loading ? '…' : `${active.length} activa${active.length !== 1 ? 's' : ''}${inactive.length > 0 ? ` · ${inactive.length} inactiva${inactive.length !== 1 ? 's' : ''}` : ''}`}
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={openAddForm}
            className="font-syne font-bold text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #F5C842, #F09A1A)', color: '#1A1B2E', border: 'none' }}
          >
            + Nueva sucursal
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
            {editingBranch ? 'Editar sucursal' : 'Nueva sucursal'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Nombre *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Sucursal Norte" style={inputStyle} onFocus={onFocus} onBlur={onBlur} autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                <option value="">— Sin tipo —</option>
                {BRANCH_TYPES.map((t) => <option key={t} value={t}>{BRANCH_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Dirección</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Av. Principal 123" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label style={labelStyle}>Teléfono</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="099 000 0000" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>

          {error && <p style={{ fontSize: 12, color: 'var(--red)', margin: 0 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={cancelForm} style={{ flex: 1, padding: '7px 14px', borderRadius: 7, fontSize: 13, background: 'var(--hover)', color: 'var(--text2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="font-syne font-bold"
              style={{ flex: 1, padding: '7px 18px', borderRadius: 7, fontSize: 13, background: saving ? 'rgba(232,165,0,0.5)' : 'linear-gradient(135deg, #F5C842, #F09A1A)', color: '#1A1B2E', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Guardando…' : editingBranch ? 'Guardar cambios' : 'Crear sucursal'}
            </button>
          </div>
        </form>
      )}

      {/* Lista */}
      {loading ? (
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>Cargando…</p>
      ) : branches.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--muted)', padding: '8px 0' }}>No hay sucursales configuradas. Agrega la primera.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {branches.map((b) => {
            const isInactive = !b.is_active
            return (
              <div
                key={b.id}
                style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: isInactive ? 'transparent' : 'var(--bg)', opacity: isInactive ? 0.55 : 1 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.name}
                  </span>
                  {b.type && (
                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', padding: '2px 7px', borderRadius: 20, background: 'rgba(245,200,66,0.15)', color: 'var(--gold)', flexShrink: 0 }}>
                      {BRANCH_TYPE_LABELS[b.type] ?? b.type}
                    </span>
                  )}
                  {b.address && <span style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.address}</span>}
                </div>

                <span style={{ fontSize: 11, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                  {b.phone ?? '—'}
                </span>

                {/* Editar */}
                <button type="button" onClick={() => openEditForm(b)}
                  style={{ padding: '3px 10px', borderRadius: 5, border: '1px solid var(--border2)', background: 'var(--hover)', color: 'var(--text2)', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Editar
                </button>

                {/* Toggle activo */}
                <button type="button" onClick={() => handleToggle(b.id, !b.is_active)} disabled={togglingId === b.id}
                  style={{ padding: '3px 10px', borderRadius: 5, border: `1px solid ${isInactive ? 'rgba(59,130,246,0.3)' : 'rgba(16,185,129,0.3)'}`, background: isInactive ? 'rgba(59,130,246,0.08)' : 'rgba(16,185,129,0.08)', color: isInactive ? 'var(--blue)' : '#10b981', fontSize: 11, cursor: togglingId === b.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: togglingId === b.id ? 0.5 : 1 }}>
                  {togglingId === b.id ? '…' : isInactive ? 'Activar' : 'Activo'}
                </button>

                {/* Eliminar */}
                {canDelete && (
                  <button type="button" onClick={() => handleDelete(b.id)} disabled={deletingId === b.id}
                    style={{ padding: '3px 8px', borderRadius: 5, border: '1px solid rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.06)', color: 'var(--red)', fontSize: 11, cursor: deletingId === b.id ? 'not-allowed' : 'pointer', opacity: deletingId === b.id ? 0.5 : 1 }}>
                    {deletingId === b.id ? '…' : 'Eliminar'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
