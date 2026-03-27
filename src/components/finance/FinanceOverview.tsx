'use client'

import { useState, useMemo } from 'react'
import KpiCard from '@/components/ui/KpiCard'
import AiInsightBox from '@/components/ui/AiInsightBox'
import NewBankAccountForm from '@/components/finance/NewBankAccountForm'
import NewTransactionForm from '@/components/finance/NewTransactionForm'
import TransactionsTable from '@/components/finance/TransactionsTable'

const accountTypeConfig: Record<string, { bg: string; color: string; label: string }> = {
  checking: { bg: 'rgba(37,99,235,0.1)', color: 'var(--blue)', label: 'Corriente' },
  savings: { bg: 'rgba(5,150,105,0.1)', color: 'var(--green)', label: 'Ahorros' },
  cash: { bg: 'rgba(232,165,0,0.1)', color: 'var(--gold)', label: 'Caja' },
  other: { bg: 'var(--hover)', color: 'var(--text2)', label: 'Otra' },
}

type AccountRow = {
  id: string
  bank_name: string | null
  account_type: string | null
  account_number: string | null
  initial_balance: number | null
  current_balance: number | null
  is_active: boolean
}

type TxRow = {
  id: string
  account_id: string
  type: string
  amount: number | null
  category: string | null
  concept: string | null
  tx_date: string | null
  is_fixed: boolean | null
}

function calcDelta(
  current: number,
  previous: number,
  hasPrevData: boolean
): number | undefined {
  if (!hasPrevData || previous === 0) return undefined
  return Math.round(((current - previous) / previous) * 100)
}

interface FinanceOverviewProps {
  accounts: AccountRow[]
  transactions: TxRow[]
  prevTransactions: TxRow[]
  from: string
  to: string
  prevFrom: string
  prevTo: string
}

