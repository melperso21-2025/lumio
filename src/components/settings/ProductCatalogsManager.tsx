'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Types ──────────────────────────────────────────────────────────────────

interface CategoryItem {
  id: string
  name: string
  slug: string
  parent_id: string | null
  children?: CategoryItem[]
}

// ── Helpers ────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function buildTree(flat: CategoryItem[]): CategoryItem[] {
  const map = new Map<string, CategoryItem>()
  flat.forEach((c) => map.set(c.id, { ...c, children: [] }))
  const roots: CategoryItem[] = []
  map.forEach((item) => {
    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id)!.children!.push(item)
    } else {
      roots.push(item)
    }
  })
  return roots
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

// ── CategoryRow ────────────────────────────────────────────────────────────

function CategoryRow({
  item,
  depth,
  canDelete,
  onDelete,
  deletingId,
}: {
  item: CategoryItem
  depth: number
  canDelete: boolean
  onDelete: (id: string) => void
  deletingId: string | null
}) {
  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 10px',
          marginLeft: depth * 20,
          borderRadius: 7,
          border: '1px solid var(--border)',
          background: 'var(--bg)',
          marginBottom: 4,
        }}
      >
        {depth > 0 && (
          <span style={{ fontSize: 12, color: 'var(--border2)', flexShrink: 0 }}>└</span>
        )}
        <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{item.name}</span>
        <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'monospace' }}>
          {item.slug}
        </span>
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(item.id)}
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
      {item.children?.map((child) => (
        <CategoryRow
          key={child.id}
          item={child}
          depth={depth + 1}
          canDelete={canDelete}
          onDelete={onDelete}
          deletingId={deletingId}
        />
      ))}
    </>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

interface ProductCatalogsManagerProps {
  companyId: string
  canDelete: boolean
}

export default function ProductCatalogsManager({
  companyId,
  canDelete,
}: ProductCatalogsManagerProps) {
  const supabase = createClient()

  const [flat, setFlat] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newParentId, setNewParentId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Auto-generate slug from name
  const autoSlug = slugify(newName)

  async function fetchCategories() {
    setLoading(true)
    const { data } = await supabase
      .from('product_categories')
      .select('id, name, slug, parent_id')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name', { ascending: true })
    setFlat((data as CategoryItem[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) { setError('El nombre es obligatorio.'); return }
    setSaving(true); setError(null)

    const { error: insertErr } = await supabase.from('product_categories').insert({
      company_id: companyId,
      name: newName.trim(),
      slug: autoSlug || slugify(newName.trim()),
      parent_id: newParentId || null,
    })

    if (insertErr) { setError(insertErr.message); setSaving(false); return }
    setNewName(''); setNewParentId(''); setShowForm(false); setSaving(false)
    fetchCategories()
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await supabase
      .from('product_categories')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    setDeletingId(null)
    fetchCategories()
  }

  const tree = buildTree(flat)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="font-syne font-bold" style={{ fontSize: 14, color: 'var(--text)' }}>
          Categorías de productos
        </h3>
        <button
          type="button"
          onClick={() => { setShowForm((p) => !p); setError(null) }}
          className="font-syne font-bold text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
          style={{
            background: showForm ? 'var(--hover)' : 'linear-gradient(135deg, #F5C842, #F09A1A)',
            color: showForm ? 'var(--text2)' : '#1A1B2E',
            border: showForm ? '1px solid var(--border2)' : 'none',
          }}
        >
          {showForm ? 'Cancelar' : '+ Agregar categoría'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr auto',
            gap: 10,
            alignItems: 'flex-end',
            padding: '12px 14px',
            background: 'var(--bg)',
            borderRadius: 8,
            border: '1px solid var(--border)',
          }}
        >
          <div>
            <label style={labelStyle}>Nombre *</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej: Bebidas"
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
              autoFocus
            />
            {newName && (
              <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
                slug: <em>{autoSlug}</em>
              </p>
            )}
          </div>
          <div>
            <label style={labelStyle}>Categoría padre (opcional)</label>
            <select
              value={newParentId}
              onChange={(e) => setNewParentId(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
              onFocus={onFocus}
              onBlur={onBlur}
            >
              <option value="">— Sin padre —</option>
              {flat.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="font-syne font-bold"
            style={{
              padding: '7px 14px',
              borderRadius: 7,
              fontSize: 13,
              background: saving ? 'rgba(232,165,0,0.5)' : 'linear-gradient(135deg, #F5C842, #F09A1A)',
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

      {error && <p style={{ fontSize: 12, color: 'var(--red)' }}>{error}</p>}

      {/* Tree */}
      {loading ? (
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>Cargando…</p>
      ) : tree.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--muted)', padding: '8px 0' }}>
          No hay categorías configuradas. Agrega la primera.
        </p>
      ) : (
        <div>
          {tree.map((item) => (
            <CategoryRow
              key={item.id}
              item={item}
              depth={0}
              canDelete={canDelete}
              onDelete={handleDelete}
              deletingId={deletingId}
            />
          ))}
        </div>
      )}

      {!canDelete && flat.length > 0 && (
        <p style={{ fontSize: 11, color: 'var(--muted)' }}>
          Solo los administradores pueden eliminar categorías.
        </p>
      )}
    </div>
  )
}
