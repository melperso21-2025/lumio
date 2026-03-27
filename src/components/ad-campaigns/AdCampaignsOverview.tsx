'use client'

import { useState, useMemo } from 'react'
import KpiCard from '@/components/ui/KpiCard'
import AiInsightBox from '@/components/ui/AiInsightBox'
import NewCampaignForm from '@/components/ad-campaigns/NewCampaignForm'
import CampaignsTable from '@/components/ad-campaigns/CampaignsTable'

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

function calcDelta(
  current: number,
  previous: number,
  hasPrevData: boolean
): number | undefined {
  if (!hasPrevData || previous === 0) return undefined
  return Math.round(((current - previous) / previous) * 100)
}

interface AdCampaignsOverviewProps {
  campaigns: CampaignRow[]
  prevCampaigns: CampaignRow[]
  from: string
  to: string
  prevFrom: string
  prevTo: string
}

export default function AdCampaignsOverview({
  campaigns,
  prevCampaigns,
  from,
  to,
  prevFrom,
  prevTo,
}: AdCampaignsOverviewProps) {
  const [filterWeek, setFilterWeek] = useState<string>('')
  const [filterCampaign, setFilterCampaign] = useState<string>('')
  const [filterPlatform, setFilterPlatform] = useState<string>('')

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (filterWeek && String(c.week_number ?? '') !== filterWeek)
        return false
      if (
        filterCampaign &&
        !(c.campaign_name ?? '')
          .toLowerCase()
          .includes(filterCampaign.toLowerCase())
      )
        return false
      if (filterPlatform && (c.platform ?? '').toLowerCase() !== filterPlatform)
        return false
      return true
    })
  }, [campaigns, filterWeek, filterCampaign, filterPlatform])

  const filteredPrevCampaigns = useMemo(() => {
    return prevCampaigns.filter((c) => {
      if (filterWeek && String(c.week_number ?? '') !== filterWeek)
        return false
      if (
        filterCampaign &&
        !(c.campaign_name ?? '')
          .toLowerCase()
          .includes(filterCampaign.toLowerCase())
      )
        return false
      if (filterPlatform && (c.platform ?? '').toLowerCase() !== filterPlatform)
        return false
      return true
    })
  }, [prevCampaigns, filterWeek, filterCampaign, filterPlatform])

  const totals = useMemo(() => {
    return filteredCampaigns.reduce(
      (acc, c) => {
        const spend = c.spend ?? 0
        const leads = c.leads_count ?? 0
        const quality = c.quality_leads ?? 0
        const clicks = c.clicks ?? 0
        const impressions = c.impressions ?? 0
        const revenue = c.attributed_revenue ?? 0
        const transactions = c.transactions ?? 0
        acc.totalSpend += spend
        acc.totalLeads += leads
        acc.totalQualityLeads += quality
        acc.totalClicks += clicks
        acc.totalImpressions += impressions
        acc.totalRevenue += revenue
        acc.totalTransactions += transactions
        return acc
      },
      {
        totalSpend: 0,
        totalLeads: 0,
        totalQualityLeads: 0,
        totalClicks: 0,
        totalImpressions: 0,
        totalRevenue: 0,
        totalTransactions: 0,
      }
    )
  }, [filteredCampaigns])

  const prevTotals = useMemo(() => {
    return filteredPrevCampaigns.reduce(
      (acc, c) => {
        const spend = c.spend ?? 0
        const leads = c.leads_count ?? 0
        const quality = c.quality_leads ?? 0
        const clicks = c.clicks ?? 0
        const impressions = c.impressions ?? 0
        const revenue = c.attributed_revenue ?? 0
        const transactions = c.transactions ?? 0
        acc.totalSpend += spend
        acc.totalLeads += leads
        acc.totalQualityLeads += quality
        acc.totalClicks += clicks
        acc.totalImpressions += impressions
        acc.totalRevenue += revenue
        acc.totalTransactions += transactions
        return acc
      },
      {
        totalSpend: 0,
        totalLeads: 0,
        totalQualityLeads: 0,
        totalClicks: 0,
        totalImpressions: 0,
        totalRevenue: 0,
        totalTransactions: 0,
      }
    )
  }, [filteredPrevCampaigns])

  const total_spend = totals.totalSpend
  const total_leads = totals.totalLeads
  const avg_roas =
    totals.totalSpend > 0 ? totals.totalRevenue / totals.totalSpend : 0
  const quality_ratio_pct =
    totals.totalLeads > 0
      ? (totals.totalQualityLeads / totals.totalLeads) * 100
      : 0
  const effectiveness_pct =
    totals.totalLeads > 0
      ? (totals.totalTransactions / totals.totalLeads) * 100
      : 0
  const ctr_pct =
    totals.totalImpressions > 0
      ? (totals.totalClicks / totals.totalImpressions) * 100
      : 0

  const prev_spend = prevTotals.totalSpend
  const prev_leads = prevTotals.totalLeads
  const prev_avg_roas =
    prevTotals.totalSpend > 0
      ? prevTotals.totalRevenue / prevTotals.totalSpend
      : 0
  const prev_quality_ratio_pct =
    prevTotals.totalLeads > 0
      ? (prevTotals.totalQualityLeads / prevTotals.totalLeads) * 100
      : 0
  const prev_effectiveness_pct =
    prevTotals.totalLeads > 0
      ? (prevTotals.totalTransactions / prevTotals.totalLeads) * 100
      : 0
  const prev_ctr_pct =
    prevTotals.totalImpressions > 0
      ? (prevTotals.totalClicks / prevTotals.totalImpressions) * 100
      : 0

  const hasPrevData = filteredPrevCampaigns.length > 0

  function handleFilterChange(week: string, campaign: string, platform: string) {
    setFilterWeek(week)
    setFilterCampaign(campaign)
    setFilterPlatform(platform)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        flex: 1,
        minHeight: 0,
      }}
    >
      <AiInsightBox
        title="lumio IA · Análisis de pautas"
        text="Aquí verás un análisis automático de tus campañas: qué conjuntos de anuncios están generando el mejor ROAS, dónde se está desperdiciando inversión y qué ajustes priorizar esta semana."
      />

      {/* KPIs con deltas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <KpiCard
          label="Inversión"
          prefix="$"
          value={total_spend.toLocaleString('es-EC', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          delta={calcDelta(total_spend, prev_spend, hasPrevData)}
          compare={
            prev_spend > 0
              ? `Ant: $${prev_spend.toLocaleString('es-EC', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}`
              : undefined
          }
        />
        <KpiCard
          label="ROAS"
          value={avg_roas.toFixed(2)}
          isGold
          delta={
            prev_avg_roas > 0
              ? calcDelta(avg_roas, prev_avg_roas, hasPrevData)
              : undefined
          }
          compare={
            prev_avg_roas > 0
              ? `Ant: ${prev_avg_roas.toFixed(2)}`
              : 'meta: >4.0'
          }
        />
        <KpiCard
          label="Leads"
          value={total_leads}
          delta={calcDelta(total_leads, prev_leads, hasPrevData)}
          compare={prev_leads > 0 ? `Ant: ${prev_leads}` : undefined}
        />
        <KpiCard
          label="Calidad contactos"
          suffix="%"
          value={quality_ratio_pct.toFixed(1)}
          delta={
            prev_quality_ratio_pct > 0
              ? calcDelta(quality_ratio_pct, prev_quality_ratio_pct, hasPrevData)
              : undefined
          }
          compare={
            prev_quality_ratio_pct > 0
              ? `Ant: ${prev_quality_ratio_pct.toFixed(1)}%`
              : undefined
          }
        />
        <KpiCard
          label="Efectividad"
          suffix="%"
          value={effectiveness_pct.toFixed(1)}
          delta={
            prev_effectiveness_pct > 0
              ? calcDelta(
                  effectiveness_pct,
                  prev_effectiveness_pct,
                  hasPrevData
                )
              : undefined
          }
          compare={
            prev_effectiveness_pct > 0
              ? `Ant: ${prev_effectiveness_pct.toFixed(1)}%`
              : undefined
          }
        />
        <KpiCard
          label="CTR"
          suffix="%"
          value={ctr_pct.toFixed(2)}
          delta={
            prev_ctr_pct > 0
              ? calcDelta(ctr_pct, prev_ctr_pct, hasPrevData)
              : undefined
          }
          compare={
            prev_ctr_pct > 0 ? `Ant: ${prev_ctr_pct.toFixed(2)}%` : undefined
          }
        />
      </div>

      {/* Card historial */}
      <div
        style={{
          borderRadius: 12,
          background: 'var(--card)',
          border: '1px solid var(--border)',
          padding: 20,
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            flexShrink: 0,
          }}
        >
          <h2
            className="font-syne font-bold"
            style={{ fontSize: 16, color: 'var(--text)' }}
          >
            Historial de campañas
          </h2>
          <NewCampaignForm />
        </div>

        {campaigns.length === 0 ? (
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
        ) : (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <CampaignsTable
              campaigns={campaigns}
              filterWeek={filterWeek}
              filterCampaign={filterCampaign}
              filterPlatform={filterPlatform}
              onFilterChange={handleFilterChange}
            />
          </div>
        )}
      </div>
    </div>
  )
}
