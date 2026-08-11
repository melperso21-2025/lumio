'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/UserContext'

// ── Types ──────────────────────────────────────────────────────────────────

interface CatalogItem {
  id: string
  name: string
  color: string
  is_active: boolean
}

// ── Styles ─────────────────────────────────────────────────────────────────

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

const PRESET_COLORS = [
  '#6B7280', '#3B82F6', '#10B981', '#F59E0B',
  '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6',
]

function onFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = 'var(--gold)'
  e.target.style.boxShadow = '0 0 0 3px var(--gold-bg)'
}
function onBlur(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = 'var(--border2)'
  e.target.style.boxShadow = 'none'
}

// ── CatalogSection ─────────────────────────────────────────────────────────

function CatalogSection({
  title,
  table,
  companyId,
  canDelete,
}: {
  title: string
  table: 'customer_types' | 'customer_labels'
  companyId: string
  canDelete: boolean
}) {
  const supabase = createClient()
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6B7280')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function fetchItems() {
    setLoading(true)
    const { data } = await supabase
      .from(table)
      .select('id, name, color, is_active')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name', { ascending: true })
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, table])

  function openAddForm() {
    setEditingItem(null)
    setName('')
    setColor('#6B7280')
    setError(null)
    setShowForm(true)
  }

  function openEditForm(item: CatalogItem) {
    setEditingItem(item)
    setName(item.name)
    setColor(item.color)
    setError(null)
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingItem(null)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('El nombre es obligatorio.'); return }
    setSaving(true)
    setError(null)

    const payload = { name: name.trim(), color: color || '#6B7280' }

    if (editingItem) {
      const { error: upErr } = await supabase.from(table).update(payload).eq('id', editingItem.id)
      if (upErr) { setError(upErr.message); setSaving(false); return }
    } else {
      const { error: insErr } = await supabase.from(table).insert({
        ...payload, company_id: companyId, is_active: true,
      })
      if (insErr) { setError(insErr.message); setSaving(false); return }
    }

    setSaving(false)
    cancelForm()
    fetchItems()
  }

  async function handleToggle(id: string, active: boolean) {
    setTogglingId(id)
    await supabase.from(table).update({ is_active: active }).eq('id', id)
    setTogglingId(null)
    fetchItems()
  }

  async function handleDelete(id: string) {
    if (!confirm(`¿Eliminar este ${title.toLowerCase()}? Esta acción no se puede deshacer.`)) return
    setDeletingId(id)
    await supabase.from(table).update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', id)
    setDeletingId(null)
    fetchItems()
  }

  const activeCount = items.filter((i) => i.is_active).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <h3 className="font-syne font-bold" style={{ fontSize: 14, color: 'var(--text)', margin: '0 0 2px' }}>
            {title}
          </h3>
          <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
            {loading ? '…' : `${activeCount} activo${activeCount !== 1 ? 's' : ''} · ${items.length} total`}
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={openAddForm}
            className="font-syne font-bold text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #F5C842, #F09A1A)', color: '#1A1B2E', border: 'none', whiteSpace: 'nowrap' }}
          >
            + Agregar
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
            {editingItem ? `Editar ${title.toLowerCase()}` : `Nuevo ${title.toLowerCase()}`}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'flex-end' }}>
            <div>
              <label style={labelStyle}>Nombre *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Ej: ${title === 'Tipos de cliente' ? 'Premium, Mayorista…' : 'VIP, Recurrente…'}`}
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
                autoFocus
              />
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
                    width: 26, height: 26, borderRadius: 6, background: c,
                    border: color === c ? '2px solid var(--text)' : '2px solid transparent',
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
              {name || title}
            </span>
          </div>

          {error && <p style={{ fontSize: 12, color: 'var(--red)', margin: 0 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={cancelForm}
              style={{ flex: 1, padding: '7px 14px', borderRadius: 7, fontSize: 13, background: 'var(--hover)', color: 'var(--text2)', border: '1px solid var(--border)', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="font-syne font-bold"
              style={{ flex: 1, padding: '7px 18px', borderRadius: 7, fontSize: 13, background: saving ? 'rgba(232,165,0,0.5)' : 'linear-gradient(135deg, #F5C842, #F09A1A)', color: '#1A1B2E', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}
            >
              {saving ? 'Guardando…' : editingItem ? 'Guardar cambios' : 'Crear'}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>Cargando…</p>
      ) : items.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, padding: '12px 0', textAlign: 'center' }}>
          Aún no hay {title.toLowerCase()}. Agrega el primero.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((item) => {
            const isInactive = !item.is_active
            return (
              <div
                key={item.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto auto',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: isInactive ? 'transparent' : 'var(--bg)',
                  opacity: isInactive ? 0.55 : 1,
                }}
              >
                {/* Nombre + chip color */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    color: item.color, background: `${item.color}22`, border: `1px solid ${item.color}55`,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {item.name}
                  </span>
                  {isInactive && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--hover)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
                      Inactivo
                    </span>
                  )}
                </div>

                {/* Editar */}
                <button
                  type="button"
                  onClick={() => openEditForm(item)}
                  style={{ padding: '3px 10px', borderRadius: 5, border: '1px solid var(--border2)', background: 'var(--hover)', color: 'var(--text2)', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Editar
                </button>

                {/* Toggle activo/inactivo */}
                <button
                  type="button"
                  onClick={() => handleToggle(item.id, !item.is_active)}
                  disabled={togglingId === item.id}
                  style={{
                    padding: '3px 10px', borderRadius: 5, fontSize: 11, cursor: togglingId === item.id ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap', opacity: togglingId === item.id ? 0.5 : 1,
                    border: isInactive ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(16,185,129,0.3)',
                    background: isInactive ? 'rgba(59,130,246,0.08)' : 'rgba(16,185,129,0.08)',
                    color: isInactive ? 'var(--blue)' : '#10b981',
                  }}
                >
                  {togglingId === item.id ? '…' : isInactive ? 'Activar' : 'Activo'}
                </button>

                {/* Eliminar */}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    style={{
                      padding: '3px 8px', borderRadius: 5, border: '1px solid rgba(220,38,38,0.3)',
                      background: 'rgba(220,38,38,0.06)', color: 'var(--red)', fontSize: 11,
                      cursor: deletingId === item.id ? 'not-allowed' : 'pointer', opacity: deletingId === item.id ? 0.5 : 1,
                    }}
                  >
                    {deletingId === item.id ? '…' : 'Eliminar'}
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

// ── Main Component ─────────────────────────────────────────────────────────

interface CustomerCatalogsManagerProps {
  companyId: string
  userRole: string
}

export default function CustomerCatalogsManager({
  companyId,
  userRole,
}: CustomerCatalogsManagerProps) {
  const { userRole: ctxRole } = useUser()
  const role = userRole || ctxRole
  const canDelete = role === 'admin'

  const [activeTab, setActiveTab] = useState<'types' | 'labels'>('types')

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '7px 16px',
    borderRadius: 7,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    background: active ? 'var(--gold-bg)' : 'transparent',
    color: active ? 'var(--gold)' : 'var(--text2)',
    transition: 'background 0.15s, color 0.15s',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Tabs */}
      <div
        style={{
          display: 'flex', gap: 4, padding: 4,
          background: 'var(--bg)', borderRadius: 9,
          border: '1px solid var(--border)', alignSelf: 'flex-start',
        }}
      >
        <button type="button" aria-pressed={activeTab === 'types'} onClick={() => setActiveTab('types')} style={tabStyle(activeTab === 'types')}>
          Tipos de cliente
        </button>
        <button type="button" aria-pressed={activeTab === 'labels'} onClick={() => setActiveTab('labels')} style={tabStyle(activeTab === 'labels')}>
          Etiquetas
        </button>
      </div>

      {/* Content */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
        {activeTab === 'types' ? (
          <CatalogSection
            title="Tipos de cliente"
            table="customer_types"
            companyId={companyId}
            canDelete={canDelete}
          />
        ) : (
          <CatalogSection
            title="Etiquetas"
            table="customer_labels"
            companyId={companyId}
            canDelete={canDelete}
          />
        )}
      </div>

      {!canDelete && (
        <p style={{ fontSize: 11, color: 'var(--muted)' }}>
          Solo los administradores pueden eliminar tipos y etiquetas.
        </p>
      )}
    </div>
  )
}
