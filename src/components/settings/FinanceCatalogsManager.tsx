'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/UserContext'

// ── Types ──────────────────────────────────────────────────────────────────

type TxCategoryType = 'income' | 'expense' | 'both'

interface TxCategory {
  id: string
  name: string
  type: TxCategoryType
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
  flex: 1,
  minWidth: 0,
}

function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = 'var(--gold)'
  e.target.style.boxShadow = '0 0 0 3px var(--gold-bg)'
}
function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = 'var(--border2)'
  e.target.style.boxShadow = 'none'
}

const TYPE_LABELS: Record<TxCategoryType, string> = {
  income:  'Ingreso',
  expense: 'Egreso',
  both:    'Ambos',
}

const TYPE_COLORS: Record<TxCategoryType, { bg: string; color: string }> = {
  income:  { bg: 'rgba(5,150,105,0.1)',   color: 'var(--green)' },
  expense: { bg: 'rgba(220,38,38,0.08)',  color: 'var(--red)'   },
  both:    { bg: 'rgba(217,119,6,0.08)',  color: 'var(--orange)' },
}

// ── Main component ──────────────────────────────────────────────────────────

export default function FinanceCatalogsManager({ companyId }: { companyId: string }) {
  const { userRole } = useUser()
  const canDelete = userRole === 'admin'
  const supabase = createClient()

  const [categories, setCategories] = useState<TxCategory[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName]   = useState('')
  const [newType, setNewType]   = useState<TxCategoryType>('both')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function fetchCategories() {
    setLoading(true)
    const { data } = await supabase
      .from('bank_transaction_categories')
      .select('id, name, type, is_active')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name', { ascending: true })
    setCategories((data ?? []) as TxCategory[])
    setLoading(false)
  }

  useEffect(() => { fetchCategories() }, [companyId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd() {
    const trimmed = newName.trim()
    if (!trimmed) { setError('El nombre es obligatorio.'); return }
    setSaving(true)
    setError(null)
    const { error: e } = await supabase.from('bank_transaction_categories').insert({
      company_id: companyId,
      name:       trimmed,
      type:       newType,
      is_active:  true,
    })
    setSaving(false)
    if (e) { setError(e.message); return }
    setNewName('')
    setNewType('both')
    setShowForm(false)
    fetchCategories()
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await supabase
      .from('bank_transaction_categories')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    setDeletingId(null)
    fetchCategories()
  }

  // ── Render ──────────────────────────────────────────────────────────────

  const sectionStyle: React.CSSProperties = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '14px 16px',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h2 className="font-syne font-bold" style={{ fontSize: 15, color: 'var(--text)', margin: '0 0 3px' }}>
            Categorías de transacciones
          </h2>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
            Usadas en Bancos y en importaciones de transacciones.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm((v) => !v); setError(null) }}
          style={{
            padding: '7px 14px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            background: showForm ? 'var(--hover)' : 'linear-gradient(135deg,#F5C842,#F09A1A)',
            color: showForm ? 'var(--text2)' : '#1A1B2E',
            border: showForm ? '1px solid var(--border)' : 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-syne)',
          }}
        >
          {showForm ? '✕ Cancelar' : '+ Agregar categoría'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ ...sectionStyle, background: 'var(--bg)' }}>
          {error && (
            <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10 }}>{error}</p>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onFocus={onFocus}
              onBlur={onBlur}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
              placeholder="Nombre de la categoría"
              style={{ ...inputStyle, minWidth: 180 }}
              autoFocus
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as TxCategoryType)}
              onFocus={onFocus}
              onBlur={onBlur}
              style={{ ...inputStyle, flex: '0 0 auto', width: 120 }}
            >
              <option value="income">Ingreso</option>
              <option value="expense">Egreso</option>
              <option value="both">Ambos</option>
            </select>
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving}
              style={{
                padding: '7px 16px',
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 700,
                background: saving ? 'rgba(232,165,0,0.4)' : 'linear-gradient(135deg,#F5C842,#F09A1A)',
                color: '#1A1B2E',
                border: 'none',
                cursor: saving ? 'wait' : 'pointer',
                fontFamily: 'var(--font-syne)',
                whiteSpace: 'nowrap',
              }}
            >
              {saving ? 'Guardando…' : 'Agregar'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div style={sectionStyle}>
        {loading ? (
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>Cargando…</p>
        ) : categories.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, textAlign: 'center', padding: '12px 0' }}>
            Aún no hay categorías. Agrega la primera.
          </p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 1 }}>
            {categories.map((cat) => {
              const colors = TYPE_COLORS[cat.type] ?? TYPE_COLORS.both
              return (
                <li
                  key={cat.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '7px 8px',
                    borderRadius: 6,
                    background: 'transparent',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cat.name}
                    </span>
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 5,
                      background: colors.bg,
                      color: colors.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      flexShrink: 0,
                    }}>
                      {TYPE_LABELS[cat.type]}
                    </span>
                  </div>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(cat.id)}
                      disabled={deletingId === cat.id}
                      style={{
                        flexShrink: 0,
                        padding: '3px 9px',
                        borderRadius: 5,
                        fontSize: 11,
                        fontWeight: 500,
                        background: 'rgba(220,38,38,0.07)',
                        color: 'var(--red)',
                        border: '1px solid rgba(220,38,38,0.2)',
                        cursor: deletingId === cat.id ? 'wait' : 'pointer',
                        opacity: deletingId === cat.id ? 0.5 : 1,
                      }}
                    >
                      {deletingId === cat.id ? '…' : 'Eliminar'}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
