# PROMPT — Dashboard v2.1 — 4 fixes de interactividad

## Contexto del proyecto
Estoy construyendo Lumio, una plataforma SaaS de inteligencia de negocio para PyMEs.
- Lee OBLIGATORIAMENTE docs/CURSOR_CONTEXT.md antes de escribir cualquier línea
- Los tipos de Supabase están en src/lib/supabase/database.types.ts
- La tabla weekly_snapshots ya tiene 12 filas con datos reales (semanas 1-12 de 2026)

## Problemas a resolver
1. Botón "+ Registrar venta" se monta encima de los filtros del Topbar
2. Selector de período (Esta semana / Este mes / Últimos 30 días) no funciona
3. Deltas ▲▼ no aparecen en los KPIs
4. Gráfica solo muestra 1 barra en lugar de múltiples semanas

## Tarea
REEMPLAZA estos archivos:
1. src/app/(dashboard)/dashboard/page.tsx
2. src/components/dashboard/RegisterSaleButton.tsx

Crea UN archivo NUEVO:
3. src/components/dashboard/PeriodSelector.tsx

NO modifiques ningún otro archivo.

---

## SOLUCIÓN AL PROBLEMA 1 — Botón mal posicionado

El RegisterSaleButton usa `position: fixed` lo cual lo pone encima del Topbar.
La solución correcta es que el botón viva DENTRO del Topbar usando el prop `primaryAction`.

### src/components/dashboard/RegisterSaleButton.tsx

CAMBIO: Eliminar el `position: fixed`. El componente ahora es SOLO el modal.
El botón disparador lo pasa el Topbar como prop.

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface RegisterSaleButtonProps {
  companyId: string
}

const STATUS_OPTIONS = [
  { value: 'closed',  label: 'Cerrada'   },
  { value: 'review',  label: 'Revisión'  },
  { value: 'contact', label: 'Contacto'  },
] as const

const inputStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border2)',
  color: 'var(--text)', fontFamily: 'var(--font-jakarta)',
  width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, outline: 'none',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 9, color: 'var(--muted)',
  textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 4,
}
function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = 'var(--gold)'
  e.target.style.boxShadow   = '0 0 0 3px var(--gold-bg)'
}
function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = 'var(--border2)'
  e.target.style.boxShadow   = 'none'
}

