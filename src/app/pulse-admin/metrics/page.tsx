import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const PLAN_MRR: Record<string, number> = {
  trial: 0,
  basic: 49,
  standard: 99,
  pro: 199,
}

function daysAgo(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function trialDaysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null
  const diff = new Date(expiresAt).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default async function PulseAdminMetricsPage() {
  const supabase = await createClient()

  const { data: companiesList } = await supabase
    .from('companies')
    .select('id, name, plan, status, max_users, trial_expires_at, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  const companies = companiesList ?? []

  // Usuarios por empresa
  const { data: usersData } = await supabase
    .from('users')
    .select('company_id, last_seen_at')
    .is('deleted_at', null)
    .not('company_id', 'is', null)

  const usersByCompany: Record<string, { count: number; lastSeen: string | null }> = {}
  usersData?.forEach((u) => {
    const cid = u.company_id!
    if (!usersByCompany[cid]) usersByCompany[cid] = { count: 0, lastSeen: null }
    usersByCompany[cid].count++
    const prev = usersByCompany[cid].lastSeen
    if (!prev || (u.last_seen_at && u.last_seen_at > prev)) {
      usersByCompany[cid].lastSeen = u.last_seen_at
    }
  })

  // Ventas por empresa (últimos 30 días)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const { data: salesData } = await supabase
    .from('sales')
    .select('company_id, total, created_at')
    .not('company_id', 'is', null)
    .gte('created_at', thirtyDaysAgo.toISOString())

  const salesByCompany: Record<string, { count: number; total: number; lastSale: string | null }> = {}
  salesData?.forEach((s) => {
    const cid = s.company_id!
    if (!salesByCompany[cid]) salesByCompany[cid] = { count: 0, total: 0, lastSale: null }
    salesByCompany[cid].count++
    salesByCompany[cid].total += s.total ?? 0
    const prev = salesByCompany[cid].lastSale
    if (!prev || s.created_at > prev) salesByCompany[cid].lastSale = s.created_at
  })

  // Insights por empresa (últimos 30 días)
  const { data: insightsData } = await supabase
    .from('ai_insights')
    .select('company_id')
    .gte('created_at', thirtyDaysAgo.toISOString())

  const insightsByCompany: Record<string, number> = {}
  insightsData?.forEach((i) => {
    insightsByCompany[i.company_id] = (insightsByCompany[i.company_id] ?? 0) + 1
  })

  // Clientes por empresa
  const { data: customersData } = await supabase
    .from('customers')
    .select('company_id')
    .is('deleted_at', null)

  const customersByCompany: Record<string, number> = {}
  customersData?.forEach((c) => {
    if (c.company_id) customersByCompany[c.company_id] = (customersByCompany[c.company_id] ?? 0) + 1
  })

  const totalMrr = companies.reduce((acc, c) => acc + (PLAN_MRR[c.plan] ?? 0), 0)
  const trialCount = companies.filter((c) => c.status === 'trial').length
  const activeCount = companies.filter((c) => c.status === 'active').length
  const suspendedCount = companies.filter((c) => c.status === 'suspended').length

  const fmt = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })

  return (
    <>
      <Topbar pageTitle="Métricas MVP" pageSubtitle="Estado operativo de todas las empresas" />

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* KPI bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: 'MRR estimado', value: fmt.format(totalMrr), sub: 'Basado en plan activo', color: 'var(--green)' },
            { label: 'Empresas activas', value: String(activeCount), sub: `${trialCount} trial · ${suspendedCount} suspendidas`, color: 'var(--text)' },
            { label: 'Empresas con ventas 30d', value: String(Object.keys(salesByCompany).length), sub: `de ${companies.length} empresas totales`, color: 'var(--text)' },
            { label: 'Empresas con insights 30d', value: String(Object.keys(insightsByCompany).length), sub: 'North Star: uso de IA activo', color: '#7C3AED' },
          ].map((k) => (
            <div key={k.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 6, fontWeight: 600 }}>{k.label}</div>
              <div className="font-syne font-bold" style={{ fontSize: 24, color: k.color, lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabla por empresa */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)' }}>
            <div className="font-syne font-bold" style={{ fontSize: 13, color: 'var(--text)' }}>
              Métricas por empresa — últimos 30 días
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Empresa', 'Plan / Estado', 'Usuarios', 'Última actividad', 'Ventas 30d', 'Vol. ventas', 'Clientes', 'Insights', 'Trial expira', 'Alertas'].map((h) => (
                  <th key={h} style={{ padding: '8px 12px', fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => {
                const uc = usersByCompany[c.id] ?? { count: 0, lastSeen: null }
                const sc = salesByCompany[c.id] ?? { count: 0, total: 0, lastSale: null }
                const insights = insightsByCompany[c.id] ?? 0
                const customers = customersByCompany[c.id] ?? 0
                const lastActivityDays = daysAgo(uc.lastSeen)
                const trialLeft = trialDaysLeft(c.trial_expires_at)
                const maxU = c.max_users ?? 3
                const atLimit = maxU > 0 && uc.count >= maxU
                const noActivity = lastActivityDays === null || lastActivityDays > 14
                const noSales = sc.count === 0
                const trialExpiringSoon = trialLeft !== null && trialLeft <= 7 && trialLeft >= 0
                const trialExpired = trialLeft !== null && trialLeft < 0

                const alerts: string[] = []
                if (c.status === 'suspended') alerts.push('Suspendida')
                if (noActivity) alerts.push('Sin actividad +14d')
                if (noSales) alerts.push('Sin ventas')
                if (atLimit) alerts.push('Límite usuarios')
                if (trialExpiringSoon) alerts.push(`Trial: ${trialLeft}d`)
                if (trialExpired) alerts.push('Trial vencido')

                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <Link href={`/pulse-admin/companies/${c.id}`} style={{ color: 'var(--gold)', fontWeight: 600, textDecoration: 'none', fontSize: 12 }}>
                        {c.name}
                      </Link>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'capitalize' }}>{c.plan}</div>
                      <div style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: c.status === 'active' ? 'var(--green)' : c.status === 'suspended' ? 'var(--red)' : 'var(--orange)',
                      }}>
                        {c.status === 'active' ? 'Activo' : c.status === 'suspended' ? 'Suspendido' : 'Trial'}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ color: atLimit ? 'var(--red)' : 'var(--text)', fontWeight: atLimit ? 700 : 400 }}>
                        {uc.count}/{maxU}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: noActivity ? 'var(--red)' : 'var(--text2)', fontSize: 11 }}>
                      {lastActivityDays === null ? '—' : lastActivityDays === 0 ? 'Hoy' : `${lastActivityDays}d atrás`}
                    </td>
                    <td style={{ padding: '10px 12px', color: noSales ? 'var(--muted)' : 'var(--text)', fontWeight: noSales ? 400 : 600 }}>
                      {noSales ? '—' : sc.count}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>
                      {sc.total > 0 ? fmt.format(sc.total) : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>
                      {customers || '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ color: insights >= 2 ? '#7C3AED' : insights === 1 ? 'var(--orange)' : 'var(--muted)', fontWeight: insights >= 2 ? 700 : 400 }}>
                        {insights || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: trialExpiringSoon ? 'var(--orange)' : trialExpired ? 'var(--red)' : 'var(--muted)' }}>
                      {c.trial_expires_at
                        ? trialExpired
                          ? `Vencido (${Math.abs(trialLeft!)}d)`
                          : trialLeft !== null
                            ? `${trialLeft}d`
                            : c.trial_expires_at.slice(0, 10)
                        : '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {alerts.length === 0 ? (
                        <span style={{ fontSize: 10, color: 'var(--green)' }}>✓ OK</span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {alerts.map((a) => (
                            <span key={a} style={{
                              fontSize: 9,
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontWeight: 600,
                              background: 'rgba(220,38,38,0.08)',
                              color: 'var(--red)',
                              border: '1px solid rgba(220,38,38,0.2)',
                              whiteSpace: 'nowrap',
                            }}>
                              {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: 11, color: 'var(--muted)' }}>
          MRR estimado: trial $0 · basic $49 · standard $99 · pro $199 — ajustar según precios reales en código.
        </p>
      </div>
    </>
  )
}
