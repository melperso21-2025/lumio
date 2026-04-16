'use client'

import { useState, useMemo } from 'react'
import { formatBusinessDate } from '@/lib/dateUtils'

const PAGE_SIZE = 20

type AccountRow = {
  id: string
  bank_name: string | null
  account_type: string | null
  account_number: string | null
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

type SortKey = 'tx_date' | 'account_name' | 'concept' | 'category' | 'type' | 'amount'

const COLUMNS: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
  { key: 'tx_date', label: 'Fecha', align: 'left' },
  { key: 'account_name', label: 'Cuenta', align: 'left' },
  { key: 'concept', label: 'Concepto', align: 'left' },
  { key: 'category', label: 'Categoría', align: 'left' },
  { key: 'type', label: 'Tipo', align: 'left' },
  { key: 'amount', label: 'Monto', align: 'right' },
]

interface TransactionsTableProps {
  transactions: TxRow[]
  accountsMap: Record<string, AccountRow>
  filteredAccountIds: Set<string>
  filterConcept: string
  filterCategory: string
  filterType: string
  onFilterChange: (concept: string, category: string, type: string) => void
}

export default function TransactionsTable({
  transactions,
  accountsMap,
  filteredAccountIds,
  filterConcept,
  filterCategory,
  filterType,
  onFilterChange,
}: TransactionsTableProps) {
  const [sortBy, setSortBy] = useState<SortKey>('tx_date')
  const [sortAsc, setSortAsc] = useState(false)
  const [page, setPage] = useState(0)

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>()
    transactions.forEach((t) => {
      if (t.category) set.add(t.category)
    })
    return Array.from(set).sort()
  }, [transactions])

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

  const txWithAccount = useMemo(() => {
    return filteredTransactions.map((t) => ({
      ...t,
      account_name: accountsMap[t.account_id]?.bank_name ?? '—',
      account_number: accountsMap[t.account_id]?.account_number ?? null,
    }))
  }, [filteredTransactions, accountsMap])

  const sortedTransactions = useMemo(() => {
    return [...txWithAccount].sort((a, b) => {
      let va: string | number
      let vb: string | number
      switch (sortBy) {
        case 'tx_date':
          va = a.tx_date ?? ''
          vb = b.tx_date ?? ''
          break
        case 'account_name':
          va = (a.account_name ?? '').toLowerCase()
          vb = (b.account_name ?? '').toLowerCase()
          break
        case 'concept':
          va = (a.concept ?? '').toLowerCase()
          vb = (b.concept ?? '').toLowerCase()
          break
        case 'category':
          va = (a.category ?? '').toLowerCase()
          vb = (b.category ?? '').toLowerCase()
          break
        case 'type':
          va = (a.type ?? '').toLowerCase()
          vb = (b.type ?? '').toLowerCase()
          break
        case 'amount':
          va = a.amount ?? 0
          vb = b.amount ?? 0
          break
        default:
          va = ''
          vb = ''
      }
      const cmp =
        typeof va === 'string' && typeof vb === 'string'
          ? va.localeCompare(vb)
          : (va as number) - (vb as number)
      return sortAsc ? cmp : -cmp
    })
  }, [txWithAccount, sortBy, sortAsc])

  const totalPages = Math.ceil(sortedTransactions.length / PAGE_SIZE)
  const paginatedTx = sortedTransactions.slice(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE
  )

  function handleSort(key: SortKey) {
    if (sortBy === key) {
      setSortAsc((prev) => !prev)
    } else {
      setSortBy(key)
      setSortAsc(false)
    }
    setPage(0)
  }

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
  const filterSelectStyle: React.CSSProperties = {
    padding: '5px 10px',
    fontSize: 11,
    borderRadius: 6,
    border: '1px solid var(--border2)',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontFamily: 'var(--font-jakarta)',
    cursor: 'pointer',
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

  const hasActiveFilters = filterConcept || filterCategory || filterType

  if (transactions.length === 0) {
    return (
      <p
        style={{
          textAlign: 'center',
          color: 'var(--muted)',
          fontSize: 14,
          padding: 32,
        }}
      >
        No hay movimientos en el período.
      </p>
    )
  }

  if (filteredTransactions.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
            padding: '10px 0 12px',
            borderBottom: '1px solid var(--border)',
            marginBottom: 12,
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
            Filtros movimientos
          </span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Concepto</span>
            <input
              type="text"
              value={filterConcept}
              onChange={(e) =>
                onFilterChange(e.target.value, filterCategory, filterType)
              }
              placeholder="Buscar..."
              style={filterInputStyle}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Categoría</span>
            <select
              value={filterCategory}
              onChange={(e) =>
                onFilterChange(filterConcept, e.target.value, filterType)
              }
              style={filterSelectStyle}
            >
              <option value="">Todas</option>
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Tipo</span>
            <select
              value={filterType}
              onChange={(e) =>
                onFilterChange(filterConcept, filterCategory, e.target.value)
              }
              style={filterSelectStyle}
            >
              <option value="">Todos</option>
              <option value="income">Ingreso</option>
              <option value="expense">Egreso</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => onFilterChange('', '', '')}
            style={filterButtonStyle}
          >
            Limpiar
          </button>
        </div>
        <p
          style={{
            textAlign: 'center',
            color: 'var(--muted)',
            fontSize: 14,
            padding: 32,
          }}
        >
          No hay movimientos que coincidan con los filtros.
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          padding: '10px 0 12px',
          borderBottom: '1px solid var(--border)',
          marginBottom: 12,
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
          Filtros movimientos
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>Concepto</span>
          <input
            type="text"
            value={filterConcept}
            onChange={(e) => {
              onFilterChange(e.target.value, filterCategory, filterType)
              setPage(0)
            }}
            placeholder="Buscar..."
            style={filterInputStyle}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>Categoría</span>
          <select
            value={filterCategory}
            onChange={(e) => {
              onFilterChange(filterConcept, e.target.value, filterType)
              setPage(0)
            }}
            style={filterSelectStyle}
          >
            <option value="">Todas</option>
            {uniqueCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>Tipo</span>
          <select
            value={filterType}
            onChange={(e) => {
              onFilterChange(filterConcept, filterCategory, e.target.value)
              setPage(0)
            }}
            style={filterSelectStyle}
          >
            <option value="">Todos</option>
            <option value="income">Ingreso</option>
            <option value="expense">Egreso</option>
          </select>
        </label>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              onFilterChange('', '', '')
              setPage(0)
            }}
            style={filterButtonStyle}
          >
            Limpiar
          </button>
        )}
        <span
          style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}
        >
          {filteredTransactions.length} resultado
          {filteredTransactions.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 12,
          }}
        >
          <thead
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 1,
              background: 'var(--card)',
              boxShadow: '0 1px 0 var(--border)',
            }}
          >
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {COLUMNS.map(({ key, label, align }) => {
                const isActive = sortBy === key
                return (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    style={{
                      textAlign: align,
                      padding: '10px 12px',
                      color: 'var(--muted)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {label}
                      {isActive && (
                        <span style={{ fontSize: 10, color: 'var(--gold)' }}>
                          {sortAsc ? '↑' : '↓'}
                        </span>
                      )}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {paginatedTx.map((t) => {
              const isIncome = t.type === 'income'
              const amount = t.amount ?? 0
              return (
                <tr
                  key={t.id}
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <td
                    style={{
                      fontSize: 12,
                      padding: '10px 12px',
                      color: 'var(--text2)',
                    }}
                  >
                    {formatBusinessDate(t.tx_date)}
                  </td>
                  <td
                    style={{
                      fontSize: 12,
                      padding: '10px 12px',
                      color: 'var(--text2)',
                    }}
                  >
                    <div>{t.account_name}</div>
                    {t.account_number ? (
                      <div
                        style={{
                          fontSize: 10,
                          color: 'var(--muted)',
                          marginTop: 1,
                        }}
                      >
                        {t.account_number}
                      </div>
                    ) : null}
                  </td>
                  <td
                    style={{
                      fontSize: 12,
                      padding: '10px 12px',
                      color: 'var(--text)',
                    }}
                  >
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
                  <td
                    style={{
                      fontSize: 12,
                      padding: '10px 12px',
                      color: 'var(--text2)',
                    }}
                  >
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
                      textAlign: 'right',
                    }}
                  >
                    {isIncome ? '+$' : '-$'}{' '}
                    {amount.toLocaleString('es-EC', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0 0',
            marginTop: 8,
            borderTop: '1px solid var(--border)',
            gap: 12,
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            Mostrando {page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, sortedTransactions.length)} de{' '}
            {sortedTransactions.length}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{
                ...filterButtonStyle,
                color: page === 0 ? 'var(--muted)' : 'var(--text2)',
                cursor: page === 0 ? 'not-allowed' : 'pointer',
                opacity: page === 0 ? 0.5 : 1,
              }}
            >
              ← Anterior
            </button>
            <span
              style={{
                fontSize: 11,
                color: 'var(--text2)',
                minWidth: 60,
                textAlign: 'center',
              }}
            >
              Página {page + 1} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={{
                ...filterButtonStyle,
                color: page >= totalPages - 1 ? 'var(--muted)' : 'var(--text2)',
                cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages - 1 ? 0.5 : 1,
              }}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