export default function FinanceOverview({
  accounts,
  transactions,
  prevTransactions,
  from,
  to,
  prevFrom,
  prevTo,
}: FinanceOverviewProps) {
  const [filterBanco, setFilterBanco] = useState<string>('')
  const [filterCuenta, setFilterCuenta] = useState<string>('')
  const [filterConcept, setFilterConcept] = useState<string>('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')

  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => {
      const bankName = (a.bank_name ?? '').toLowerCase()
      const accountNum = (a.account_number ?? '').toLowerCase()
      if (filterBanco && !bankName.includes(filterBanco.toLowerCase()))
        return false
      if (filterCuenta && !accountNum.includes(filterCuenta.toLowerCase()))
        return false
      return true
    })
  }, [accounts, filterBanco, filterCuenta])

  const filteredAccountIds = useMemo(
    () => new Set(filteredAccounts.map((a) => a.id)),
    [filteredAccounts]
  )

  const total_balance = filteredAccounts.reduce(
    (sum, a) => sum + (a.current_balance ?? 0),
    0
  )

  const filteredTx = useMemo(() => {
    return transactions.filter((t) => filteredAccountIds.has(t.account_id))
  }, [transactions, filteredAccountIds])

  const filteredPrevTx = useMemo(() => {
    return prevTransactions.filter((t) => filteredAccountIds.has(t.account_id))
  }, [prevTransactions, filteredAccountIds])

  const total_income = filteredTx
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount ?? 0), 0)
  const total_expenses = filteredTx
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount ?? 0), 0)
  const prev_income = filteredPrevTx
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount ?? 0), 0)
  const prev_expenses = filteredPrevTx
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount ?? 0), 0)

  const daily_expense_avg = total_expenses > 0 ? total_expenses / 30 : 0
  const cash_days = daily_expense_avg > 0
    ? Math.floor(total_balance / daily_expense_avg)
    : 0

  // Saldo al cierre del período anterior = saldo actual - ingresos + egresos del período
  const prev_balance = total_balance - total_income + total_expenses
  const hasPrevData = filteredPrevTx.length > 0

  const accountsMap = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, a])),
    [accounts]
  )

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

  const hasAccountFilters = filterBanco || filterCuenta

  function handleTxFilterChange(
    concept: string,
    category: string,
    type: string
  ) {
    setFilterConcept(concept)
    setFilterCategory(category)
    setFilterType(type)
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
      {/* KPIs con deltas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <KpiCard
          label="Saldo total"
          prefix="$"
          value={total_balance.toLocaleString('es-EC', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          isGold
          delta={
            prev_balance !== 0
              ? calcDelta(total_balance, prev_balance, true)
              : undefined
          }
          compare={`Ant: $${prev_balance.toLocaleString('es-EC', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}`}
        />
        <KpiCard
          label="Ingresos"
          prefix="$"
          value={total_income.toLocaleString('es-EC', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          delta={calcDelta(total_income, prev_income, hasPrevData)}
          compare={prev_income > 0 ? `Ant: $${prev_income.toLocaleString('es-EC', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : undefined}
        />
        <KpiCard
          label="Egresos"
          prefix="$"
          value={total_expenses.toLocaleString('es-EC', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          delta={calcDelta(total_expenses, prev_expenses, hasPrevData)}
          compare={prev_expenses > 0 ? `Ant: $${prev_expenses.toLocaleString('es-EC', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : undefined}
        />
        <KpiCard
          label="Días de caja"
          value={cash_days}
          compare="meta: >30 días"
        />
      </div>

      {/* Alerta días de caja */}
      {cash_days < 30 && cash_days >= 0 && (
        <div style={{ flexShrink: 0 }}>
          <AiInsightBox
            variant={cash_days < 10 ? 'red' : 'gold'}
            title={
              cash_days < 10 ? '🔴 Alerta crítica de caja' : '⚠ Días de caja bajos'
            }
            text={`Tienes aproximadamente ${cash_days} días de caja disponibles. ${
              cash_days < 10
                ? 'Acción urgente: revisar ingresos pendientes y reducir egresos no esenciales.'
                : 'Considera revisar tus CxC pendientes y planificar ingresos para las próximas semanas.'
            }`}
          />
        </div>
      )}

      {/* Filtros Banco y Cuenta (afectan ambas secciones) */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          padding: '12px 0',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--muted)',
            fontWeight: 600,
          }}
        >
          Filtros Banco y Cuenta (aplican a cuentas y movimientos)
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>Banco</span>
          <input
            type="text"
            value={filterBanco}
            onChange={(e) => setFilterBanco(e.target.value)}
            placeholder="Nombre del banco..."
            style={filterInputStyle}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>Nº cuenta</span>
          <input
            type="text"
            value={filterCuenta}
            onChange={(e) => setFilterCuenta(e.target.value)}
            placeholder="Número de cuenta..."
            style={filterInputStyle}
          />
        </label>
        {hasAccountFilters && (
          <button
            type="button"
            onClick={() => {
              setFilterBanco('')
              setFilterCuenta('')
            }}
            style={filterButtonStyle}
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Grid 2 columnas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.5fr',
          gap: 20,
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Columna izquierda — Cuentas bancarias */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
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
          ) : filteredAccounts.length === 0 ? (
            <p
              style={{
                textAlign: 'center',
                color: 'var(--muted)',
                fontSize: 14,
                padding: 32,
              }}
            >
              No hay cuentas que coincidan con los filtros.
            </p>
          ) : (
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflow: 'auto',
              }}
            >
              {filteredAccounts.map((a) => {
                const typeCfg =
                  accountTypeConfig[a.account_type ?? ''] ?? accountTypeConfig.other
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
                      $ {balance.toLocaleString('es-EC', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
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
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
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
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <TransactionsTable
                transactions={transactions}
                accountsMap={accountsMap}
                filteredAccountIds={filteredAccountIds}
                filterConcept={filterConcept}
                filterCategory={filterCategory}
                filterType={filterType}
                onFilterChange={handleTxFilterChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
