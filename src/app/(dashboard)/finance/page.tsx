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
      .select('id, amount, due_date, issue_date, invoice_ref, status, notes, customer_id, customers(full_name)')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .neq('status', 'paid')
      .order('due_date', { ascending: true })
      .limit(500),
  ])

  const accounts = accountsList ?? []
  const transactions = txList ?? []
  const prevTransactions = prevTxList ?? []

  const receivables = receivablesList ?? []
  const totalPending  = receivables.filter(r => r.status !== 'overdue').reduce((s, r) => s + (r.amount ?? 0), 0)
  const totalOverdue  = receivables.filter(r => r.status === 'overdue').reduce((s, r) => s + (r.amount ?? 0), 0)

  return (
    <>
      <Topbar
        pageTitle="Bancos & Finanzas"
        pageSubtitle={`${from} → ${to}`}
        showPeriodSelector
        showExportButton
      />

      <div
        style={{
          padding: '14px 16px',
          height: 'calc(100vh - 52px)',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <FinanceOverview
          accounts={accounts}
          transactions={transactions}
          prevTransactions={prevTransactions}
          from={from}
          to={to}
          prevFrom={prevFrom}
          prevTo={prevTo}
        />

        {/* ── Cuentas por cobrar ─────────────────────────────────── */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '14px 16px',
            flexShrink: 0,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} />
              <span className="font-syne font-bold" style={{ fontSize: 13, color: 'var(--text)' }}>
                Cuentas por cobrar
              </span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--font-syne)' }}>
                Pendiente: <strong style={{ color: 'var(--blue)' }}>${totalPending.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </span>
              <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--font-syne)' }}>
                Vencido: <strong style={{ color: 'var(--red)' }}>${totalOverdue.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </span>
            </div>
          </div>

          {receivables.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '16px 0' }}>
              No hay cuentas por cobrar pendientes.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    {['Cliente', 'Referencia', 'Emitida', 'Vence', 'Monto', 'Estado'].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: h === 'Monto' ? 'right' : 'left',
                          padding: '6px 10px',
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: 'var(--muted)',
                          borderBottom: '1px solid var(--border)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {receivables.map((r) => {
                    const isOverdue = r.status === 'overdue'
                    const customer = r.customers as unknown as { full_name: string | null } | null
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '7px 10px', color: 'var(--text)', whiteSpace: 'nowrap', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {customer?.full_name ?? '—'}
                        </td>
                        <td style={{ padding: '7px 10px', color: 'var(--text2)', fontFamily: 'monospace', fontSize: 10 }}>
                          {r.invoice_ref ?? '—'}
                        </td>
                        <td style={{ padding: '7px 10px', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                          {r.issue_date ?? '—'}
                        </td>
                        <td style={{ padding: '7px 10px', color: isOverdue ? 'var(--red)' : 'var(--text2)', fontWeight: isOverdue ? 600 : 400, whiteSpace: 'nowrap' }}>
                          {r.due_date}
                        </td>
                        <td style={{ padding: '7px 10px', color: 'var(--text)', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          ${(r.amount ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '7px 10px' }}>
                          <span style={{
                            fontSize: 9,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '2px 8px',
                            borderRadius: 20,
                            background: isOverdue ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.12)',
                            color: isOverdue ? 'var(--red)' : 'var(--blue)',
                          }}>
                            {isOverdue ? 'Vencida' : 'Pendiente'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
