import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import KpiCard from '@/components/ui/KpiCard'
import AiInsightBox from '@/components/ui/AiInsightBox'
import NewCampaignForm from '@/components/ad-campaigns/NewCampaignForm'

export default async function AdCampaignsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const companyId = userData?.company_id

  if (!companyId) {
    return (
      <>
        <Topbar
          pageTitle="Pautas Publicitarias"
          pageSubtitle="Meta Ads · Google Ads · Performance semanal"
        />
        <div style={{ padding: 20 }}>
          <p
            style={{
              fontFamily: 'var(--font-syne)',
              color: 'var(--muted)',
              fontSize: 14,
            }}
          >
            No tienes una empresa asignada.
          </p>
        </div>
      </>
    )
  }

  const { data: campaignsData } = await supabase
    .from('ad_campaigns')
    .select(
      'id, campaign_date, week_number, campaign_name, platform, creative_name, spend, clicks, impressions, leads_count, quality_leads, transactions, attributed_revenue, roas, ctr, cpm, effectiveness_rate, conversion_rate'
    )
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('campaign_date', { ascending: false })
    .limit(50)

  const campaigns = campaignsData ?? []

  const totals = campaigns.reduce(
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

  return (
    <>
      <Topbar
        pageTitle="Pautas Publicitarias"
        pageSubtitle="Meta Ads · Google Ads · Performance semanal"
      />

      <div
        style={{
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <AiInsightBox
          title="lumio IA · Análisis de pautas"
          text="Aquí verás un análisis automático de tus campañas: qué conjuntos de anuncios están generando el mejor ROAS, dónde se está desperdiciando inversión y qué ajustes priorizar esta semana."
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 10,
          }}
        >
          <KpiCard
            label="Inversión"
            prefix="$"
            value={total_spend}
          />
          <KpiCard
            label="ROAS"
            value={avg_roas.toFixed(2)}
            isGold
            compare="meta: >4.0"
          />
          <KpiCard
            label="Leads"
            value={total_leads}
          />
          <KpiCard
            label="Calidad contactos"
            suffix="%"
            value={quality_ratio_pct.toFixed(1)}
          />
          <KpiCard
            label="Efectividad"
            suffix="%"
            value={effectiveness_pct.toFixed(1)}
          />
          <KpiCard
            label="CTR"
            suffix="%"
            value={ctr_pct.toFixed(2)}
          />
        </div>

        <div
          style={{
            borderRadius: 12,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            padding: 20,
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <h2
              className="font-syne font-bold"
              style={{ fontSize: 16, color: 'var(--text)' }}
            >
              Historial de campañas
            </h2>
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
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        color: 'var(--muted)',
                        fontWeight: 600,
                      }}
                    >
                      Fecha
                    </th>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        color: 'var(--muted)',
                        fontWeight: 600,
                      }}
                    >
                      Semana
                    </th>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        color: 'var(--muted)',
                        fontWeight: 600,
                      }}
                    >
                      Campaña
                    </th>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        color: 'var(--muted)',
                        fontWeight: 600,
                      }}
                    >
                      Plataforma
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '10px 12px',
                        color: 'var(--muted)',
                        fontWeight: 600,
                      }}
                    >
                      Inversión
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '10px 12px',
                        color: 'var(--muted)',
                        fontWeight: 600,
                      }}
                    >
                      Clicks
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '10px 12px',
                        color: 'var(--muted)',
                        fontWeight: 600,
                      }}
                    >
                      CTR
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '10px 12px',
                        color: 'var(--muted)',
                        fontWeight: 600,
                      }}
                    >
                      ROAS
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '10px 12px',
                        color: 'var(--muted)',
                        fontWeight: 600,
                      }}
                    >
                      Efectividad
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => {
                    const date = (() => {
                      try {
                        return new Date(c.campaign_date).toLocaleDateString(
                          'es-EC',
                          {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          }
                        )
                      } catch {
                        return c.campaign_date
                      }
                    })()

                    const platform = (c.platform ?? 'other').toLowerCase()
                    const platformLabel =
                      platform === 'meta'
                        ? 'Meta'
                        : platform === 'google'
                          ? 'Google'
                          : platform === 'tiktok'
                            ? 'TikTok'
                            : 'Otro'

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

                    return (
                      <tr
                        key={c.id}
                        style={{
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        <td
                          style={{
                            padding: '10px 12px',
                            color: 'var(--text)',
                          }}
                        >
                          {date}
                        </td>
                        <td
                          style={{
                            padding: '10px 12px',
                            color: 'var(--text2)',
                          }}
                        >
                          {c.week_number ?? '—'}
                        </td>
                        <td
                          style={{
                            padding: '10px 12px',
                            color: 'var(--text)',
                          }}
                        >
                          {c.campaign_name}
                        </td>
                        <td
                          style={{
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
                          {' '}
                          {(c.spend ?? 0).toLocaleString('es-EC')}
                        </td>
                        <td
                          style={{
                            padding: '10px 12px',
                            textAlign: 'right',
                            color: 'var(--text2)',
                          }}
                        >
                          {c.clicks ?? 0}
                        </td>
                        <td
                          style={{
                            padding: '10px 12px',
                            textAlign: 'right',
                            color: 'var(--text2)',
                          }}
                        >
                          {ctrValue != null ? `${ctrValue.toFixed(2)}%` : '—'}
                        </td>
                        <td
                          style={{
                            padding: '10px 12px',
                            textAlign: 'right',
                            color: 'var(--gold)',
                            fontFamily: 'var(--font-syne)',
                            fontWeight: 700,
                          }}
                        >
                          {roasValue != null ? roasValue.toFixed(2) : '—'}
                        </td>
                        <td
                          style={{
                            padding: '10px 12px',
                            textAlign: 'right',
                          }}
                        >
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
          )}

          <NewCampaignForm />
        </div>
      </div>
    </>
  )
}

