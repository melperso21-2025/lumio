'use client'

import { useState, useMemo } from 'react'
import KpiCard from '@/components/ui/KpiCard'
import AiInsightBox from '@/components/ui/AiInsightBox'
import EmptyState from '@/components/ui/EmptyState'
import NewBankAccountForm from '@/components/finance/NewBankAccountForm'
import NewTransactionForm from '@/components/finance/NewTransactionForm'
import TransactionsTable from '@/components/finance/TransactionsTable'
import ExportButton from '@/components/ui/ExportButton'
import BalanceTrendChart from '@/components/charts/BalanceTrendChart'

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

  // Calcular días reales del período — mínimo 1 para evitar división por cero
  const fromDate = new Date(from + 'T12:00:00Z')
  const toDate = new Date(to + 'T12:00:00Z')
  const periodDays = Math.max(
    Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1,
    1
  )

  // Promedio diario de egresos basado en los días reales del período
  const daily_expense_avg =
    total_expenses > 0 ? total_expenses / periodDays : 0

  // Días de caja = saldo total / gasto diario promedio
  const cash_days =
    daily_expense_avg > 0
      ? Math.floor(total_balance / daily_expense_avg)
      : 0

  // Balance neto del período
  const net_balance = total_income - total_expenses
  const prev_net_balance = prev_income - prev_expenses

  // Conteo de movimientos
  const num_income_tx = filteredTx.filter((t) => t.type === 'income').length
  const num_expense_tx = filteredTx.filter((t) => t.type === 'expense').length

  // Gastos fijos
  const fixed_expenses = filteredTx
    .filter((t) => t.type === 'expense' && t.is_fixed === true)
    .reduce((sum, t) => sum + (t.amount ?? 0), 0)
  const prev_fixed_expenses = filteredPrevTx
    .filter((t) => t.type === 'expense' && t.is_fixed === true)
    .reduce((sum, t) => sum + (t.amount ?? 0), 0)

  // % gastos fijos sobre total egresos
  const fixed_pct =
    total_expenses > 0 ? (fixed_expenses / total_expenses) * 100 : 0
  const prev_fixed_pct =
    prev_expenses > 0
      ? (prev_fixed_expenses / prev_expenses) * 100
      : 0

  // Saldo al cierre del período anterior = saldo actual - ingresos + egresos del período
  const prev_balance = total_balance - total_income + total_expenses
  const hasPrevData = filteredPrevTx.length > 0

  const accountsMap = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, a])),
    [accounts]
  )

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (!filteredAccountIds.has(t.account_id)) return false
      const concept = (t.concept ?? '').toLowerCase()
      if (filterConcept && !concept.includes(filterConcept.toLowerCase()))
        return false
      if (filterCategory && (t.category ?? '') !== filterCategory) return false
      if (filterType && (t.type ?? '') !== filterType) return false
      return true
    })
  }, [
    transactions,
    filteredAccountIds,
    filterConcept,
    filterCategory,
    filterType,
  ])

  const exportData = useMemo(
    () =>
      filteredTransactions.map((t) => ({
        Fecha: t.tx_date,
        Banco: accountsMap[t.account_id]?.bank_name ?? '—',
        Cuenta: accountsMap[t.account_id]?.account_number ?? '—',
        Tipo: t.type === 'income' ? 'Ingreso' : 'Egreso',
        Monto: t.amount,
        Categoría: t.category,
        Concepto: t.concept,
        'Gasto fijo': t.is_fixed ? 'Sí' : 'No',
      })),
    [filteredTransactions, accountsMap]
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
        gap: 14,
        flex: 1,
        minHeight: 0,
      }}
    >
      {/* KPIs con deltas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <KpiCard
          label="Saldo total"
          prefix="$"
          value={Math.round(total_balance)}
          isGold
          delta={
            prev_balance !== 0
              ? calcDelta(total_balance, prev_balance, true)
              : undefined
          }
          compare={`Ant: $${Math.round(prev_balance)}`}
        />
        <KpiCard
          label="Ingresos"
          prefix="$"
          value={Math.round(total_income)}
          delta={calcDelta(total_income, prev_income, hasPrevData)}
          compare={
            prev_income > 0 ? `Ant: $${Math.round(prev_income)}` : undefined
          }
        />
        <KpiCard
          label="Egresos"
          prefix="$"
          value={Math.round(total_expenses)}
          delta={calcDelta(total_expenses, prev_expenses, hasPrevData)}
          compare={
            prev_expenses > 0
              ? `Ant: $${Math.round(prev_expenses)}`
              : undefined
          }
        />
        <KpiCard
          label="Días de caja"
          value={cash_days}
          compare="meta: >30 días"
        />
        {/* Balance neto del período */}
        <KpiCard
          label="Balance neto"
          prefix={net_balance >= 0 ? '+$' : '-$'}
          value={Math.round(Math.abs(net_balance))}
          delta={calcDelta(net_balance, prev_net_balance, hasPrevData)}
          compare={
            prev_net_balance !== 0
              ? `Ant: $${Math.round(prev_net_balance)}`
              : undefined
          }
        />
        {/* Movimientos del período */}
        <KpiCard
          label="Movimientos"
          value={num_income_tx + num_expense_tx}
          compare={`${num_income_tx} ing / ${num_expense_tx} egr`}
        />
        {/* Gastos fijos del período */}
        <KpiCard
          label="Gastos fijos"
          prefix="$"
          value={Math.round(fixed_expenses)}
          delta={calcDelta(fixed_expenses, prev_fixed_expenses, hasPrevData)}
          compare={
            prev_fixed_expenses > 0
              ? `Ant: $${Math.round(prev_fixed_expenses)}`
              : undefined
          }
        />
        {/* % gastos fijos sobre egresos */}
        <KpiCard
          label="Fijos / egresos"
          suffix="%"
          value={fixed_pct.toFixed(1)}
          delta={calcDelta(fixed_pct, prev_fixed_pct, hasPrevData)}
          compare={
            prev_fixed_pct > 0
              ? `Ant: ${prev_fixed_pct.toFixed(1)}%`
              : 'Benchmark: <55%'
          }
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

      {/* Gráfico de flujo de caja */}
      <BalanceTrendChart
        transactions={transactions}
        accounts={accounts}
        from={from}
        to={to}
      />

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
          gap: 14,
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
            padding: '14px 16px',
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
              marginBottom: 12,
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
            <EmptyState
              icon="🏦"
              title="Agrega tu primera cuenta o caja"
              description="Conecta tu cuenta bancaria o caja de efectivo para registrar todos los movimientos de dinero del negocio. Lumio calcula cuántos días de operación puedes cubrir con lo que tienes en caja."
              tip="Agrega todas las cuentas donde entra y sale dinero: cuenta corriente, cuenta de ahorros, caja chica. Así tendrás la foto completa de tu liquidez."
            />
          ) : filteredAccounts.length === 0 ? (
            <EmptyState isFilterEmpty />
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
            padding: '14px 16px',
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
              marginBottom: 12,
              flexShrink: 0,
            }}
          >
            <h2
              className="font-syne font-bold"
              style={{ fontSize: 16, color: 'var(--text)' }}
            >
              Movimientos recientes
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ExportButton
                data={exportData}
                filename={`finanzas_${from}_${to}`}
                sheetName="Transacciones"
              />
              <NewTransactionForm accounts={accounts} />
            </div>
          </div>

          {transactions.length === 0 ? (
            <EmptyState
              icon="💳"
              title="Sin movimientos en este período"
              description="Los movimientos son los ingresos y egresos de tu negocio — pagos a proveedores, servicios, sueldos, cobros. Registrarlos te permite saber exactamente a dónde va el dinero."
              tip="Empieza registrando el último gasto fijo que pagaste (arriendo, nómina, servicios). Clasifícalo como 'fijo' para que Lumio calcule tu punto de equilibrio."
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
