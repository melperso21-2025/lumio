import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import KpiCard from '@/components/ui/KpiCard'
import AiInsightBox from '@/components/ui/AiInsightBox'

export default async function DashboardPage() {
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
        <Topbar pageTitle="Dashboard" pageSubtitle="Sin empresa asignada" />
        <div style={{ padding: 20 }}>
          <p
            style={{
              fontFamily: 'var(--font-syne)',
              color: 'var(--muted)',
              fontSize: 14,
            }}
          >
            No tienes una empresa asignada. Contacta a tu administrador.
          </p>
        </div>
      </>
    )
  }

  const { data: snap } = await supabase
    .from('weekly_snapshots')
    .select('*')
    .eq('company_id', companyId)
    .order('year', { ascending: false })
    .order('week_number', { ascending: false })
    .limit(1)
    .single()

  const { data: insight } = await supabase
    .from('ai_insights')
    .select('executive_summary, week_number, year')
    .eq('company_id', companyId)
    .order('year', { ascending: false })
    .order('week_number', { ascending: false })
    .limit(1)
    .single()

  const weekLabel =
    snap?.week_number != null && snap?.year != null
      ? `Semana ${snap.week_number} · ${snap.year}`
      : 'Sin datos'

  return (
    <>
      <Topbar pageTitle="Dashboard" pageSubtitle={weekLabel} />

      <div
        style={{
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {/* IA Insight */}
        <AiInsightBox
          title={`lumio IA · Semana ${insight?.week_number ?? '—'}`}
          text={
            insight?.executive_summary ??
            'Aún no hay suficientes datos para generar un análisis. Registra ventas y pautas para ver tus primeros insights.'
          }
        />

        {/* BLOQUE VENTAS */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '16px 20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <div
              className="font-syne font-bold"
              style={{ fontSize: 13, color: 'var(--text)' }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--gold)',
                  marginRight: 6,
                  verticalAlign: 'middle',
                }}
              />
              Ventas
            </div>
            <Link
              href="/sales"
              style={{ fontSize: 11, color: 'var(--gold)' }}
            >
              Ver detalle →
            </Link>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: 10,
            }}
          >
            <KpiCard
              label="Ventas"
              prefix="$"
              value={snap?.total_sales ?? 0}
              isGold
            />
            <KpiCard
              label="Transacciones"
              value={snap?.total_transactions ?? 0}
            />
            <KpiCard
              label="Ticket prom."
              prefix="$"
              value={snap?.avg_ticket ?? 0}
            />
            <KpiCard
              label="LPP"
              value={snap?.avg_lpp ?? 0}
              compare="líneas por pedido"
            />
            <KpiCard
              label="Descuentos"
              prefix="$"
              value={snap?.total_discounts ?? 0}
            />
            <KpiCard
              label="Margen bruto"
              suffix="%"
              value={snap?.gross_margin_pct ?? 0}
              isGold
            />
          </div>
        </div>

        {/* BLOQUE PAUTAS */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '16px 20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <div
              className="font-syne font-bold"
              style={{ fontSize: 13, color: 'var(--text)' }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--gold)',
                  marginRight: 6,
                  verticalAlign: 'middle',
                }}
              />
              Pautas Publicitarias
            </div>
            <Link
              href="/ad-campaigns"
              style={{ fontSize: 11, color: 'var(--gold)' }}
            >
              Ver detalle →
            </Link>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 10,
            }}
          >
            <KpiCard
              label="Inversión"
              prefix="$"
              value={snap?.total_ad_spend ?? 0}
            />
            <KpiCard
              label="ROAS"
              value={snap?.avg_roas ?? 0}
              isGold
              compare="meta: >4.0"
            />
            <KpiCard label="Leads" value={snap?.total_leads ?? 0} />
            <KpiCard
              label="Efectividad"
              suffix="%"
              value={snap?.avg_effectiveness ?? 0}
            />
            <KpiCard
              label="CTR"
              suffix="%"
              value={snap?.avg_ctr ?? 0}
            />
          </div>
        </div>

        {/* BLOQUE FINANZAS */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '16px 20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <div
              className="font-syne font-bold"
              style={{ fontSize: 13, color: 'var(--text)' }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--green)',
                  marginRight: 6,
                  verticalAlign: 'middle',
                }}
              />
              Financiero
            </div>
            <Link
              href="/finance"
              style={{ fontSize: 11, color: 'var(--gold)' }}
            >
              Ver detalle →
            </Link>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 10,
            }}
          >
            <KpiCard
              label="Días de caja"
              value={snap?.cash_days ?? 0}
              compare="meta: >30 días"
            />
            <KpiCard
              label="CxC vencidas"
              prefix="$"
              value={snap?.overdue_receivables ?? 0}
            />
            <KpiCard
              label="Margen neto"
              suffix="%"
              value={snap?.net_margin_pct ?? 0}
            />
            <KpiCard
              label="Capital paral."
              prefix="$"
              value={snap?.frozen_capital ?? 0}
            />
          </div>
        </div>
      </div>
    </>
  )
}
