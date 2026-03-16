import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import KpiCard from '@/components/ui/KpiCard'
import AiInsightBox from '@/components/ui/AiInsightBox'
import NewBankAccountForm from '@/components/finance/NewBankAccountForm'
import NewTransactionForm from '@/components/finance/NewTransactionForm'

// ── Formatea fecha ─────────────────────────────────────────────
function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

// ── Configuración de badges por account_type ───────────────────
const accountTypeConfig: Record<string, { bg: string; color: string; label: string }> = {
  checking: { bg: 'rgba(37,99,235,0.1)', color: 'var(--blue)', label: 'Corriente' },
  savings:  { bg: 'rgba(5,150,105,0.1)', color: 'var(--green)', label: 'Ahorros' },
  cash:     { bg: 'rgba(232,165,0,0.1)', color: 'var(--gold)', label: 'Caja' },
  other:    { bg: 'var(--hover)', color: 'var(--text2)', label: 'Otra' },
}

export default async function FinancePage() {
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
        <Topbar pageTitle="Bancos & Finanzas" pageSubtitle="Cuentas y movimientos" />
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

  const { data: accountsList } = await supabase
    .from('bank_accounts')
    .select('id, bank_name, account_type, account_number, initial_balance, current_balance, is_active')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('bank_name')

  const { data: txList } = await supabase
    .from('bank_transactions')
    .select('id, account_id, type, amount, category, concept, tx_date, is_fixed')
    .eq('company_id', companyId)
    .order('tx_date', { ascending: false })
    .limit(50)

  const accounts = accountsList ?? []
  const transactions = txList ?? []
  const accountsMap = Object.fromEntries(accounts.map((a) => [a.id, a]))

  const total_balance = accounts.reduce((sum, a) => sum + (a.current_balance ?? 0), 0)
  const total_income = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount ?? 0), 0)
  const total_expenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount ?? 0), 0)
  const fixed_expenses = transactions
    .filter((t) => t.type === 'expense' && t.is_fixed)
    .reduce((sum, t) => sum + (t.amount ?? 0), 0)

  const daily_expense_avg = total_expenses > 0 ? total_expenses / 30 : 0
  const cash_days = daily_expense_avg > 0
    ? Math.floor(total_balance / daily_expense_avg)
    : 0

  return (
    <>
      <Topbar pageTitle="Bancos & Finanzas" pageSubtitle="Cuentas y movimientos" />

      <div
        style={{
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Grid 4 KpiCards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
          }}
        >
          <KpiCard
            label="Saldo total"
            prefix="$"
            value={total_balance.toFixed(2)}
            isGold
          />
          <KpiCard
            label="Ingresos"
            prefix="$"
            value={total_income.toFixed(2)}
            delta={total_income > 0 ? 0.1 : undefined}
          />
          <KpiCard
            label="Egresos"
            prefix="$"
            value={total_expenses.toFixed(2)}
          />
          <KpiCard
            label="Días de caja"
            value={cash_days}
            compare="meta: >30 días"
          />
        </div>

        {/* AiInsightBox alerta si días de caja < 30 */}
        {cash_days < 30 && cash_days >= 0 && (
          <AiInsightBox
            variant={cash_days < 10 ? 'red' : 'gold'}
            title={cash_days < 10 ? '🔴 Alerta crítica de caja' : '⚠ Días de caja bajos'}
            text={`Tienes aproximadamente ${cash_days} días de caja disponibles. ${
              cash_days < 10
                ? 'Acción urgente: revisar ingresos pendientes y reducir egresos no esenciales.'
                : 'Considera revisar tus CxC pendientes y planificar ingresos para las próximas semanas.'
            }`}
          />
        )}

        {/* Grid 2 columnas */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.5fr',
            gap: 20,
          }}
        >
          {/* Columna izquierda — Cuentas bancarias */}
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 20,
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
                Cuentas bancarias
              </h2>
              <NewBankAccountForm />
            </div>

            {accounts.length === 0 ? (
              <AiInsightBox
                variant="blue"
                title="Sin cuentas registradas"
                text="Agrega tu primera cuenta bancaria o caja para comenzar a registrar movimientos."
              />
            ) : (
              <div>
                {accounts.map((a) => {
                  const typeCfg = accountTypeConfig[a.account_type ?? ''] ?? accountTypeConfig.other
                  const balance = a.current_balance ?? 0
                  const lastFour = a.account_number
                    ? a.account_number.slice(-4)
                    : '—'
                  return (
                    <div
                      key={a.id}
                      style={{
                        padding: 12,
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div
                          className="font-syne font-bold"
                          style={{ fontSize: 13, color: 'var(--text)' }}
                        >
                          {a.bank_name}
                        </div>
                        <span
                          style={{
                            display: 'inline-block',
                            marginTop: 4,
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 500,
                            background: typeCfg.bg,
                            color: typeCfg.color,
                          }}
                        >
                          {typeCfg.label}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--muted)',
                          marginRight: 12,
                        }}
                      >
                        ****{lastFour}
                      </div>
                      <div
                        className="font-syne font-bold"
                        style={{
                          fontSize: 16,
                          color: balance < 0 ? 'var(--red)' : 'var(--gold)',
                        }}
                      >
                        $ {balance.toLocaleString('es-EC')}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Columna derecha — Movimientos recientes */}
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 20,
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
                Movimientos recientes
              </h2>
              <NewTransactionForm accounts={accounts} />
            </div>

            {transactions.length === 0 ? (
              <AiInsightBox
                variant="blue"
                title="Sin movimientos"
                text="Registra tu primer ingreso o egreso usando el botón '+ Movimiento'."
              />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                  }}
                >
                  <thead>
                    <tr>
                      {['Fecha', 'Cuenta', 'Concepto', 'Categoría', 'Tipo', 'Monto'].map((h) => (
                        <th
                          key={h}
                          style={{
                            fontSize: 11,
                            color: 'var(--muted)',
                            fontWeight: 600,
                            padding: '10px 12px',
                            textAlign: 'left',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => {
                      const acc = accountsMap[t.account_id]
                      const bankName = acc?.bank_name ?? '—'
                      const isIncome = t.type === 'income'
                      const amount = t.amount ?? 0
                      return (
                        <tr
                          key={t.id}
                          style={{
                            borderBottom: '1px solid var(--border)',
                          }}
                        >
                          <td style={{ fontSize: 12, padding: '10px 12px', color: 'var(--text2)' }}>
                            {formatDate(t.tx_date)}
                          </td>
                          <td style={{ fontSize: 12, padding: '10px 12px', color: 'var(--text2)' }}>
                            {bankName}
                          </td>
                          <td style={{ fontSize: 12, padding: '10px 12px', color: 'var(--text)' }}>
                            {t.concept ?? '—'}
                            {t.is_fixed && (
                              <span
                                style={{
                                  marginLeft: 6,
                                  display: 'inline-block',
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  fontSize: 10,
                                  background: 'rgba(217,119,6,0.1)',
                                  color: 'var(--orange)',
                                }}
                              >
                                Fijo
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: 12, padding: '10px 12px', color: 'var(--text2)' }}>
                            {t.category ?? '—'}
                          </td>
                          <td style={{ fontSize: 12, padding: '10px 12px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 500,
                                background: isIncome
                                  ? 'rgba(5,150,105,0.1)'
                                  : 'rgba(220,38,38,0.1)',
                                color: isIncome ? 'var(--green)' : 'var(--red)',
                              }}
                            >
                              {isIncome ? 'Ingreso' : 'Egreso'}
                            </span>
                          </td>
                          <td
                            style={{
                              fontSize: 12,
                              padding: '10px 12px',
                              fontWeight: 600,
                              color: isIncome ? 'var(--green)' : 'var(--red)',
                            }}
                          >
                            {isIncome ? '+$' : '-$'} {amount.toLocaleString('es-EC')}
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
      </div>
    </>
  )
}
