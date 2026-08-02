'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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

const inputStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border2)',
  color: 'var(--text)',
  fontFamily: 'var(--font-jakarta)',
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 9,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 600,
  marginBottom: 4,
}

function onFocusStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = 'var(--gold)'
  e.target.style.boxShadow = '0 0 0 3px var(--gold-bg)'
}
function onBlurStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = 'var(--border2)'
  e.target.style.boxShadow = 'none'
}

interface TxCategory {
  id: string
  name: string
  type: 'income' | 'expense' | 'both'
}

// ── Edit Modal ───────────────────────────────────────────────────────────────

function EditTransactionModal({
  tx,
  accounts,
  onClose,
  onSuccess,
}: {
  tx: TxRow
  accounts: AccountRow[]
  onClose: () => void
  onSuccess: (updated: TxRow) => void
}) {
  const supabase = createClient()

  const [type, setType]         = useState<'income' | 'expense'>(tx.type as 'income' | 'expense')
  const [account_id, setAccId]  = useState(tx.account_id)
  const [amount, setAmount]     = useState(String(tx.amount ?? ''))
  const [category, setCategory] = useState(tx.category ?? '')
  const [concept, setConcept]   = useState(tx.concept ?? '')
  const [tx_date, setTxDate]    = useState(tx.tx_date ?? '')
  const [is_fixed, setIsFixed]  = useState(tx.is_fixed ?? false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [allCats, setAllCats]   = useState<TxCategory[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: uRow } = await supabase.from('users').select('company_id').eq('id', user.id).single()
      if (!uRow?.company_id) return
      const { data } = await supabase
        .from('bank_transaction_categories')
        .select('id, name, type')
        .eq('company_id', uRow.company_id)
        .is('deleted_at', null)
        .order('name')
      setAllCats((data ?? []) as TxCategory[])
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const categories = allCats.filter((c) => c.type === type || c.type === 'both')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) { setError('El monto debe ser mayor a 0.'); return }
    if (!category) { setError('La categoría es obligatoria.'); return }
    setLoading(true)
    const patch = { type, account_id, amount: amt, category, concept: concept.trim() || null, tx_date, is_fixed }
    const { error: upErr } = await supabase
      .from('bank_transactions')
      .update(patch)
      .eq('id', tx.id)
    setLoading(false)
    if (upErr) { setError(upErr.message); return }
    onSuccess({ ...tx, ...patch })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 480, boxShadow: '0 20px 40px rgba(0,0,0,0.14)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 className="font-syne font-bold" style={{ fontSize: 16, color: 'var(--text)' }}>Editar movimiento</h3>
          <button type="button" onClick={onClose} style={{ color: 'var(--muted)', fontSize: 18, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>

        {error && (
          <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: 'var(--red)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          {/* Tipo */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Tipo *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['income', 'expense'] as const).map((t) => (
                <button key={t} type="button" onClick={() => { setType(t); setCategory('') }}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: type === t ? '1px solid var(--gold-bdr)' : '1px solid var(--border)', background: type === t ? 'var(--gold-bg)' : 'var(--hover)', color: type === t ? 'var(--gold)' : 'var(--text2)', cursor: 'pointer' }}>
                  {t === 'income' ? '📈 Ingreso' : '📉 Egreso'}
                </button>
              ))}
            </div>
          </div>

          {/* Cuenta */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Cuenta *</label>
            <select value={account_id} onChange={(e) => setAccId(e.target.value)} required style={inputStyle} onFocus={onFocusStyle} onBlur={onBlurStyle}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.bank_name ?? 'Sin nombre'}{a.account_type ? ` · ${a.account_type}` : ''}</option>
              ))}
            </select>
          </div>

          {/* Monto */}
          <div>
            <label style={labelStyle}>Monto $ *</label>
            <input type="number" step="0.01" min="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle} onFocus={onFocusStyle} onBlur={onBlurStyle} />
          </div>

          {/* Categoría */}
          <div>
            <label style={labelStyle}>Categoría *</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} required style={inputStyle} onFocus={onFocusStyle} onBlur={onBlurStyle}>
              <option value="">Selecciona categoría</option>
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              {category && !categories.find(c => c.name === category) && (
                <option value={category}>{category}</option>
              )}
            </select>
          </div>

          {/* Concepto */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Concepto</label>
            <input type="text" value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Descripción del movimiento" style={inputStyle} onFocus={onFocusStyle} onBlur={onBlurStyle} />
          </div>

          {/* Fecha */}
          <div>
            <label style={labelStyle}>Fecha *</label>
            <input type="date" value={tx_date} onChange={(e) => setTxDate(e.target.value)} required style={inputStyle} onFocus={onFocusStyle} onBlur={onBlurStyle} />
          </div>

          {/* Fijo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="edit-tx-fixed" checked={is_fixed} onChange={(e) => setIsFixed(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--gold)' }} />
            <label htmlFor="edit-tx-fixed" style={{ fontSize: 12, color: 'var(--text2)', cursor: 'pointer' }}>Movimiento fijo</label>
          </div>

          {/* Acciones */}
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500, background: 'var(--hover)', color: 'var(--text2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="font-syne font-bold"
              style={{ flex: 1, padding: '10px 16px', borderRadius: 8, fontSize: 14, background: loading ? 'rgba(232,165,0,0.5)' : 'linear-gradient(135deg, #F5C842, #F09A1A)', color: '#1A1B2E', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

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
  transactions: initialTransactions,
  accountsMap,
  filteredAccountIds,
  filterConcept,
  filterCategory,
  filterType,
  onFilterChange,
}: TransactionsTableProps) {
  const router = useRouter()
  const supabase = createClient()

  const [transactions, setTransactions] = useState<TxRow[]>(initialTransactions)
  const [sortBy, setSortBy]   = useState<SortKey>('tx_date')
  const [sortAsc, setSortAsc] = useState(false)
  const [page, setPage]       = useState(0)
  const [editingTx, setEditingTx]     = useState<TxRow | null>(null)
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const accounts = useMemo(() => Object.values(accountsMap), [accountsMap])

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>()
    transactions.forEach((t) => { if (t.category) set.add(t.category) })
    return Array.from(set).sort()
  }, [transactions])

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (!filteredAccountIds.has(t.account_id)) return false
      const concept = (t.concept ?? '').toLowerCase()
      if (filterConcept && !concept.includes(filterConcept.toLowerCase())) return false
      if (filterCategory && (t.category ?? '') !== filterCategory) return false
      if (filterType && (t.type ?? '') !== filterType) return false
      return true
    })
  }, [transactions, filteredAccountIds, filterConcept, filterCategory, filterType])

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
        case 'tx_date':      va = a.tx_date ?? '';          vb = b.tx_date ?? '';          break
        case 'account_name': va = (a.account_name ?? '').toLowerCase(); vb = (b.account_name ?? '').toLowerCase(); break
        case 'concept':      va = (a.concept ?? '').toLowerCase();      vb = (b.concept ?? '').toLowerCase();      break
        case 'category':     va = (a.category ?? '').toLowerCase();     vb = (b.category ?? '').toLowerCase();     break
        case 'type':         va = (a.type ?? '').toLowerCase();         vb = (b.type ?? '').toLowerCase();         break
        case 'amount':       va = a.amount ?? 0;                        vb = b.amount ?? 0;                        break
        default:             va = ''; vb = ''
      }
      const cmp = typeof va === 'string' && typeof vb === 'string' ? va.localeCompare(vb) : (va as number) - (vb as number)
      return sortAsc ? cmp : -cmp
    })
  }, [txWithAccount, sortBy, sortAsc])

  const totalPages = Math.ceil(sortedTransactions.length / PAGE_SIZE)
  const paginatedTx = sortedTransactions.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  function handleSort(key: SortKey) {
    if (sortBy === key) setSortAsc((prev) => !prev)
    else { setSortBy(key); setSortAsc(false) }
    setPage(0)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este movimiento? El saldo de la cuenta se actualizará automáticamente.')) return
    setDeletingId(id)
    setDeleteError(null)
    const { error: delErr } = await supabase.from('bank_transactions').delete().eq('id', id)
    setDeletingId(null)
    if (delErr) { setDeleteError(delErr.message); return }
    setTransactions((prev) => prev.filter((t) => t.id !== id))
    router.refresh()
  }

  const filterInputStyle: React.CSSProperties = {
    padding: '5px 10px', fontSize: 11, borderRadius: 6, border: '1px solid var(--border2)',
    background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font-jakarta)', minWidth: 100,
  }
  const filterSelectStyle: React.CSSProperties = {
    padding: '5px 10px', fontSize: 11, borderRadius: 6, border: '1px solid var(--border2)',
    background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font-jakarta)', cursor: 'pointer', minWidth: 100,
  }
  const filterButtonStyle: React.CSSProperties = {
    padding: '5px 10px', fontSize: 11, borderRadius: 6, border: '1px solid var(--border2)',
    background: 'var(--hover)', color: 'var(--text2)', fontFamily: 'var(--font-jakarta)', cursor: 'pointer',
  }

  const hasActiveFilters = filterConcept || filterCategory || filterType

  const FiltersBar = () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', padding: '10px 0 12px', borderBottom: '1px solid var(--border)', marginBottom: 12, flexShrink: 0 }}>
      <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 600 }}>
        Filtros movimientos
      </span>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text2)' }}>Concepto</span>
        <input type="text" value={filterConcept} onChange={(e) => { onFilterChange(e.target.value, filterCategory, filterType); setPage(0) }} placeholder="Buscar..." style={filterInputStyle} />
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text2)' }}>Categoría</span>
        <select value={filterCategory} onChange={(e) => { onFilterChange(filterConcept, e.target.value, filterType); setPage(0) }} style={filterSelectStyle}>
          <option value="">Todas</option>
          {uniqueCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text2)' }}>Tipo</span>
        <select value={filterType} onChange={(e) => { onFilterChange(filterConcept, filterCategory, e.target.value); setPage(0) }} style={filterSelectStyle}>
          <option value="">Todos</option>
          <option value="income">Ingreso</option>
          <option value="expense">Egreso</option>
        </select>
      </label>
      {hasActiveFilters && (
        <button type="button" onClick={() => { onFilterChange('', '', ''); setPage(0) }} style={filterButtonStyle}>Limpiar</button>
      )}
      <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>
        {filteredTransactions.length} resultado{filteredTransactions.length !== 1 ? 's' : ''}
      </span>
    </div>
  )

  if (transactions.length === 0) {
    return <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 14, padding: 32 }}>No hay movimientos en el período.</p>
  }

  if (filteredTransactions.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <FiltersBar />
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 14, padding: 32 }}>No hay movimientos que coincidan con los filtros.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <FiltersBar />

      {deleteError && (
        <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12, color: 'var(--red)' }}>
          {deleteError} <button onClick={() => setDeleteError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 14 }}>×</button>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--card)', boxShadow: '0 1px 0 var(--border)' }}>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {COLUMNS.map(({ key, label, align }) => {
                const isActive = sortBy === key
                return (
                  <th key={key} onClick={() => handleSort(key)}
                    style={{ textAlign: align, padding: '10px 12px', color: 'var(--muted)', fontWeight: 600, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {label}
                      {isActive && <span style={{ fontSize: 10, color: 'var(--gold)' }}>{sortAsc ? '↑' : '↓'}</span>}
                    </span>
                  </th>
                )
              })}
              <th style={{ padding: '10px 12px', color: 'var(--muted)', fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' }}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedTx.map((t) => {
              const isIncome = t.type === 'income'
              const amount = t.amount ?? 0
              const isDeleting = deletingId === t.id
              return (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border)', opacity: isDeleting ? 0.4 : 1 }}>
                  <td style={{ fontSize: 12, padding: '10px 12px', color: 'var(--text2)' }}>
                    {formatBusinessDate(t.tx_date)}
                  </td>
                  <td style={{ fontSize: 12, padding: '10px 12px', color: 'var(--text2)' }}>
                    <div>{t.account_name}</div>
                    {t.account_number ? <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{t.account_number}</div> : null}
                  </td>
                  <td style={{ fontSize: 12, padding: '10px 12px', color: 'var(--text)' }}>
                    {t.concept ?? '—'}
                    {t.is_fixed && (
                      <span style={{ marginLeft: 6, display: 'inline-block', padding: '1px 6px', borderRadius: 4, fontSize: 10, background: 'rgba(217,119,6,0.1)', color: 'var(--orange)' }}>
                        Fijo
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: 12, padding: '10px 12px', color: 'var(--text2)' }}>{t.category ?? '—'}</td>
                  <td style={{ fontSize: 12, padding: '10px 12px' }}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500, background: isIncome ? 'rgba(5,150,105,0.1)' : 'rgba(220,38,38,0.1)', color: isIncome ? 'var(--green)' : 'var(--red)' }}>
                      {isIncome ? 'Ingreso' : 'Egreso'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, padding: '10px 12px', fontWeight: 600, color: isIncome ? 'var(--green)' : 'var(--red)', textAlign: 'right' }}>
                    {isIncome ? '+$' : '-$'}{' '}{amount.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center', justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setEditingTx(t)}
                        disabled={isDeleting}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap',
                          padding: '4px 9px', borderRadius: 6, cursor: isDeleting ? 'not-allowed' : 'pointer',
                          border: '1px solid var(--border)',
                          background: 'var(--hover)',
                          color: 'var(--text2)',
                        }}
                      >
                        <span style={{ fontSize: 10 }}>✎</span> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id)}
                        disabled={isDeleting}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                          padding: '4px 9px', borderRadius: 6,
                          border: '1px solid rgba(220,38,38,0.25)',
                          background: 'rgba(220,38,38,0.05)',
                          color: 'var(--red)',
                          cursor: isDeleting ? 'not-allowed' : 'pointer',
                          opacity: isDeleting ? 0.5 : 1,
                        }}
                      >
                        {isDeleting ? '…' : '⊘ Eliminar'}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0 0', marginTop: 8, borderTop: '1px solid var(--border)', gap: 12, flexWrap: 'wrap', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sortedTransactions.length)} de {sortedTransactions.length}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
              style={{ ...filterButtonStyle, color: page === 0 ? 'var(--muted)' : 'var(--text2)', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.5 : 1 }}>
              ← Anterior
            </button>
            <span style={{ fontSize: 11, color: 'var(--text2)', minWidth: 60, textAlign: 'center' }}>
              Página {page + 1} de {totalPages}
            </span>
            <button type="button" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              style={{ ...filterButtonStyle, color: page >= totalPages - 1 ? 'var(--muted)' : 'var(--text2)', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.5 : 1 }}>
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* Modal edición */}
      {editingTx && (
        <EditTransactionModal
          tx={editingTx}
          accounts={accounts}
          onClose={() => setEditingTx(null)}
          onSuccess={(updated) => {
            setTransactions((prev) =>
              prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
            )
            setEditingTx(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
