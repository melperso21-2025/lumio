import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import FinanceOverview from '@/components/finance/FinanceOverview'
import {
  getDefaultDateRange,
  getPreviousPeriodRolling,
  parseLocalDate,
  toLocalISO,
} from '@/lib/dateUtils'

export default async function FinancePage({
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
    .select('company_id, role')
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
          pageTitle="Bancos & Finanzas"
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

  const [
    { data: accountsList },
    { data: txList },
    { data: prevTxList },
    { data: receivablesList },
    { data: payablesList },
  ] = await Promise.all([
    supabase
      .from('bank_accounts')
      .select(
        'id, bank_name, account_type, account_number, initial_balance, current_balance, is_active'
      )
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('bank_name'),
    supabase
      .from('bank_transactions')
      .select('id, account_id, type, amount, category, concept, tx_date, is_fixed')
      .eq('company_id', companyId)
      .gte('tx_date', from)
      .lte('tx_date', to)
      .order('tx_date', { ascending: false })
      .limit(200),
    supabase
      .from('bank_transactions')
      .select('id, account_id, type, amount, category, concept, tx_date, is_fixed')
      .eq('company_id', companyId)
      .gte('tx_date', prevFrom)
      .lte('tx_date', prevTo)
      .order('tx_date', { ascending: false })
      .limit(200),
    supabase
      .from('accounts_receivable')
      .select('id, amount, status')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .neq('status', 'paid'),
    supabase
      .from('accounts_payable')
      .select('id, balance, status, due_date')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .neq('status', 'paid'),
  ])

  const accounts = accountsList ?? []
  const transactions = txList ?? []
  const prevTransactions = prevTxList ?? []

  const today = new Date().toISOString().slice(0, 10)

  const receivables = receivablesList ?? []
  const cxcPending  = receivables.filter(r => r.status !== 'overdue').reduce((s, r) => s + (r.amount ?? 0), 0)
  const cxcOverdue  = receivables.filter(r => r.status === 'overdue').reduce((s, r) => s + (r.amount ?? 0), 0)
  const cxcCount    = receivables.length

  const payables   = payablesList ?? []
  const cxpPending = payables.filter(r => (r.due_date ?? '') >= today).reduce((s, r) => s + ((r.balance as number) ?? 0), 0)
  const cxpOverdue = payables.filter(r => (r.due_date ?? '') < today).reduce((s, r) => s + ((r.balance as number) ?? 0), 0)
  const cxpCount   = payables.length

  return (
    <>
      <Topbar
        pageTitle="Bancos & Finanzas"
        pageSubtitle={`${from} → ${to}`}
        showPeriodSelector
        showExportButton
      />

      <div style={{ padding: '14px 16px' }}>
        <FinanceOverview
          accounts={accounts}
          transactions={transactions}
          prevTransactions={prevTransactions}
          from={from}
          to={to}
          prevFrom={prevFrom}
          prevTo={prevTo}
        >
          {/* ── Resumen CxC y CxP ─────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* CxC */}
            <a href="/receivables" style={{ textDecoration: 'none' }}>
              <div
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '16px 18px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', flexShrink: 0 }} />
                  <span className="font-syne font-bold" style={{ fontSize: 14, color: 'var(--text)' }}>
                    Cuentas por cobrar (CxC)
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>{cxcCount} pendiente{cxcCount !== 1 ? 's' : ''} →</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Por cobrar</div>
                    <div className="font-syne font-bold" style={{ fontSize: 22, color: 'var(--text)' }}>
                      ${Math.round(cxcPending).toLocaleString('es-EC')}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Vencido</div>
                    <div className="font-syne font-bold" style={{ fontSize: 22, color: cxcOverdue > 0 ? 'var(--red)' : 'var(--muted)' }}>
                      ${Math.round(cxcOverdue).toLocaleString('es-EC')}
                    </div>
                  </div>
                </div>
              </div>
            </a>
            {/* CxP */}
            <a href="/payables" style={{ textDecoration: 'none' }}>
              <div
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '16px 18px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', display: 'inline-block', flexShrink: 0 }} />
                  <span className="font-syne font-bold" style={{ fontSize: 14, color: 'var(--text)' }}>
                    Cuentas por pagar (CxP)
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>{cxpCount} pendiente{cxpCount !== 1 ? 's' : ''} →</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Por pagar</div>
                    <div className="font-syne font-bold" style={{ fontSize: 22, color: 'var(--text)' }}>
                      ${Math.round(cxpPending).toLocaleString('es-EC')}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Vencido</div>
                    <div className="font-syne font-bold" style={{ fontSize: 22, color: cxpOverdue > 0 ? 'var(--red)' : 'var(--muted)' }}>
                      ${Math.round(cxpOverdue).toLocaleString('es-EC')}
                    </div>
                  </div>
                </div>
              </div>
            </a>
          </div>
        </FinanceOverview>
      </div>
    </>
  )
}
