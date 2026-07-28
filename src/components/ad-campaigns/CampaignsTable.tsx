'use client'

import { useState, useMemo } from 'react'
import { formatBusinessDate } from '@/lib/dateUtils'

const PAGE_SIZE = 20

const PLATFORM_LABELS: Record<string, string> = {
  meta: 'Meta',
  google: 'Google',
  tiktok: 'TikTok',
  other: 'Otro',
}

/** Anchos fijos para columnas de contexto (Fecha–Plataforma) con sticky horizontal */
const STICKY_LEFT = [0, 100, 164, 364] as const
const STICKY_WIDTH = [100, 64, 200, 120] as const

type CampaignRow = {
  id: string
  campaign_date: string | null
  week_number: number | null
  campaign_name: string | null
  platform: string | null
  creative_name: string | null
  spend: number | null
  clicks: number | null
  impressions: number | null
  leads_count: number | null
  quality_leads: number | null
  transactions: number | null
  attributed_revenue: number | null
  roas: number | null
  ctr: number | null
  cpm: number | null
  effectiveness_rate: number | null
  conversion_rate: number | null
}

type SortKey =
  | 'campaign_date'
  | 'week_number'
  | 'campaign_name'
  | 'platform'
  | 'spend'
  | 'attributed_revenue'
  | 'impressions'
  | 'clicks'
  | 'leads_count'
  | 'quality_leads'
  | 'transactions'
  | 'ctr'
  | 'cpm'
  | 'conversion_rate'
  | 'roas'
  | 'effectiveness_rate'

const COLUMNS: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
  { key: 'campaign_date', label: 'Fecha', align: 'left' },
  { key: 'week_number', label: 'Semana', align: 'left' },
  { key: 'campaign_name', label: 'Campaña', align: 'left' },
  { key: 'platform', label: 'Plataforma', align: 'left' },
  { key: 'spend', label: 'Inversión', align: 'right' },
  { key: 'attributed_revenue', label: 'Revenue', align: 'right' },
  { key: 'roas', label: 'ROAS', align: 'right' },
  { key: 'impressions', label: 'Impresiones', align: 'right' },
  { key: 'clicks', label: 'Clicks', align: 'right' },
  { key: 'ctr', label: 'CTR', align: 'right' },
  { key: 'cpm', label: 'CPM', align: 'right' },
  { key: 'leads_count', label: 'Leads', align: 'right' },
  { key: 'quality_leads', label: 'Calidad', align: 'right' },
  { key: 'transactions', label: 'Ventas atr.', align: 'right' },
  { key: 'conversion_rate', label: 'Conv. %', align: 'right' },
  { key: 'effectiveness_rate', label: 'Efectividad', align: 'right' },
]

function getPlatformLabel(platform: string | null): string {
  if (!platform) return 'Otro'
  return PLATFORM_LABELS[platform.toLowerCase()] ?? platform
}

function getSortValue(c: CampaignRow, key: SortKey): string | number {
  switch (key) {
    case 'campaign_date':
      return c.campaign_date ?? ''
    case 'week_number':
      return c.week_number ?? -1
    case 'campaign_name':
      return (c.campaign_name ?? '').toLowerCase()
    case 'platform':
      return (c.platform ?? '').toLowerCase()
    case 'spend':
      return c.spend ?? 0
    case 'attributed_revenue':
      return c.attributed_revenue ?? 0
    case 'impressions':
      return c.impressions ?? 0
    case 'clicks':
      return c.clicks ?? 0
    case 'leads_count':
      return c.leads_count ?? 0
    case 'quality_leads':
      return c.quality_leads ?? 0
    case 'transactions':
      return c.transactions ?? 0
    case 'ctr':
      return (
        c.ctr ??
        (c.impressions && c.impressions > 0
          ? ((c.clicks ?? 0) / c.impressions) * 100
          : -1)
      )
    case 'cpm':
      return c.cpm ?? 0
    case 'conversion_rate':
      return c.conversion_rate ?? 0
    case 'roas':
      return (
        c.roas ??
        (c.spend && c.spend > 0
          ? (c.attributed_revenue ?? 0) / c.spend
          : -1)
      )
    case 'effectiveness_rate':
      return (
        c.effectiveness_rate ??
        (c.leads_count && c.leads_count > 0
          ? ((c.transactions ?? 0) / c.leads_count) * 100
          : -1)
      )
    default:
      return ''
  }
}

