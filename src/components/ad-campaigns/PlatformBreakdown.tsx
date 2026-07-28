'use client'

import { useMemo } from 'react'

type CampaignRow = {
  platform: string | null
  spend: number | null
  attributed_revenue: number | null
  leads_count: number | null
  quality_leads: number | null
  impressions: number | null
  clicks: number | null
}

interface Props {
  campaigns: CampaignRow[]
}

const PLATFORM_ICONS: Record<string, string> = {
  facebook:  'F',
  instagram: 'I',
  google:    'G',
  tiktok:    'T',
  youtube:   'Y',
  twitter:   'X',
  linkedin:  'in',
  pinterest: 'P',
}

const PLATFORM_COLORS: Record<string, string> = {
  facebook:  '#1877F2',
  instagram: '#E1306C',
  google:    '#4285F4',
  tiktok:    '#010101',
  youtube:   '#FF0000',
  twitter:   '#1DA1F2',
  linkedin:  '#0A66C2',
  pinterest: '#E60023',
}

function getColor(platform: string): string {
  return PLATFORM_COLORS[platform.toLowerCase()] ?? '#888'
}

function getIcon(platform: string): string {
  return PLATFORM_ICONS[platform.toLowerCase()] ?? platform.slice(0, 2).toUpperCase()
}

function fmt(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${Math.round(n)}`
}

export default function PlatformBreakdown({ campaigns }: Props) {
  const byPlatform = useMemo(() => {
    const map = new Map<string, {
      spend: number
      revenue: number
      leads: number
      qualityLeads: number
      impressions: number
      clicks: number
    }>()

    for (const c of campaigns) {
      const key = (c.platform ?? 'Sin plataforma').toLowerCase()
      const existing = map.get(key) ?? { spend: 0, revenue: 0, leads: 0, qualityLeads: 0, impressions: 0, clicks: 0 }
      existing.spend       += c.spend ?? 0
      existing.revenue     += c.attributed_revenue ?? 0
      existing.leads       += c.leads_count ?? 0
      existing.qualityLeads += c.quality_leads ?? 0
      existing.impressions += c.impressions ?? 0
      existing.clicks      += c.clicks ?? 0
      map.set(key, existing)
    }

    const totalSpend = Array.from(map.values()).reduce((s, v) => s + v.spend, 0)

    return Array.from(map.entries())
      .map(([platform, v]) => ({
        platform,
        label: platform === 'sin plataforma' ? 'Sin plataforma' : platform.charAt(0).toUpperCase() + platform.slice(1),
        spend: v.spend,
        revenue: v.revenue,
        leads: v.leads,
        qualityLeads: v.qualityLeads,
        impressions: v.impressions,
        ctr: v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0,
        roas: v.spend > 0 ? v.revenue / v.spend : 0,
        spendPct: totalSpend > 0 ? (v.spend / totalSpend) * 100 : 0,
        qualityRatio: v.leads > 0 ? (v.qualityLeads / v.leads) * 100 : 0,
      }))
      .sort((a, b) => b.spend - a.spend)
  }, [campaigns])

  if (byPlatform.length === 0) return null

  const totalSpend   = byPlatform.reduce((s, p) => s + p.spend, 0)
  const totalRevenue = byPlatform.reduce((s, p) => s + p.revenue, 0)

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '14px 16px',
      }}
    >
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Desglose por plataforma
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--muted)' }}>
          <span>Total invertido: <strong style={{ color: 'var(--text)' }}>{fmt(totalSpend)}</strong></span>
          <span>Revenue total: <strong style={{ color: 'var(--green)' }}>{fmt(totalRevenue)}</strong></span>
        </div>
      </div>

      {/* Barra de distribución de inversión */}
      <div style={{ display: 'flex', height: 6, borderRadius: 4, overflow: 'hidden', marginBottom: 14, gap: 1 }}>
        {byPlatform.map((p) => (
          <div
            key={p.platform}
            title={`${p.label}: ${p.spendPct.toFixed(1)}%`}
            style={{
              width: `${p.spendPct}%`,
              background: getColor(p.platform),
              opacity: 0.85,
              transition: 'width 0.3s ease',
              minWidth: p.spendPct > 1 ? 2 : 0,
            }}
          />
        ))}
      </div>

      {/* Grid de tarjetas por plataforma */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(byPlatform.length, 4)}, 1fr)`,
          gap: 10,
        }}
      >
        {byPlatform.map((p) => {
          const roasColor = p.roas >= 3 ? 'var(--green)' : p.roas >= 1 ? 'var(--gold)' : 'var(--red)'
          return (
            <div
              key={p.platform}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '12px 14px',
                borderTop: `3px solid ${getColor(p.platform)}`,
              }}
            >
              {/* Logo + nombre */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: getColor(p.platform),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#fff',
                    flexShrink: 0,
                  }}
                >
                  {getIcon(p.platform)}
                </div>
                <div>
                  <div className="font-syne" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                    {p.spendPct.toFixed(1)}% del total
                  </div>
                </div>
              </div>

              {/* Métricas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <Metric label="Inversión" value={fmt(p.spend)} color="var(--text)" />
                <Metric label="ROAS" value={`${p.roas.toFixed(2)}x`} color={roasColor} bold />
                <Metric label="Revenue" value={fmt(p.revenue)} color="var(--green)" />
                <Metric label="Leads" value={String(p.leads)} color="var(--text2)" />
                {p.leads > 0 && (
                  <Metric label="Calidad" value={`${p.qualityRatio.toFixed(0)}%`} color="var(--text2)" />
                )}
                {p.ctr > 0 && (
                  <Metric label="CTR" value={`${p.ctr.toFixed(2)}%`} color="var(--text2)" />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Leyenda */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
        {byPlatform.map((p) => (
          <div key={p.platform} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--muted)' }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: getColor(p.platform) }} />
            {p.label} · {p.spendPct.toFixed(1)}%
          </div>
        ))}
      </div>
    </div>
  )
}

function Metric({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color, fontWeight: bold ? 700 : 500, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
    </div>
  )
}
