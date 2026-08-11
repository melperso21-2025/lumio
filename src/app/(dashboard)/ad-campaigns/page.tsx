import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import AdCampaignsOverview from '@/components/ad-campaigns/AdCampaignsOverview'
import {
  getDefaultDateRange,
  getPreviousPeriodRolling,
  parseLocalDate,
  toLocalISO,
} from '@/lib/dateUtils'

export default async function AdCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const params = await searchParams
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
  const defaults = getDefaultDateRange()
  const from = params.from ?? defaults.from
  const to = params.to ?? defaults.to

  const fromDate = parseLocalDate(from)
  const toDate = parseLocalDate(to)
  const isYTD = fromDate.getMonth() === 0 && fromDate.getDate() === 1

  let prevFrom: string
  let prevTo: string

  if (isYTD) {
    prevFrom = `${fromDate.getFullYear() - 1}-01-01`
    const prevToDate = new Date(toDate)
    prevToDate.setFullYear(fromDate.getFullYear() - 1)
    prevTo = toLocalISO(prevToDate)
  } else {
    const rolling = getPreviousPeriodRolling(from, to)
    prevFrom = rolling.prevFrom
    prevTo = rolling.prevTo
  }

  if (!companyId) {
    return (
      <>
        <Topbar
          pageTitle="Pautas Publicitarias"
          pageSubtitle={`${from} → ${to}`}
          showPeriodSelector
          showExportButton
        />
        <div style={{ padding: '14px 16px' }}>
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
    .gte('campaign_date', from)
    .lte('campaign_date', to)
    .order('campaign_date', { ascending: false })
    .limit(200)

  const { data: prevCampaignsData } = await supabase
    .from('ad_campaigns')
    .select(
      'id, campaign_date, week_number, campaign_name, platform, creative_name, spend, clicks, impressions, leads_count, quality_leads, transactions, attributed_revenue, roas, ctr, cpm, effectiveness_rate, conversion_rate'
    )
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .gte('campaign_date', prevFrom)
    .lte('campaign_date', prevTo)
    .order('campaign_date', { ascending: false })
    .limit(200)

  const campaigns = campaignsData ?? []
  const prevCampaigns = prevCampaignsData ?? []

  return (
    <>
      <Topbar
        pageTitle="Pautas Publicitarias"
        pageSubtitle={`${from} → ${to}`}
        showPeriodSelector
        showExportButton
      />

      <div style={{ padding: '14px 16px' }}>
        <AdCampaignsOverview
          campaigns={campaigns}
          prevCampaigns={prevCampaigns}
          from={from}
          to={to}
          prevFrom={prevFrom}
          prevTo={prevTo}
        />
      </div>
    </>
  )
}