interface CampaignsTableProps {
  campaigns: CampaignRow[]
  filterWeek: string
  filterCampaign: string
  filterPlatform: string
  onFilterChange: (week: string, campaign: string, platform: string) => void
}

export default function CampaignsTable({
  campaigns,
  filterWeek,
  filterCampaign,
  filterPlatform,
  onFilterChange,
}: CampaignsTableProps) {
  const [sortBy, setSortBy] = useState<SortKey>('campaign_date')
  const [sortAsc, setSortAsc] = useState(false)
  const [page, setPage] = useState(0)

  const filterInputStyle: React.CSSProperties = {
    padding: '5px 10px',
    fontSize: 11,
    borderRadius: 6,
    border: '1px solid var(--border2)',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontFamily: 'var(--font-jakarta)',
    minWidth: 100,
  }
  const filterSelectStyle: React.CSSProperties = {
    padding: '5px 10px',
    fontSize: 11,
    borderRadius: 6,
    border: '1px solid var(--border2)',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontFamily: 'var(--font-jakarta)',
    cursor: 'pointer',
    minWidth: 100,
  }
  const filterButtonStyle: React.CSSProperties = {
    padding: '5px 10px',
    fontSize: 11,
    borderRadius: 6,
    border: '1px solid var(--border2)',
    background: 'var(--hover)',
    color: 'var(--text2)',
    fontFamily: 'var(--font-jakarta)',
    cursor: 'pointer',
  }

  const uniqueWeeks = useMemo(() => {
    const set = new Set<number>()
    campaigns.forEach((c) => {
      if (c.week_number != null) set.add(c.week_number)
    })
    return Array.from(set).sort((a, b) => a - b)
  }, [campaigns])

  const uniqueCampaigns = useMemo(() => {
    const set = new Set<string>()
    campaigns.forEach((c) => {
      if (c.campaign_name) set.add(c.campaign_name)
    })
    return Array.from(set).sort()
  }, [campaigns])

  const uniquePlatforms = useMemo(() => {
    const set = new Set<string>()
    campaigns.forEach((c) => {
      if (c.platform) set.add(c.platform.toLowerCase())
    })
    return Array.from(set).sort()
  }, [campaigns])

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (filterWeek && String(c.week_number ?? '') !== filterWeek)
        return false
      if (
        filterCampaign &&
        !(c.campaign_name ?? '').toLowerCase().includes(filterCampaign.toLowerCase())
      )
        return false
      if (filterPlatform && (c.platform ?? '').toLowerCase() !== filterPlatform)
        return false
      return true
    })
  }, [campaigns, filterWeek, filterCampaign, filterPlatform])

  const sortedCampaigns = useMemo(() => {
    return [...filteredCampaigns].sort((a, b) => {
      const va = getSortValue(a, sortBy)
      const vb = getSortValue(b, sortBy)
      const cmp =
        typeof va === 'string' && typeof vb === 'string'
          ? va.localeCompare(vb)
          : (va as number) - (vb as number)
      return sortAsc ? cmp : -cmp
    })
  }, [filteredCampaigns, sortBy, sortAsc])

  const totalPages = Math.ceil(sortedCampaigns.length / PAGE_SIZE)
  const paginatedCampaigns = sortedCampaigns.slice(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE
  )

  function handleSort(key: SortKey) {
    if (sortBy === key) {
      setSortAsc((prev) => !prev)
    } else {
      setSortBy(key)
      setSortAsc(false)
    }
    setPage(0)
  }

  const hasActiveFilters = filterWeek || filterCampaign || filterPlatform

  if (campaigns.length === 0) {
    return (
      <p
        style={{
          textAlign: 'center',
          color: 'var(--muted)',
          fontSize: 14,
          padding: 32,
        }}
      >
        Aún no hay campañas registradas
      </p>
    )
  }

  if (filteredCampaigns.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
            padding: '10px 0 12px',
            borderBottom: '1px solid var(--border)',
            marginBottom: 12,
            flexShrink: 0,
          }}
        >
          {renderFilters(true)}
        </div>
        <p
          style={{
            textAlign: 'center',
            color: 'var(--muted)',
            fontSize: 14,
            padding: 32,
          }}
        >
          No hay campañas que coincidan con los filtros.
        </p>
      </div>
    )
  }

  function renderFilters(isEmptyState?: boolean) {
    const setPage0 = () => {
      if (!isEmptyState) setPage(0)
    }
    return (
      <>
        <span
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--muted)',
            fontWeight: 600,
          }}
        >
          Filtros
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>Semana</span>
          <select
            value={filterWeek}
            onChange={(e) => {
              onFilterChange(e.target.value, filterCampaign, filterPlatform)
              setPage0()
            }}
            style={filterSelectStyle}
          >
            <option value="">Todas</option>
            {uniqueWeeks.map((w) => (
              <option key={w} value={String(w)}>
                S{w}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>Campaña</span>
          <input
            type="text"
            value={filterCampaign}
            onChange={(e) => {
              onFilterChange(filterWeek, e.target.value, filterPlatform)
              setPage0()
            }}
            placeholder="Buscar..."
            style={filterInputStyle}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>Plataforma</span>
          <select
            value={filterPlatform}
            onChange={(e) => {
              onFilterChange(filterWeek, filterCampaign, e.target.value)
              setPage0()
            }}
            style={filterSelectStyle}
          >
            <option value="">Todas</option>
            {uniquePlatforms.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_LABELS[p] ?? p}
              </option>
            ))}
          </select>
        </label>
        {(hasActiveFilters || isEmptyState) && (
          <button
            type="button"
            onClick={() => {
              onFilterChange('', '', '')
              setPage(0)
            }}
            style={filterButtonStyle}
          >
            Limpiar
          </button>
        )}
        {!isEmptyState && (
          <span
            style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}
          >
            {filteredCampaigns.length} resultado
            {filteredCampaigns.length !== 1 ? 's' : ''}
          </span>
        )}
      </>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          padding: '10px 0 12px',
          borderBottom: '1px solid var(--border)',
          marginBottom: 12,
          flexShrink: 0,
        }}
      >
        {renderFilters()}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowX: 'auto',
          overflowY: 'auto',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 12,
          }}
        >
          <thead
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 1,
              background: 'var(--card)',
              boxShadow: '0 1px 0 var(--border)',
            }}
          >
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {COLUMNS.map(({ key, label, align }, colIndex) => {
                const isActive = sortBy === key
                const isSticky = colIndex < 4
                return (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    style={{
                      textAlign: align,
                      padding: '10px 12px',
                      color: 'var(--muted)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                      ...(isSticky
                        ? {
                            position: 'sticky',
                            left: STICKY_LEFT[colIndex],
                            top: 0,
                            zIndex: 5,
                            minWidth: STICKY_WIDTH[colIndex],
                            background: 'var(--card)',
                            boxShadow:
                              colIndex === 3
                                ? '4px 0 8px -2px rgba(0,0,0,0.08)'
                                : undefined,
                          }
                        : {}),
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {label}
                      {isActive && (
                        <span style={{ fontSize: 10, color: 'var(--gold)' }}>
                          {sortAsc ? '↑' : '↓'}
                        </span>
                      )}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {paginatedCampaigns.map((c) => {
              const platformLabel = getPlatformLabel(c.platform)
              const roasValue =
                c.roas ??
                (c.spend && c.spend > 0
                  ? (c.attributed_revenue ?? 0) / c.spend
                  : null)
              const ctrValue =
                c.ctr ??
                (c.impressions && c.impressions > 0
                  ? ((c.clicks ?? 0) / c.impressions) * 100
                  : null)
              const effValue =
                c.effectiveness_rate ??
                (c.leads_count && c.leads_count > 0
                  ? ((c.transactions ?? 0) / c.leads_count) * 100
                  : null)
              let effBg = 'rgba(220,38,38,0.1)'
              let effColor = 'var(--red)'
              if (effValue != null) {
                if (effValue >= 30) {
                  effBg = 'rgba(5,150,105,0.1)'
                  effColor = 'var(--green)'
                } else if (effValue >= 10) {
                  effBg = 'rgba(217,119,6,0.1)'
                  effColor = 'var(--orange)'
                }
              }
              const stickyTd = (i: number) => ({
                position: 'sticky' as const,
                left: STICKY_LEFT[i],
                zIndex: 2,
                minWidth: STICKY_WIDTH[i],
                background: 'var(--card)',
                boxShadow:
                  i === 3
                    ? '4px 0 8px -2px rgba(0,0,0,0.08)'
                    : undefined,
              })
              return (
                <tr
                  key={c.id}
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <td
                    style={{
                      ...stickyTd(0),
                      padding: '10px 12px',
                      color: 'var(--text)',
                    }}
                  >
                    {formatBusinessDate(c.campaign_date)}
                  </td>
                  <td
                    style={{
                      ...stickyTd(1),
                      padding: '10px 12px',
                      color: 'var(--text2)',
                    }}
                  >
                    {c.week_number ?? '—'}
                  </td>
                  <td
                    style={{
                      ...stickyTd(2),
                      padding: '10px 12px',
                      color: 'var(--text)',
                    }}
                  >
                    {c.campaign_name ?? '—'}
                  </td>
                  <td
                    style={{
                      ...stickyTd(3),
                      padding: '10px 12px',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: 'var(--hover)',
                        color: 'var(--text2)',
                      }}
                    >
                      {platformLabel}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      color: 'var(--text)',
                    }}
                  >
                    $
                    {(c.spend ?? 0).toLocaleString('es-EC', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  {/* Revenue atribuido — verde (dinero); ROAS va en dorado */}
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      color: 'var(--green)',
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    {c.attributed_revenue != null
                      ? `$${c.attributed_revenue.toLocaleString('es-EC', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      : '—'}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      color: 'var(--gold)',
                      fontFamily: 'var(--font-syne)',
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    {roasValue != null ? roasValue.toFixed(2) : '—'}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      color: 'var(--text2)',
                      fontSize: 12,
                    }}
                  >
                    {c.impressions != null
                      ? c.impressions.toLocaleString('es-EC')
                      : '—'}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      color: 'var(--text2)',
                      fontSize: 12,
                    }}
                  >
                    {c.clicks ?? 0}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      color: 'var(--text2)',
                      fontSize: 12,
                    }}
                  >
                    {ctrValue != null ? `${ctrValue.toFixed(2)}%` : '—'}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      color: 'var(--text2)',
                      fontSize: 12,
                    }}
                  >
                    {c.cpm != null ? `$${c.cpm.toFixed(2)}` : '—'}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      color: 'var(--text2)',
                      fontSize: 12,
                    }}
                  >
                    {c.leads_count ?? '—'}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      color: 'var(--text2)',
                      fontSize: 12,
                    }}
                  >
                    {c.quality_leads != null ? (
                      <span>
                        {c.quality_leads}
                        {c.leads_count ? (
                          <span
                            style={{
                              color: 'var(--muted)',
                              fontSize: 10,
                              marginLeft: 4,
                            }}
                          >
                            (
                            {(
                              (c.quality_leads / c.leads_count) *
                              100
                            ).toFixed(0)}
                            %)
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      color: 'var(--text2)',
                      fontSize: 12,
                    }}
                  >
                    {c.transactions ?? '—'}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      color: 'var(--text2)',
                      fontSize: 12,
                    }}
                  >
                    {c.conversion_rate != null
                      ? `${c.conversion_rate.toFixed(2)}%`
                      : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    {effValue != null ? (
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: effBg,
                          color: effColor,
                        }}
                      >
                        {effValue.toFixed(1)}%
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0 0',
            marginTop: 8,
            borderTop: '1px solid var(--border)',
            gap: 12,
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            Mostrando {page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, sortedCampaigns.length)} de{' '}
            {sortedCampaigns.length}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{
                ...filterButtonStyle,
                color: page === 0 ? 'var(--muted)' : 'var(--text2)',
                cursor: page === 0 ? 'not-allowed' : 'pointer',
                opacity: page === 0 ? 0.5 : 1,
              }}
            >
              ← Anterior
            </button>
            <span
              style={{
                fontSize: 11,
                color: 'var(--text2)',
                minWidth: 60,
                textAlign: 'center',
              }}
            >
              Página {page + 1} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={{
                ...filterButtonStyle,
                color: page >= totalPages - 1 ? 'var(--muted)' : 'var(--text2)',
                cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages - 1 ? 0.5 : 1,
              }}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
