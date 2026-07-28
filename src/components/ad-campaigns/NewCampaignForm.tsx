'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AiInsightBox from '@/components/ui/AiInsightBox'
import { toLocalISO } from '@/lib/dateUtils'

type PlatformValue = 'meta' | 'google' | 'tiktok' | 'other'

interface PreviewMetrics {
  roas?: number
  ctr?: number
  effectiveness?: number
}

export default function NewCampaignForm() {
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [campaign_date, setCampaignDate] = useState<string>(toLocalISO(new Date()))
  const [campaign_name, setCampaignName] = useState<string>('')
  const [platform, setPlatform] = useState<PlatformValue>('meta')
  const [creative_name, setCreativeName] = useState<string>('')
  const [spend, setSpend] = useState<string>('')
  const [clicks, setClicks] = useState<string>('0')
  const [impressions, setImpressions] = useState<string>('0')
  const [leads_count, setLeadsCount] = useState<string>('0')
  const [quality_leads, setQualityLeads] = useState<string>('0')
  const [transactions, setTransactions] = useState<string>('0')
  const [attributed_revenue, setAttributedRevenue] = useState<string>('')

  const parsedSpend = parseFloat(spend) || 0
  const parsedClicks = parseInt(clicks || '0', 10) || 0
  const parsedImpressions = parseInt(impressions || '0', 10) || 0
  const parsedLeads = parseInt(leads_count || '0', 10) || 0
  const parsedTransactions = parseInt(transactions || '0', 10) || 0
  const parsedRevenue = parseFloat(attributed_revenue) || 0

  const preview: PreviewMetrics = {
    roas:
      parsedSpend > 0 && parsedRevenue > 0
        ? parsedRevenue / parsedSpend
        : undefined,
    ctr:
      parsedImpressions > 0 && parsedClicks > 0
        ? (parsedClicks / parsedImpressions) * 100
        : undefined,
    effectiveness:
      parsedLeads > 0 && parsedTransactions > 0
        ? (parsedTransactions / parsedLeads) * 100
        : undefined,
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!spend || parsedSpend <= 0) {
      setError('La inversión debe ser un número mayor a 0.')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Sesión expirada. Vuelve a iniciar sesión.')
      setLoading(false)
      return
    }

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

    const { error: insertError } = await supabase.from('ad_campaigns').insert({
      company_id,
      campaign_date,
      campaign_name: campaign_name.trim() || null,
      platform,
      creative_name: creative_name.trim() || null,
      spend: parsedSpend,
      clicks: parsedClicks || null,
      impressions: parsedImpressions || null,
      leads_count: parsedLeads || null,
      quality_leads: parseInt(quality_leads || '0', 10) || null,
      transactions: parsedTransactions || null,
      attributed_revenue: parsedRevenue || null,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    router.refresh()
  }

  function handleClose() {
    if (loading) return
    setOpen(false)
    setError(null)
    setSuccess(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-syne font-bold text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
        style={{
          background: 'linear-gradient(135deg, #F5C842, #F09A1A)',
          color: '#1A1B2E',
        }}
      >
        + Registrar pauta
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Registrar pauta publicitaria"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)',
            padding: 16,
          }}
          onClick={handleClose}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '14px 16px',
              width: '100%',
              maxWidth: 720,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.14)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
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
                style={{ fontSize: 16, color: 'var(--text)' }}
              >
                Registrar pauta
              </h3>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  color: 'var(--muted)',
                  fontSize: 18,
                  lineHeight: 1,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>
          {error && (
            <div style={{ marginBottom: 12 }}>
              <AiInsightBox title="Error al guardar pauta" text={error} variant="red" />
            </div>
          )}
          {success && (
            <div style={{ marginBottom: 12 }}>
              <AiInsightBox
                title="Pauta registrada"
                text="La campaña se guardó correctamente. Los indicadores se actualizarán en unos segundos."
                variant="green"
              />
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
          >
            <div>
              <label
                htmlFor="ac-date"
                className="block mb-1"
                style={{
                  fontSize: 9,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 600,
                }}
              >
                Fecha
              </label>
              <input
                id="ac-date"
                type="date"
                value={campaign_date}
                onChange={(e) => setCampaignDate(e.target.value)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border2)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-jakarta)',
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <label
                htmlFor="ac-name"
                className="block mb-1"
                style={{
                  fontSize: 9,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 600,
                }}
              >
                Nombre de campaña
              </label>
              <input
                id="ac-name"
                type="text"
                value={campaign_name}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Prospección Semana 10"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border2)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-jakarta)',
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <label
                htmlFor="ac-platform"
                className="block mb-1"
                style={{
                  fontSize: 9,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 600,
                }}
              >
                Plataforma
              </label>
              <select
                id="ac-platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value as PlatformValue)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border2)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-jakarta)',
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 14,
                }}
              >
                <option value="meta">Meta</option>
                <option value="google">Google</option>
                <option value="tiktok">TikTok</option>
                <option value="other">Otra</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="ac-creative"
                className="block mb-1"
                style={{
                  fontSize: 9,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 600,
                }}
              >
                Arte / Creatividad
              </label>
              <input
                id="ac-creative"
                type="text"
                value={creative_name}
                onChange={(e) => setCreativeName(e.target.value)}
                placeholder="Carrusel retargeting"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border2)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-jakarta)',
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <label
                htmlFor="ac-spend"
                className="block mb-1"
                style={{
                  fontSize: 9,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 600,
                }}
              >
                Inversión $
              </label>
              <input
                id="ac-spend"
                type="number"
                min="0"
                step="0.01"
                required
                value={spend}
                onChange={(e) => setSpend(e.target.value)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border2)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-jakarta)',
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <label
                htmlFor="ac-clicks"
                className="block mb-1"
                style={{
                  fontSize: 9,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 600,
                }}
              >
                Clicks
              </label>
              <input
                id="ac-clicks"
                type="number"
                min="0"
                value={clicks}
                onChange={(e) => setClicks(e.target.value)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border2)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-jakarta)',
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <label
                htmlFor="ac-impressions"
                className="block mb-1"
                style={{
                  fontSize: 9,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 600,
                }}
              >
                Impresiones
              </label>
              <input
                id="ac-impressions"
                type="number"
                min="0"
                value={impressions}
                onChange={(e) => setImpressions(e.target.value)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border2)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-jakarta)',
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <label
                htmlFor="ac-leads"
                className="block mb-1"
                style={{
                  fontSize: 9,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 600,
                }}
              >
                Contactos generados
              </label>
              <input
                id="ac-leads"
                type="number"
                min="0"
                value={leads_count}
                onChange={(e) => setLeadsCount(e.target.value)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border2)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-jakarta)',
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <label
                htmlFor="ac-quality-leads"
                className="block mb-1"
                style={{
                  fontSize: 9,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 600,
                }}
              >
                Contactos calificados
              </label>
              <input
                id="ac-quality-leads"
                type="number"
                min="0"
                value={quality_leads}
                onChange={(e) => setQualityLeads(e.target.value)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border2)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-jakarta)',
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <label
                htmlFor="ac-transactions"
                className="block mb-1"
                style={{
                  fontSize: 9,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 600,
                }}
              >
                Transacciones completadas
              </label>
              <input
                id="ac-transactions"
                type="number"
                min="0"
                value={transactions}
                onChange={(e) => setTransactions(e.target.value)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border2)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-jakarta)',
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <label
                htmlFor="ac-revenue"
                className="block mb-1"
                style={{
                  fontSize: 9,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 600,
                }}
              >
                Ventas atribuidas $
              </label>
              <input
                id="ac-revenue"
                type="number"
                min="0"
                step="0.01"
                value={attributed_revenue}
                onChange={(e) => setAttributedRevenue(e.target.value)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border2)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-jakarta)',
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
            </div>

            <div
              style={{
                gridColumn: '1 / -1',
                marginTop: 4,
                marginBottom: 4,
                fontSize: 11,
                color: 'var(--muted)',
              }}
            >
              <span
                className="font-syne"
                style={{ color: 'var(--gold)', fontWeight: 600 }}
              >
                ✦ Vista previa
              </span>
              {' '}
              — estos valores los calcula la base de datos automáticamente:
              <div style={{ marginTop: 4 }}>
                <span style={{ marginRight: 12 }}>
                  ROAS:{' '}
                  <span style={{ color: 'var(--gold)' }}>
                    {preview.roas != null ? preview.roas.toFixed(2) : '—'}
                  </span>
                </span>
                <span style={{ marginRight: 12 }}>
                  CTR:{' '}
                  <span style={{ color: 'var(--gold)' }}>
                    {preview.ctr != null ? `${preview.ctr.toFixed(2)}%` : '—'}
                  </span>
                </span>
                <span>
                  Efectividad:{' '}
                  <span style={{ color: 'var(--gold)' }}>
                    {preview.effectiveness != null
                      ? `${preview.effectiveness.toFixed(1)}%`
                      : '—'}
                  </span>
                </span>
              </div>
            </div>

            <div
              style={{
                gridColumn: '1 / -1',
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: 8,
              }}
            >
              <button
                type="submit"
                disabled={loading}
                className="font-syne font-bold text-sm px-4 py-2 rounded-lg transition-opacity disabled:opacity-60"
                style={{
                  background: loading
                    ? 'rgba(232,165,0,0.5)'
                    : 'linear-gradient(135deg, #F5C842, #F09A1A)',
                  color: '#1A1B2E',
                  minWidth: 140,
                }}
              >
                {loading ? 'Guardando...' : 'Guardar pauta'}
              </button>
            </div>
          </form>
          </div>
        </div>
      )}
    </>
  )
}

