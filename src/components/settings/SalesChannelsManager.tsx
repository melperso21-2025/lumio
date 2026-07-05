'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Channel {
  id: string
  name: string
  type: string | null
  platform: string | null
  is_digital: boolean | null
  commission_pct: number | null
  is_active: boolean | null
}

const CHANNEL_TYPES = ['directo', 'marketplace', 'distribuidor', 'mayorista', 'retail', 'otro']
const PLATFORMS     = ['Instagram', 'Facebook', 'WhatsApp', 'TikTok', 'Shopify', 'WooCommerce', 'Amazon', 'MercadoLibre', 'Otro']

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

function ChannelRow({
  channel,
  canDelete,
  onToggle,
  onDelete,
  togglingId,
  deletingId,
}: {
  channel: Channel
  canDelete: boolean
  onToggle: (id: string, active: boolean) => void
  onDelete: (id: string) => void
  togglingId: string | null
  deletingId: string | null
}) {
  const isInactive = channel.is_active === false

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto auto auto',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: isInactive ? 'transparent' : 'var(--bg)',
        opacity: isInactive ? 0.55 : 1,
        marginBottom: 6,
      }}
    >
      {/* Name + badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {channel.name}
        </span>
        {channel.type && (
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', padding: '2px 7px', borderRadius: 20, background: 'rgba(245,200,66,0.15)', color: 'var(--gold)', flexShrink: 0 }}>
            {channel.type}
          </span>
        )}
        {channel.is_digital && (
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', padding: '2px 7px', borderRadius: 20, background: 'rgba(59,130,246,0.12)', color: 'var(--blue)', flexShrink: 0 }}>
            digital
          </span>
        )}
      </div>

      {/* Platform */}
      <span style={{ fontSize: 11, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
        {channel.platform ?? '—'}
      </span>

      {/* Commission */}
      <span style={{ fontSize: 11, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
        {channel.commission_pct != null ? `${channel.commission_pct}%` : '—'}
      </span>

      {/* Toggle active */}
      <button
        type="button"
        onClick={() => onToggle(channel.id, !channel.is_active)}
        disabled={togglingId === channel.id}
        style={{
          padding: '3px 10px',
          borderRadius: 5,
          border: `1px solid ${isInactive ? 'rgba(59,130,246,0.3)' : 'rgba(16,185,129,0.3)'}`,
          background: isInactive ? 'rgba(59,130,246,0.08)' : 'rgba(16,185,129,0.08)',
          color: isInactive ? 'var(--blue)' : '#10b981',
          fontSize: 11,
          cursor: togglingId === channel.id ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
          opacity: togglingId === channel.id ? 0.5 : 1,
        }}
      >
        {togglingId === channel.id ? '…' : isInactive ? 'Activar' : 'Activo'}
      </button>

      {/* Delete */}
      {canDelete && (
        <button
          type="button"
          onClick={() => onDelete(channel.id)}
          disabled={deletingId === channel.id}
          style={{
            padding: '3px 8px',
            borderRadius: 5,
            border: '1px solid rgba(220,38,38,0.3)',
            background: 'rgba(220,38,38,0.06)',
            color: 'var(--red, #F87171)',
            fontSize: 11,
            cursor: deletingId === channel.id ? 'not-allowed' : 'pointer',
            opacity: deletingId === channel.id ? 0.5 : 1,
          }}
        >
          {deletingId === channel.id ? '…' : 'Eliminar'}
        </button>
      )}
    </div>
  )
}

interface SalesChannelsManagerProps {
  companyId: string
  canDelete: boolean
}

export default function SalesChannelsManager({ companyId, canDelete }: SalesChannelsManagerProps) {
  const supabase = createClient()

  const [channels, setChannels]     = useState<Channel[]>([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form fields
  const [name, setName]             = useState('')
  const [type, setType]             = useState('')
  const [platform, setPlatform]     = useState('')
  const [isDigital, setIsDigital]   = useState(false)
  const [commission, setCommission] = useState('')

  async function fetchChannels() {
    setLoading(true)
    const { data } = await supabase
      .from('sales_channels')
      .select('id, name, type, platform, is_digital, commission_pct, is_active')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name')
    setChannels((data as Channel[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchChannels() }, [companyId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('El nombre es obligatorio.'); return }
    setSaving(true); setError(null)

    const commissionVal = commission !== '' ? parseFloat(commission) : null
    if (commissionVal !== null && (isNaN(commissionVal) || commissionVal < 0 || commissionVal > 100)) {
      setError('La comisión debe ser un porcentaje entre 0 y 100.')
      setSaving(false)
      return
    }

    const { error: insertErr } = await supabase.from('sales_channels').insert({
      company_id: companyId,
      name: name.trim(),
      type: type || null,
      platform: platform || null,
      is_digital: isDigital,
      commission_pct: commissionVal,
      is_active: true,
    })

    if (insertErr) { setError(insertErr.message); setSaving(false); return }

    setName(''); setType(''); setPlatform(''); setIsDigital(false); setCommission('')
    setShowForm(false); setSaving(false)
    fetchChannels()
  }

  async function handleToggle(id: string, active: boolean) {
    setTogglingId(id)
    await supabase.from('sales_channels').update({ is_active: active }).eq('id', id)
    setTogglingId(null)
    fetchChannels()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este canal? Si tiene ventas asociadas, se perderá la relación.')) return
    setDeletingId(id)
    await supabase.from('sales_channels').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    setDeletingId(null)
    fetchChannels()
  }

  const active   = channels.filter((c) => c.is_active !== false)
  const inactive = channels.filter((c) => c.is_active === false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 className="font-syne font-bold" style={{ fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>
            Canales de venta
          </h3>
          <p style={{ fontSize: 11, color: 'var(--muted)' }}>
            {loading ? '…' : `${active.length} activo${active.length !== 1 ? 's' : ''}${inactive.length > 0 ? ` · ${inactive.length} inactivo${inactive.length !== 1 ? 's' : ''}` : ''}`}
          </p>
        </div>
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
          {showForm ? 'Cancelar' : '+ Nuevo canal'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: '14px 16px',
            background: 'var(--bg)',
            borderRadius: 8,
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Nombre *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Instagram Orgánico"
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
                autoFocus
              />
            </div>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                <option value="">— Sin tipo —</option>
                {CHANNEL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Plataforma</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                <option value="">— Sin plataforma —</option>
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
            <div>
              <label style={labelStyle}>Comisión (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                placeholder="Ej: 15"
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 2 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={isDigital}
                  onChange={(e) => setIsDigital(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: 'var(--gold)' }}
                />
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>Canal digital</span>
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="font-syne font-bold"
              style={{
                padding: '7px 18px',
                borderRadius: 7,
                fontSize: 13,
                background: saving ? 'rgba(232,165,0,0.5)' : 'linear-gradient(135deg, #F5C842, #F09A1A)',
                color: '#1A1B2E',
                border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>

          {error && <p style={{ fontSize: 12, color: 'var(--red)', margin: 0 }}>{error}</p>}
        </form>
      )}

      {/* Column headers */}
      {!loading && channels.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: 10, padding: '0 12px' }}>
          {['Canal', 'Plataforma', 'Comisión', 'Estado', ...(canDelete ? [''] : [])].map((h) => (
            <span key={h} style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)' }}>
              {h}
            </span>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>Cargando…</p>
      ) : channels.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--muted)', padding: '8px 0' }}>
          No hay canales configurados. Agrega el primero.
        </p>
      ) : (
        <div>
          {channels.map((c) => (
            <ChannelRow
              key={c.id}
              channel={c}
              canDelete={canDelete}
              onToggle={handleToggle}
              onDelete={handleDelete}
              togglingId={togglingId}
              deletingId={deletingId}
            />
          ))}
        </div>
      )}

      {!canDelete && channels.length > 0 && (
        <p style={{ fontSize: 11, color: 'var(--muted)' }}>
          Solo los administradores pueden eliminar canales.
        </p>
      )}
    </div>
  )
}
