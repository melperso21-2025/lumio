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

// ── Shared styles ──────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border2)',
  color: 'var(--text)',
  fontFamily: 'var(--font-jakarta)',
  padding: '7px 11px',
  borderRadius: 7,
  fontSize: 13,
  outline: 'none',
  flex: 1,
  minWidth: 0,
}

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
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#888780')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function fetchItems() {
    setLoading(true)
    const { data } = await supabase
      .from(table)
      .select('id, name, color, is_active')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('name', { ascending: true })
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    setSaving(true)
    setError(null)
    const { error: insertErr } = await supabase.from(table).insert({
      company_id: companyId,
      name: newName.trim(),
      color: newColor,
      is_active: true,
    })
    if (insertErr) {
      setError(insertErr.message)
      setSaving(false)
      return
    }
    setNewName('')
    setNewColor('#888780')
    setShowForm(false)
    setSaving(false)
    fetchItems()
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const now = new Date().toISOString()
    await supabase
      .from(table)
      .update({ deleted_at: now, is_active: false })
      .eq('id', id)
    setDeletingId(null)
    fetchItems()
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <h3
          className="font-syne font-bold"
          style={{ fontSize: 14, color: 'var(--text)' }}
        >
          {title}
        </h3>
        <button
          type="button"
          onClick={() => {
            setShowForm((p) => !p)
            setError(null)
          }}
          className="font-syne font-bold text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
          style={{
            background: showForm
              ? 'var(--hover)'
              : 'linear-gradient(135deg, #F5C842, #F09A1A)',
            color: showForm ? 'var(--text2)' : '#1A1B2E',
            border: showForm ? '1px solid var(--border2)' : 'none',
          }}
        >
          {showForm ? 'Cancelar' : '+ Agregar'}
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'flex-end',
            marginBottom: 12,
            padding: '10px 12px',
            background: 'var(--bg)',
            borderRadius: 8,
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <label
              style={{
                display: 'block',
                fontSize: 9,
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Nombre
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej: Premium"
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
              autoFocus
            />
          </div>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 9,
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Color
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                style={{
                  width: 36,
                  height: 34,
                  border: '1px solid var(--border2)',
                  borderRadius: 7,
                  background: 'var(--surface)',
                  cursor: 'pointer',
                  padding: 2,
                }}
              />
              <input
                type="text"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                placeholder="#888780"
                style={{ ...inputStyle, width: 88, flex: 'none' }}
                onFocus={onFocus}
                onBlur={onBlur}
                maxLength={7}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="font-syne font-bold"
            style={{
              padding: '7px 14px',
              borderRadius: 7,
              fontSize: 13,
              background: saving
                ? 'rgba(232,165,0,0.5)'
                : 'linear-gradient(135deg, #F5C842, #F09A1A)',
              color: '#1A1B2E',
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              alignSelf: 'flex-end',
            }}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </form>
      )}

      {error && (
        <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>
          {error}
        </p>
      )}

      {/* List */}
      {loading ? (
        <p style={{ fontSize: 12, color: 'var(--muted)', padding: '8px 0' }}>
          Cargando…
        </p>
      ) : items.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--muted)', padding: '8px 0' }}>
          No hay {title.toLowerCase()} configurados. Agrega el primero.
        </p>
      ) : (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 7,
                border: '1px solid var(--border)',
                background: 'var(--bg)',
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: item.color,
                  flexShrink: 0,
                  border: '1px solid rgba(0,0,0,0.15)',
                }}
              />
              <span
                style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}
              >
                {item.name}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--muted)',
                  fontFamily: 'monospace',
                }}
              >
                {item.color}
              </span>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 5,
                    border: '1px solid rgba(220,38,38,0.3)',
                    background: 'rgba(220,38,38,0.06)',
                    color: 'var(--red, #F87171)',
                    fontSize: 11,
                    cursor: deletingId === item.id ? 'not-allowed' : 'pointer',
                    opacity: deletingId === item.id ? 0.5 : 1,
                    flexShrink: 0,
                  }}
                >
                  {deletingId === item.id ? '…' : 'Eliminar'}
                </button>
              )}
            </div>
          ))}
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
          display: 'flex',
          gap: 4,
          padding: 4,
          background: 'var(--bg)',
          borderRadius: 9,
          border: '1px solid var(--border)',
          alignSelf: 'flex-start',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('types')}
          style={tabStyle(activeTab === 'types')}
        >
          Tipos de cliente
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('labels')}
          style={tabStyle(activeTab === 'labels')}
        >
          Etiquetas
        </button>
      </div>

      {/* Content */}
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '16px 18px',
        }}
      >
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