export default function RegisterSaleButton({ companyId }: RegisterSaleButtonProps) {
  const router = useRouter()
  const [open,           setOpen]          = useState(false)
  const [channels,       setChannels]      = useState<{ id: string; name: string }[]>([])
  const [loading,        setLoading]       = useState(false)
  const [error,          setError]         = useState<string | null>(null)
  const [success,        setSuccess]       = useState(false)
  const [gross_total,    setGrossTotal]    = useState('')
  const [lines_per_order,setLinesPerOrder] = useState(1)
  const [channel_id,     setChannelId]     = useState('')
  const [status,         setStatus]        = useState('closed')
  const [notes,          setNotes]         = useState('')

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase
      .from('sales_channels')
      .select('id, name')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name')
      .then(({ data }) => { if (data) setChannels(data) })
  }, [open, companyId])

  function resetForm() {
    setGrossTotal(''); setLinesPerOrder(1); setChannelId('')
    setStatus('closed'); setNotes(''); setError(null); setSuccess(false)
  }

  function handleClose() {
    if (loading) return
    setOpen(false)
    resetForm()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setSuccess(false)
    const total = parseFloat(gross_total)
    if (Number.isNaN(total) || total < 0) {
      setError('El total debe ser un número válido mayor a 0.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Sesión expirada.'); setLoading(false); return }
    const { data: userRow } = await supabase
      .from('users').select('company_id').eq('id', user.id).single()
    const company_id = userRow?.company_id
    if (!company_id) { setError('Sin empresa asignada.'); setLoading(false); return }
    const today = new Date().toISOString().slice(0, 10)
    const { error: insertError } = await supabase.from('sales').insert({
      company_id, sale_date: today, gross_total: total,
      lines_per_order: lines_per_order || 1,
      channel_id: channel_id || null,
      status: status || 'closed',
      notes: notes.trim() || null,
    })
    if (insertError) { setError(insertError.message); setLoading(false); return }
    setSuccess(true); setLoading(false)
    resetForm(); router.refresh()
    setTimeout(() => { setOpen(false); setSuccess(false) }, 1200)
  }

  return (
    <>
      {/* Botón disparador — inline, sin position fixed */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-syne font-bold"
        style={{
          background: 'linear-gradient(135deg, #F5C842, #F09A1A)',
          color: '#1A1B2E', padding: '6px 13px',
          borderRadius: 7, fontSize: 12, border: 'none', cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(232,165,0,0.3)',
        }}
      >
        + Registrar venta
      </button>

      {/* Modal */}
      {open && (
        <div
          role="dialog" aria-modal="true"
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)',
          }}
          onClick={handleClose}
        >
          <div
            style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 24, width: '100%', maxWidth: 420,
              boxShadow: '0 20px 40px rgba(0,0,0,0.14)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 className="font-syne font-bold" style={{ fontSize: 16, color: 'var(--text)' }}>
                Registrar venta
              </h3>
              <button type="button" onClick={handleClose}
                style={{ color: 'var(--muted)', fontSize: 18, background: 'none', border: 'none', cursor: 'pointer' }}>
                ×
              </button>
            </div>

            {success && (
              <div style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>
                ✓ Venta registrada correctamente
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label htmlFor="rsb-total" style={labelStyle}>Total $</label>
                <input id="rsb-total" type="number" step="0.01" min="0" required
                  value={gross_total} onChange={e => setGrossTotal(e.target.value)}
                  placeholder="0.00" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>

              {channels.length > 0 && (
                <div>
                  <label htmlFor="rsb-channel" style={labelStyle}>Canal de venta</label>
                  <select id="rsb-channel" value={channel_id}
                    onChange={e => setChannelId(e.target.value)}
                    style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                    <option value="">Sin canal</option>
                    {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="rsb-lines" style={labelStyle}>Líneas por pedido</label>
                <input id="rsb-lines" type="number" min="1" value={lines_per_order}
                  onChange={e => setLinesPerOrder(parseInt(e.target.value, 10) || 1)}
                  style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>

              <div>
                <label htmlFor="rsb-status" style={labelStyle}>Estado</label>
                <select id="rsb-status" value={status}
                  onChange={e => setStatus(e.target.value)}
                  style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="rsb-notes" style={labelStyle}>Notas (opcional)</label>
                <textarea id="rsb-notes" rows={2} value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Observaciones"
                  style={{ ...inputStyle, resize: 'vertical' }}
                  onFocus={onFocus} onBlur={onBlur} />
              </div>

              {error && (
                <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--red)' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="button" onClick={handleClose} disabled={loading}
                  style={{ flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 500, background: 'var(--hover)', color: 'var(--text2)', border: '1px solid var(--border)', cursor: loading ? 'not-allowed' : 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={loading}
                  className="font-syne font-bold"
                  style={{ flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, background: loading ? 'rgba(232,165,0,0.5)' : 'linear-gradient(135deg, #F5C842, #F09A1A)', color: '#1A1B2E', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Guardando...' : 'Registrar venta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
```

---

## SOLUCIÓN AL PROBLEMA 2 — Selector de período

### src/components/dashboard/PeriodSelector.tsx

```typescript
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

const PERIODS = [
  { value: 'week',  label: 'Esta semana'    },
  { value: 'month', label: 'Este mes'       },
  { value: 'days30',label: 'Últimos 30 días'},
] as const

export default function PeriodSelector() {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()
  const current     = searchParams.get('period') ?? 'week'

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {PERIODS.map(p => (
        <button
          key={p.value}
          type="button"
          onClick={() => handleChange(p.value)}
          style={{
            padding: '5px 11px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: current === p.value ? 600 : 400,
            border: '1px solid var(--border)',
            background: current === p.value ? 'var(--gold-bg)' : 'transparent',
            color: current === p.value ? 'var(--gold)' : 'var(--text2)',
            cursor: 'pointer',
            fontFamily: 'var(--font-jakarta)',
            transition: 'all 0.12s',
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
```

---

## SOLUCIÓN AL PROBLEMA 3 y 4 — Dashboard con período funcional

### src/app/(dashboard)/dashboard/page.tsx

El dashboard ahora recibe `searchParams` para filtrar por período.
Los snapshots se filtran según el período seleccionado.
Los deltas se calculan comparando el período actual vs el anterior.

```typescript
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import KpiCard from '@/components/ui/KpiCard'
import AiInsightBox from '@/components/ui/AiInsightBox'
import RegisterSaleButton from '@/components/dashboard/RegisterSaleButton'
import PeriodSelector from '@/components/dashboard/PeriodSelector'
```

### Props del page
```typescript
interface DashboardPageProps {
  searchParams: Promise<{ period?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams
  const period = params.period ?? 'week'
```

### Lógica de fechas según período
```typescript
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('company_id').eq('id', user.id).single()
  const companyId = userData?.company_id
  if (!companyId) { /* mensaje sin empresa */ }

  // ── Calcular rango de fechas según período ───────────────
  const now = new Date()
  const currentYear = now.getFullYear()
  const startOfYear = new Date(currentYear, 0, 1)
  const currentWeek = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  )
  const currentMonth = now.getMonth() + 1

  // Semanas del período actual
  let weekNumbers: number[] = []
  if (period === 'week') {
    weekNumbers = [currentWeek]
  } else if (period === 'month') {
    // Semanas del mes actual (aprox 4 semanas)
    const firstWeekOfMonth = Math.ceil(((new Date(currentYear, currentMonth - 1, 1).getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
    weekNumbers = Array.from({ length: 4 }, (_, i) => firstWeekOfMonth + i).filter(w => w <= currentWeek)
  } else {
    // Últimos 30 días = últimas 4-5 semanas
    weekNumbers = Array.from({ length: 5 }, (_, i) => currentWeek - i).filter(w => w > 0)
  }

  // Semanas del período anterior (para deltas)
  const prevWeekNumbers = weekNumbers.map(w => w - weekNumbers.length).filter(w => w > 0)
```

### Query de snapshots agregado por período
```typescript
  // Snapshot período actual — agregar múltiples semanas
  const { data: currentSnaps } = await supabase
    .from('weekly_snapshots')
    .select('*')
    .eq('company_id', companyId)
    .eq('year', currentYear)
    .in('week_number', weekNumbers)
    .order('week_number', { ascending: false })

  const snaps = currentSnaps ?? []

  // Snapshot período anterior — para deltas
  const { data: prevSnaps } = await supabase
    .from('weekly_snapshots')
    .select('total_sales, total_transactions, avg_lpp, total_ad_spend, avg_roas, total_leads, cash_days, net_margin_pct, avg_effectiveness')
    .eq('company_id', companyId)
    .eq('year', currentYear)
    .in('week_number', prevWeekNumbers.length > 0 ? prevWeekNumbers : [0])

  const prevSnapsData = prevSnaps ?? []

  // ── Agregar valores del período actual ───────────────────
  const totalSales        = snaps.reduce((s, r) => s + (r.total_sales ?? 0), 0)
  const totalTransactions = snaps.reduce((s, r) => s + (r.total_transactions ?? 0), 0)
  const avgLpp            = snaps.length > 0 ? snaps.reduce((s, r) => s + (r.avg_lpp ?? 0), 0) / snaps.length : 0
  const totalDiscounts    = snaps.reduce((s, r) => s + (r.total_discounts ?? 0), 0)
  const totalAdSpend      = snaps.reduce((s, r) => s + (r.total_ad_spend ?? 0), 0)
  const avgRoas           = snaps.length > 0 ? snaps.reduce((s, r) => s + (r.avg_roas ?? 0), 0) / snaps.length : 0
  const totalLeads        = snaps.reduce((s, r) => s + (r.total_leads ?? 0), 0)
  const avgEffectiveness  = snaps.length > 0 ? snaps.reduce((s, r) => s + (r.avg_effectiveness ?? 0), 0) / snaps.length : 0
  const avgCashDays       = snaps.length > 0 ? snaps.reduce((s, r) => s + (r.cash_days ?? 0), 0) / snaps.length : 0
  const avgNetMargin      = snaps.length > 0 ? snaps.reduce((s, r) => s + (r.net_margin_pct ?? 0), 0) / snaps.length : 0
  const avgGrossMargin    = snaps.length > 0 ? snaps.reduce((s, r) => s + (r.gross_margin_pct ?? 0), 0) / snaps.length : 0
  const overdueRec        = snaps.length > 0 ? snaps[0].overdue_receivables ?? 0 : 0

  // ── Agregar valores del período anterior ─────────────────
  const prevTotalSales        = prevSnapsData.reduce((s, r) => s + (r.total_sales ?? 0), 0)
  const prevTotalTransactions = prevSnapsData.reduce((s, r) => s + (r.total_transactions ?? 0), 0)
  const prevAvgLpp            = prevSnapsData.length > 0 ? prevSnapsData.reduce((s, r) => s + (r.avg_lpp ?? 0), 0) / prevSnapsData.length : 0
  const prevTotalAdSpend      = prevSnapsData.reduce((s, r) => s + (r.total_ad_spend ?? 0), 0)
  const prevAvgRoas           = prevSnapsData.length > 0 ? prevSnapsData.reduce((s, r) => s + (r.avg_roas ?? 0), 0) / prevSnapsData.length : 0
  const prevAvgNetMargin      = prevSnapsData.length > 0 ? prevSnapsData.reduce((s, r) => s + (r.net_margin_pct ?? 0), 0) / prevSnapsData.length : 0

  // ── Función calcular delta % ─────────────────────────────
  function calcDelta(current: number, previous: number): number | undefined {
    if (!previous || previous === 0) return undefined
    return Math.round(((current - previous) / previous) * 100)
  }

  // ── Últimas 10 semanas para gráfica (SIEMPRE — sin importar período) ──
  const { data: historySnaps } = await supabase
    .from('weekly_snapshots')
    .select('week_number, year, total_sales')
    .eq('company_id', companyId)
    .order('year', { ascending: false })
    .order('week_number', { ascending: false })
    .limit(10)
  const history = (historySnaps ?? []).reverse()
  const maxSales = Math.max(...history.map(h => h.total_sales ?? 0), 1)

  // ── Insight ──────────────────────────────────────────────
  const { data: insight } = await supabase
    .from('ai_insights')
    .select('executive_summary, week_number, year')
    .eq('company_id', companyId)
    .order('year', { ascending: false })
    .order('week_number', { ascending: false })
    .limit(1)
    .single()

  // ── Ventas por canal ─────────────────────────────────────
  // Filtrar por fecha según período
  const dateFrom = period === 'week'
    ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    : period === 'month'
    ? `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
    : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const { data: salesByChanData } = await supabase
    .from('sales')
    .select('gross_total, channel_id, sales_channels(name)')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .neq('status', 'cancelled')
    .gte('sale_date', dateFrom)

  const channelMap: Record<string, { name: string; total: number }> = {}
  const totalAllSales = salesByChanData?.reduce((s, r) => s + (r.gross_total ?? 0), 0) ?? 0
  salesByChanData?.forEach(r => {
    const sc = (r as Record<string, unknown>).sales_channels
    const chanName = (sc && typeof sc === 'object' && sc !== null && 'name' in sc
      ? (sc as { name: string }).name : null) ?? 'Sin canal'
    const id = r.channel_id ?? 'none'
    if (!channelMap[id]) channelMap[id] = { name: chanName, total: 0 }
    channelMap[id].total += r.gross_total ?? 0
  })
  const channelData = Object.values(channelMap).sort((a, b) => b.total - a.total).slice(0, 5)

  // ── Inventario ───────────────────────────────────────────
  const { data: productsData } = await supabase
    .from('products')
    .select('id, name, current_stock, min_stock_alert, unit_cost')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .eq('is_active', true)

  const products = productsData ?? []
  const frozenCapital = products.reduce((s, p) => s + (p.current_stock ?? 0) * (p.unit_cost ?? 0), 0)
  const slowMovers = products
    .filter(p => (p.current_stock ?? 0) > (p.min_stock_alert ?? 0) * 3 && (p.min_stock_alert ?? 0) > 0)
    .sort((a, b) => (b.current_stock ?? 0) - (a.current_stock ?? 0))
    .slice(0, 3)
  const totalStock = products.reduce((s, p) => s + (p.current_stock ?? 0), 0)
  const inventoryDays = totalStock > 0 ? Math.min(Math.round(totalStock / Math.max(products.length * 0.3, 1)), 90) : 0
  const inventoryDaysPct = Math.min(Math.round((inventoryDays / 45) * 100), 100)

  // ── Finanzas ─────────────────────────────────────────────
  const { data: txData } = await supabase
    .from('bank_transactions')
    .select('type, amount, is_fixed')
    .eq('company_id', companyId)
    .gte('tx_date', dateFrom)

  const totalIncome = (txData ?? []).filter(t => t.type === 'income').reduce((s, t) => s + (t.amount ?? 0), 0)
  const totalExpenses = (txData ?? []).filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount ?? 0), 0)
  const fixedExpenses = (txData ?? []).filter(t => t.type === 'expense' && t.is_fixed).reduce((s, t) => s + (t.amount ?? 0), 0)
  const balance = totalIncome - totalExpenses
  const fixedExpensesPct = totalExpenses > 0 ? Math.round((fixedExpenses / totalExpenses) * 100) : 0

  // ── Label del período para el Topbar ─────────────────────
  const periodLabel = period === 'week'
    ? `Semana ${currentWeek} · ${currentYear}`
    : period === 'month'
    ? `${['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][currentMonth-1]} ${currentYear}`
    : 'Últimos 30 días'
```

### JSX — estructura completa

El Topbar ahora incluye el PeriodSelector y el RegisterSaleButton integrados:

```tsx
  return (
    <>
      {/* Topbar con controles integrados */}
      <div style={{
        background: 'var(--topbar-bg, var(--surface))',
        borderBottom: '1px solid var(--border)',
        padding: '0 22px',
        height: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        {/* Título izquierda */}
        <div>
          <div className="font-syne font-bold" style={{ fontSize: 15, color: 'var(--text)' }}>
            Dashboard
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
            {periodLabel}
          </div>
        </div>

        {/* Controles derecha */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Suspense fallback={null}>
            <PeriodSelector />
          </Suspense>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 6, fontSize: 11,
              border: '1px solid var(--border2)', background: 'transparent',
              color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-jakarta)',
            }}
          >
            ⬇ Exportar
          </button>
          <RegisterSaleButton companyId={companyId} />
        </div>
      </div>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* AI Insight */}
        <div style={{ marginBottom: 20 }}>
          <AiInsightBox
            variant="gold"
            title={`lumio IA · Resumen ejecutivo — Semana ${insight?.week_number ?? currentWeek}`}
            text={insight?.executive_summary ?? 'Registra ventas y pautas para ver tus primeros insights.'}
          />
        </div>

        {/* BLOQUE VENTAS */}
        <BlockHeader title="Ventas" dotColor="#E8A500" href="/sales" link="Ver detalle →" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10, marginBottom: 20 }}>
          <KpiCard label="Ventas $"       prefix="$" value={totalSales.toFixed(2)}        isGold delta={calcDelta(totalSales, prevTotalSales)} compare={prevTotalSales > 0 ? `Ant: $${prevTotalSales.toFixed(0)}` : undefined} />
          <KpiCard label="Transacciones"            value={totalTransactions}               delta={calcDelta(totalTransactions, prevTotalTransactions)} compare={prevTotalTransactions > 0 ? `Ant: ${prevTotalTransactions}` : undefined} />
          <KpiCard label="LPP"                      value={avgLpp.toFixed(1)}               delta={calcDelta(avgLpp, prevAvgLpp)} compare="líneas por pedido" />
          <KpiCard label="Margen bruto"  suffix="%"  value={avgGrossMargin.toFixed(1)}      compare="del período" />
          <KpiCard label="Contribución"  prefix="$"  value={(totalSales - totalDiscounts).toFixed(0)} />
          <KpiCard label="Descuentos"    prefix="$"  value={totalDiscounts.toFixed(2)}      compare={totalSales > 0 ? `${Math.round((totalDiscounts/totalSales)*100)}% de ventas` : undefined} />
        </div>

        {/* BLOQUE INVENTARIO */}
        <BlockHeader title="Inventario" dotColor="#2563EB" href="/inventory" link="Ver detalle →" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
          {/* KPI custom Top 3 sin movimiento */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '13px 15px' }}>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 7, fontWeight: 600 }}>Top 3 sin movimiento</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              {slowMovers.length === 0 ? (
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Sin productos estancados ✓</div>
              ) : slowMovers.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{p.name}</span>
                  <span style={{ color: 'var(--red)', fontWeight: 600, flexShrink: 0 }}>{p.current_stock} u.</span>
                </div>
              ))}
            </div>
          </div>
          {/* KPI Capital paralizado */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '13px 15px' }}>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 6, fontWeight: 600 }}>Capital paralizado</div>
            <div className="font-syne font-bold" style={{ fontSize: 22, color: frozenCapital > 0 ? 'var(--red)' : 'var(--text)', lineHeight: 1 }}>
              ${frozenCapital.toFixed(0)}
            </div>
            <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 4 }}>Liberable: liquidar o descontinuar</div>
          </div>
          {/* KPI Días inventario con barra */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '13px 15px' }}>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 7, fontWeight: 600 }}>Días de inventario</div>
            <div className="font-syne font-bold" style={{ fontSize: 22, color: 'var(--text)', lineHeight: 1, marginBottom: 5 }}>{inventoryDays} días</div>
            <div style={{ fontSize: 9, color: 'var(--muted)' }}>Óptimo: 20–45 días</div>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginTop: 8 }}>
              <div style={{ height: '100%', borderRadius: 2, background: 'linear-gradient(90deg,#F5C842,#F09A1A)', width: `${inventoryDaysPct}%` }} />
            </div>
          </div>
        </div>

        {/* BLOQUE PAUTAS */}
        <BlockHeader title="Pautas Publicitarias" dotColor="#E8A500" href="/ad-campaigns" link="Ver detalle →" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10, marginBottom: 20 }}>
          <KpiCard label="Inversión"          prefix="$" value={totalAdSpend.toFixed(2)}     delta={calcDelta(totalAdSpend, prevTotalAdSpend)} compare={prevTotalAdSpend > 0 ? `Ant: $${prevTotalAdSpend.toFixed(0)}` : undefined} />
          <KpiCard label="ROAS"                          value={avgRoas.toFixed(2)}            isGold delta={calcDelta(avgRoas, prevAvgRoas)} compare={prevAvgRoas > 0 ? `Ant: ${prevAvgRoas.toFixed(2)}` : undefined} />
          <KpiCard label="Trans. digitales"              value={snaps.reduce((s,r) => s + (r.total_transactions ?? 0), 0)} />
          <KpiCard label="Leads generados"               value={totalLeads} />
          <KpiCard label="Efectividad"       suffix="%"  value={avgEffectiveness.toFixed(1)} />
          <KpiCard label="CTR"               suffix="%"  value={snaps.length > 0 ? (snaps.reduce((s,r) => s+(r.avg_ctr??0),0)/snaps.length).toFixed(2) : 0} />
        </div>

        {/* BLOQUE FINANCIERO */}
        <BlockHeader title="Financiero" dotColor="#059669" href="/profit-loss" link="Ver P&G →" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 20 }}>
          <KpiCard label="Ingresos vs Egresos" prefix={balance >= 0 ? '+$' : '-$'} value={Math.abs(balance).toFixed(0)} compare={`Ing: $${totalIncome.toFixed(0)} / Egr: $${totalExpenses.toFixed(0)}`} />
          <KpiCard label="CxC vencidas"        prefix="$"  value={overdueRec}        compare="facturas >30 días" />
          <KpiCard label="Días de caja"                    value={avgCashDays.toFixed(0)} compare="Óptimo: >30 días" />
          <KpiCard label="Margen neto"         suffix="%"  value={avgNetMargin.toFixed(1)} delta={calcDelta(avgNetMargin, prevAvgNetMargin)} />
          <KpiCard label="Gastos fijos / Egr"  suffix="%"  value={fixedExpensesPct}   compare="Benchmark: <55%" />
        </div>

        {/* GRÁFICAS */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginTop: 20 }}>

          {/* Gráfica barras — últimas semanas */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
            <div className="font-syne font-bold" style={{ fontSize: 12, color: 'var(--text)', marginBottom: 14 }}>
              Ventas — últimas {history.length} semanas
            </div>
            {history.length === 0 ? (
              <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Sin datos históricos</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 90 }}>
                {history.map((h, i) => {
                  const heightPct = Math.max(((h.total_sales ?? 0) / maxSales) * 100, 4)
                  const isLast = i === history.length - 1
                  return (
                    <div key={`${h.year}-${h.week_number}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <div style={{
                        width: '100%', height: `${heightPct}%`,
                        borderRadius: '3px 3px 0 0',
                        background: isLast ? 'linear-gradient(180deg,#F5C842,#F09A1A)' : 'rgba(232,165,0,0.12)',
                        border: isLast ? 'none' : '1px solid rgba(232,165,0,0.08)',
                        boxShadow: isLast ? '0 0 10px rgba(232,165,0,0.25)' : 'none',
                        minHeight: 4,
                      }} />
                      <div style={{ fontSize: 8, color: isLast ? 'var(--gold)' : 'var(--muted)', fontWeight: isLast ? 600 : 400 }}>
                        S{h.week_number}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Ventas por canal */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
            <div className="font-syne font-bold" style={{ fontSize: 12, color: 'var(--text)', marginBottom: 14 }}>
              Ventas por canal
            </div>
            {channelData.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>Sin datos de canales</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {channelData.map(ch => {
                  const pct = totalAllSales > 0 ? Math.round((ch.total / totalAllSales) * 100) : 0
                  return (
                    <div key={ch.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, color: 'var(--text2)' }}>{ch.name}</span>
                        <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600 }}>
                          ${ch.total.toLocaleString('es-EC')} · {pct}%
                        </span>
                      </div>
                      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 2, background: 'linear-gradient(90deg,#F5C842,#F09A1A)', width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
```

### Componente interno BlockHeader (definir dentro del mismo page.tsx)
```typescript
// Definir ANTES del return, dentro del componente
function BlockHeader({ title, dotColor, href, link }: {
  title: string; dotColor: string; href: string; link: string
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 10, paddingBottom: 8, borderBottom: '2px solid var(--border)',
    }}>
      <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 14, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
        {title}
      </div>
      <Link href={href} style={{ fontSize: 11, color: 'var(--muted)', textDecoration: 'none' }}>
        {link}
      </Link>
    </div>
  )
}
```

---

## Reglas de código — OBLIGATORIAS

1. TypeScript estricto — searchParams es `Promise<{period?: string}>` en Next.js 15+
2. PeriodSelector usa useSearchParams — debe estar dentro de `<Suspense>`
3. La gráfica de barras lee de historySnaps — SIEMPRE las últimas 10 semanas sin importar el período
4. Los deltas usan los snaps del período anterior correspondiente
5. Si no hay snaps para el período (0 filas), todos los KPIs muestran 0
6. calcDelta retorna undefined si prev === 0 — KpiCard no muestra nada
7. El Topbar es un div custom — NO usar el componente Topbar de layout
   porque necesitamos insertar PeriodSelector y RegisterSaleButton inline
8. RegisterSaleButton ya NO usa position:fixed — es inline en el topbar
9. Comentarios en español
10. NO usar librerías externas de UI
