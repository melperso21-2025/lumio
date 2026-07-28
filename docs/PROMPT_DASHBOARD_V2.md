# PROMPT — Dashboard v2.0 (alineado al wireframe completo)

## Contexto del proyecto
Estoy construyendo Lumio, una plataforma SaaS de inteligencia de negocio para PyMEs.
- Lee OBLIGATORIAMENTE docs/CURSOR_CONTEXT.md antes de escribir cualquier línea
- Los tipos de Supabase están en src/lib/supabase/database.types.ts
- Referencia visual EXACTA: wireframe v2.0, página "dashboard"
- Sigue el patrón de autenticación de src/app/(dashboard)/sales/page.tsx

## Tarea
REEMPLAZA el archivo existente:
src/app/(dashboard)/dashboard/page.tsx

Crea UN archivo NUEVO:
src/components/dashboard/RegisterSaleButton.tsx

NO modifiques ningún otro archivo.

---

## CAMBIOS VISUALES CLAVE vs versión actual

1. Bloques separados por línea (block-header) — NO cards con borde completo
2. Bloque Inventario — faltaba completamente, agregar con 3 KPIs
3. Bloque Finanzas — 5 KPIs incluyendo Ingresos vs Egresos
4. Gráfica de barras CSS — Ventas últimas 10 semanas
5. Ventas por canal — barras de progreso con %
6. Botón "+ Registrar venta" en el Topbar (via prop primaryAction)
7. KpiCards con delta ▲▼ calculado desde weekly_snapshots anterior

---

## ARCHIVO 1: src/app/(dashboard)/dashboard/page.tsx

### Tipo
Server Component — sin 'use client'

### Imports requeridos
```typescript
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import KpiCard from '@/components/ui/KpiCard'
import AiInsightBox from '@/components/ui/AiInsightBox'
import RegisterSaleButton from '@/components/dashboard/RegisterSaleButton'
```

### Lógica de datos completa
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')

const { data: userData } = await supabase
  .from('users')
  .select('company_id')
  .eq('id', user.id)
  .single()

const companyId = userData?.company_id
// Si no hay companyId → mensaje igual que otros módulos

// ── Semana y año actual ──────────────────────────────────
const now = new Date()
const currentYear = now.getFullYear()
const startOfYear = new Date(currentYear, 0, 1)
const weekNumber = Math.ceil(
  ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
)

// ── Snapshot semana actual ───────────────────────────────
const { data: snap } = await supabase
  .from('weekly_snapshots')
  .select('*')
  .eq('company_id', companyId)
  .order('year', { ascending: false })
  .order('week_number', { ascending: false })
  .limit(1)
  .single()

// ── Snapshot semana anterior (para deltas) ───────────────
const { data: prevSnap } = await supabase
  .from('weekly_snapshots')
  .select('total_sales, total_transactions, avg_lpp, total_ad_spend, avg_roas, total_leads, cash_days, net_margin_pct')
  .eq('company_id', companyId)
  .order('year', { ascending: false })
  .order('week_number', { ascending: false })
  .limit(1)
  .range(1, 1)
  .single()

// ── Insight más reciente ─────────────────────────────────
const { data: insight } = await supabase
  .from('ai_insights')
  .select('executive_summary, week_number, year')
  .eq('company_id', companyId)
  .order('year', { ascending: false })
  .order('week_number', { ascending: false })
  .limit(1)
  .single()

// ── Últimas 10 semanas para gráfica ─────────────────────
const { data: snapshotsHistory } = await supabase
  .from('weekly_snapshots')
  .select('week_number, year, total_sales')
  .eq('company_id', companyId)
  .order('year', { ascending: false })
  .order('week_number', { ascending: false })
  .limit(10)
const history = (snapshotsHistory ?? []).reverse()

// ── Ventas por canal ─────────────────────────────────────
const { data: salesByChanData } = await supabase
  .from('sales')
  .select('gross_total, channel_id, sales_channels(name)')
  .eq('company_id', companyId)
  .is('deleted_at', null)
  .neq('status', 'cancelled')

// Agrupar por canal
const channelMap: Record<string, { name: string; total: number }> = {}
const totalAllSales = salesByChanData?.reduce((s, r) => s + (r.gross_total ?? 0), 0) ?? 0
salesByChanData?.forEach(r => {
  const chanName = (r as any).sales_channels?.name ?? 'Sin canal'
  const id = r.channel_id ?? 'none'
  if (!channelMap[id]) channelMap[id] = { name: chanName, total: 0 }
  channelMap[id].total += r.gross_total ?? 0
})
const channelData = Object.values(channelMap)
  .sort((a, b) => b.total - a.total)
  .slice(0, 5)

// ── Inventario: productos sin movimiento ─────────────────
const { data: productsData } = await supabase
  .from('products')
  .select('id, name, current_stock, min_stock_alert, unit_cost, sale_price')
  .eq('company_id', companyId)
  .is('deleted_at', null)
  .eq('is_active', true)

const products = productsData ?? []

// Capital paralizado = suma de (stock * costo) de todos los productos activos
const frozenCapital = products.reduce((s, p) =>
  s + (p.current_stock ?? 0) * (p.unit_cost ?? 0), 0
)

// Top 3 productos sin movimiento (stock alto, rotación baja — proxy: stock > min * 5)
const slowMovers = products
  .filter(p => (p.current_stock ?? 0) > (p.min_stock_alert ?? 0) * 3 && (p.min_stock_alert ?? 0) > 0)
  .sort((a, b) => (b.current_stock ?? 0) - (a.current_stock ?? 0))
  .slice(0, 3)

// Días de inventario (stock total / rotación estimada)
const totalStock = products.reduce((s, p) => s + (p.current_stock ?? 0), 0)
const inventoryDays = totalStock > 0 ? Math.min(Math.round(totalStock / Math.max(products.length * 0.3, 1)), 90) : 0
const inventoryDaysPct = Math.min(Math.round((inventoryDays / 45) * 100), 100)

// ── Datos financieros del mes ────────────────────────────
const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
const { data: txData } = await supabase
  .from('bank_transactions')
  .select('type, amount, is_fixed')
  .eq('company_id', companyId)
  .gte('tx_date', monthStart)

const totalIncome = (txData ?? []).filter(t => t.type === 'income').reduce((s, t) => s + (t.amount ?? 0), 0)
const totalExpenses = (txData ?? []).filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount ?? 0), 0)
const fixedExpenses = (txData ?? []).filter(t => t.type === 'expense' && t.is_fixed).reduce((s, t) => s + (t.amount ?? 0), 0)
const balance = totalIncome - totalExpenses
const fixedExpensesPct = totalExpenses > 0 ? Math.round((fixedExpenses / totalExpenses) * 100) : 0

// ── Calcular deltas (% cambio vs semana anterior) ────────
function calcDelta(current: number | null | undefined, previous: number | null | undefined): number | undefined {
  if (!current || !previous || previous === 0) return undefined
  return Math.round(((current - previous) / previous) * 100)
}

const weekLabel = snap?.week_number != null
  ? `Semana ${snap.week_number} · ${snap.year}`
  : `Semana ${weekNumber} · ${currentYear}`

// Máximo de ventas para la gráfica (para calcular alturas relativas)
const maxSales = Math.max(...history.map(h => h.total_sales ?? 0), 1)
```

### JSX — estructura EXACTA del wireframe v2.0

**Topbar con botón "+ Registrar venta":**
```tsx
<>
  <Topbar
    pageTitle="Dashboard"
    pageSubtitle={weekLabel}
  />
  {/* Botón flotante en topbar — posicionado en top-right via RegisterSaleButton */}
  <RegisterSaleButton companyId={companyId} />

  <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 0 }}>
```

**AI Insight Central:**
```tsx
{/* Mismo AiInsightBox gold con el executive_summary */}
<div style={{ marginBottom: 20 }}>
  <AiInsightBox
    variant="gold"
    title={`lumio IA · Resumen ejecutivo — Semana ${insight?.week_number ?? weekNumber}`}
    text={
      insight?.executive_summary ??
      'Aún no hay suficientes datos para generar un análisis. Registra ventas y pautas para ver tus primeros insights.'
    }
  />
</div>
```

**PATRÓN BLOQUE — usar este patrón para los 4 bloques:**
```tsx
{/* Separador de bloque — igual al wireframe */}
<div style={{
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 10,
  paddingBottom: 8,
  borderBottom: '2px solid var(--border)',
}}>
  <div style={{
    fontFamily: 'var(--font-syne)',
    fontWeight: 700,
    fontSize: 14,
    color: 'var(--text)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  }}>
    <div style={{
      width: 8, height: 8, borderRadius: '50%',
      background: COLOR_DEL_BLOQUE,  // dorado, azul, verde según bloque
      flexShrink: 0,
    }} />
    TÍTULO DEL BLOQUE
  </div>
  <Link href="/RUTA" style={{ fontSize: 11, color: 'var(--muted)', textDecoration: 'none' }}>
    Ver detalle →
  </Link>
</div>
```

---

**BLOQUE 1 — VENTAS (punto dorado #E8A500, link /sales):**

6 KpiCards en `display:grid gridTemplateColumns:repeat(6,1fr) gap:10px marginBottom:20px`:

```tsx
<KpiCard label="Ventas $"       prefix="$" value={snap?.total_sales ?? 0}       isGold delta={calcDelta(snap?.total_sales, prevSnap?.total_sales)} compare={prevSnap?.total_sales ? `Ant: $${prevSnap.total_sales}` : undefined} />
<KpiCard label="Transacciones"            value={snap?.total_transactions ?? 0}        delta={calcDelta(snap?.total_transactions, prevSnap?.total_transactions)} compare={prevSnap?.total_transactions ? `Ant: ${prevSnap.total_transactions}` : undefined} />
<KpiCard label="LPP"                      value={snap?.avg_lpp ?? 0}                   delta={calcDelta(snap?.avg_lpp, prevSnap?.avg_lpp)} compare="líneas por pedido" />
<KpiCard label="Costo $"       prefix="$" value={snap?.total_cost ?? 0}               compare={snap?.gross_margin_pct ? `Margen: ${snap.gross_margin_pct}%` : undefined} />
<KpiCard label="Contribución"  prefix="$" value={
  snap ? (snap.total_sales ?? 0) - (snap.total_cost ?? 0) - (snap.total_discounts ?? 0) : 0
} />
<KpiCard label="Descuentos"    prefix="$" value={snap?.total_discounts ?? 0}           compare={snap?.total_sales && snap.total_discounts ? `${Math.round((snap.total_discounts/snap.total_sales)*100)}% de ventas` : undefined} />
```

---

**BLOQUE 2 — INVENTARIO (punto azul #2563EB, link /inventory):**

3 KPIs especiales en `display:grid gridTemplateColumns:repeat(3,1fr) gap:10px marginBottom:20px`:

**KPI 1 — Top 3 sin movimiento (card custom, NO KpiCard):**
```tsx
<div style={{
  background: 'var(--card)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '13px 15px', position: 'relative', overflow: 'hidden',
}}>
  <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 7, fontWeight: 600 }}>
    Top 3 sin movimiento
  </div>
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
    {slowMovers.length === 0 ? (
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>Sin productos estancados ✓</div>
    ) : (
      slowMovers.map(p => (
        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span style={{ color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
            {p.name}
          </span>
          <span style={{ color: 'var(--red)', fontWeight: 600, flexShrink: 0 }}>
            {p.current_stock} u.
          </span>
        </div>
      ))
    )}
  </div>
</div>
```

**KPI 2 — Capital paralizado:**
```tsx
<KpiCard
  label="Capital paralizado en stock"
  prefix="$"
  value={frozenCapital.toFixed(0)}
  compare="Liberable: liquidar o descontinuar"
/>
// Si frozenCapital > 0, el value debe mostrarse en var(--red)
// Usar un div wrapper si KpiCard no soporta color de value dinámico:
// O agregar prop isRed a KpiCard (si no existe, usar div custom igual al KPI1)
```

**KPI 3 — Días de inventario con barra de progreso (card custom):**
```tsx
<div style={{
  background: 'var(--card)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '13px 15px',
}}>
  <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 7, fontWeight: 600 }}>
    Días de inventario general
  </div>
  <div className="font-syne font-bold" style={{ fontSize: 22, color: 'var(--text)', lineHeight: 1, marginBottom: 5 }}>
    {inventoryDays} días
  </div>
  <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>
    Óptimo: 20–45 días
  </div>
  {/* Barra de progreso */}
  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginTop: 8 }}>
    <div style={{
      height: '100%', borderRadius: 2,
      background: 'linear-gradient(90deg, #F5C842, #F09A1A)',
      width: `${inventoryDaysPct}%`,
      transition: 'width 0.3s ease',
    }} />
  </div>
</div>
```

---

**BLOQUE 3 — PAUTAS PUBLICITARIAS (punto dorado #E8A500, link /ad-campaigns):**

6 KpiCards en grid 6 columnas:
```tsx
<KpiCard label="Inversión"          prefix="$" value={snap?.total_ad_spend ?? 0}      delta={calcDelta(snap?.total_ad_spend, prevSnap?.total_ad_spend)} compare={prevSnap?.total_ad_spend ? `Ant: $${prevSnap.total_ad_spend}` : undefined} />
<KpiCard label="ROAS"                          value={snap?.avg_roas ?? 0}             isGold delta={calcDelta(snap?.avg_roas, prevSnap?.avg_roas)} compare={prevSnap?.avg_roas ? `Ant: ${prevSnap.avg_roas}` : undefined} />
<KpiCard label="Trans. digitales"              value={snap?.total_ad_transactions ?? 0} />
<KpiCard label="Leads generados"               value={snap?.total_leads ?? 0} />
<KpiCard label="Calidad contactos" suffix="%"  value={snap?.avg_quality_pct ?? 0} />
<KpiCard label="Efectividad"       suffix="%"  value={snap?.avg_effectiveness ?? 0} />
```

---

**BLOQUE 4 — FINANCIERO (punto verde #059669, link /finance, texto "Ver P&G →" → /profit-loss):**

5 KpiCards en grid 5 columnas:
```tsx
<KpiCard
  label="Ingresos vs Egresos"
  prefix={balance >= 0 ? '+$' : '-$'}
  value={Math.abs(balance).toFixed(0)}
  compare={`Ing: $${totalIncome.toFixed(0)} / Egr: $${totalExpenses.toFixed(0)}`}
/>
<KpiCard label="CxC vencidas"     prefix="$" value={snap?.overdue_receivables ?? 0}    compare="facturas >30 días" />
<KpiCard label="Días de caja"                 value={snap?.cash_days ?? 0}              compare="Óptimo: >30 días" />
<KpiCard label="Margen neto mes"  suffix="%"  value={snap?.net_margin_pct ?? 0}         delta={calcDelta(snap?.net_margin_pct, prevSnap?.net_margin_pct)} />
<KpiCard label="Gastos fijos / Egresos" suffix="%" value={fixedExpensesPct}             compare="Benchmark: <55%" />
```

---

**SECCIÓN FINAL — GRÁFICAS (grid 2-1):**

```tsx
<div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginTop: 20 }}>
```

**Card izquierda — Gráfica de barras CSS (ventas últimas 10 semanas):**
```tsx
<div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
    <div className="font-syne font-bold" style={{ fontSize: 12, color: 'var(--text)' }}>
      Ventas — últimas {history.length} semanas
    </div>
  </div>
  {history.length === 0 ? (
    <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>Sin datos históricos</span>
    </div>
  ) : (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 90 }}>
      {history.map((h, i) => {
        const heightPct = maxSales > 0 ? Math.max(((h.total_sales ?? 0) / maxSales) * 100, 4) : 4
        const isLast = i === history.length - 1
        return (
          <div key={`${h.year}-${h.week_number}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{
              width: '100%',
              height: `${heightPct}%`,
              borderRadius: '3px 3px 0 0',
              background: isLast
                ? 'linear-gradient(180deg, #F5C842, #F09A1A)'
                : 'rgba(232,165,0,0.12)',
              border: isLast ? 'none' : '1px solid rgba(232,165,0,0.08)',
              boxShadow: isLast ? '0 0 10px rgba(232,165,0,0.25)' : 'none',
              minHeight: 4,
              transition: 'height 0.3s ease',
            }} />
            <div style={{
              fontSize: 8,
              color: isLast ? 'var(--gold)' : 'var(--muted)',
              textAlign: 'center',
              fontWeight: isLast ? 600 : 400,
            }}>
              S{h.week_number}
            </div>
          </div>
        )
      })}
    </div>
  )}
</div>
```

**Card derecha — Ventas por canal con barras de progreso:**
```tsx
<div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
  <div className="font-syne font-bold" style={{ fontSize: 12, color: 'var(--text)', marginBottom: 14 }}>
    Ventas por canal
  </div>
  {channelData.length === 0 ? (
    <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>
      Sin datos de canales
    </p>
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
              <div style={{
                height: '100%', borderRadius: 2,
                background: 'linear-gradient(90deg, #F5C842, #F09A1A)',
                width: `${pct}%`,
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )}
</div>
```

---

## ARCHIVO 2: src/components/dashboard/RegisterSaleButton.tsx

### Tipo
'use client'

### Props
```typescript
interface RegisterSaleButtonProps {
  companyId: string
}
```

### Descripción
Botón flotante "+ Registrar venta" que aparece en la esquina superior derecha del dashboard,
posicionado con `position: fixed` para que esté siempre visible.
Al hacer clic abre el mismo modal de QuickSaleForm.

### Imports
```typescript
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
```

### Estado
```typescript
const [open, setOpen] = useState(false)
const [channels, setChannels] = useState<{ id: string; name: string }[]>([])
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
const [success, setSuccess] = useState(false)
const [gross_total, setGrossTotal] = useState('')
const [lines_per_order, setLinesPerOrder] = useState(1)
const [channel_id, setChannelId] = useState('')
const [status, setStatus] = useState('closed')
const [notes, setNotes] = useState('')
```

### useEffect — cargar canales al abrir
```typescript
useEffect(() => {
  if (!open) return
  const supabase = createClient()
  supabase
    .from('sales_channels')
    .select('id, name')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('name')
    .then(({ data }) => {
      if (data) setChannels(data)
    })
}, [open, companyId])
```

### handleSubmit — igual que QuickSaleForm
```typescript
// Obtener user → company_id → INSERT en sales
// Igual que QuickSaleForm.tsx
```

### JSX

**Botón disparador — posición fixed top-right:**
```tsx
<div style={{
  position: 'fixed',
  top: 12,   // alineado con el topbar
  right: 20,
  zIndex: 100,
  display: 'flex',
  gap: 8,
  alignItems: 'center',
}}>
  <button
    type="button"
    onClick={() => setOpen(true)}
    className="font-syne font-bold"
    style={{
      background: 'linear-gradient(135deg, #F5C842, #F09A1A)',
      color: '#1A1B2E',
      padding: '6px 13px',
      borderRadius: 7,
      fontSize: 12,
      border: 'none',
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(232,165,0,0.3)',
    }}
  >
    + Registrar venta
  </button>
</div>
```

**Modal — mismo patrón que QuickSaleForm.tsx:**
- Modal con overlay oscuro `rgba(0,0,0,0.45)`
- maxWidth 420
- Campos: Total $, Canal (si hay canales), Líneas por pedido, Estado, Notas
- Botones Cancelar y Registrar
- Mensaje de éxito verde, mensaje de error rojo
- Al éxito: `router.refresh()` y cerrar después de 1200ms

**Estilos de inputs — copiar EXACTAMENTE de QuickSaleForm.tsx:**
```typescript
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
```

---

## Reglas de código — OBLIGATORIAS

1. TypeScript estricto — tipos explícitos en TODO
2. Variables CSS — SOLO var(--gold), var(--text), etc. en el dashboard
3. Soft delete — .is('deleted_at', null) en todas las queries
4. Si snap es null (no hay weekly_snapshots), todos los KPIs muestran 0 o "—"
5. Si prevSnap es null, los deltas muestran undefined (KpiCard no muestra nada)
6. La gráfica de barras es CSS puro — NO usar Chart.js ni Recharts
7. Las barras tienen height mínimo de 4px para que siempre sean visibles
8. La barra de la semana actual (última) siempre es dorada
9. Comentarios en español
10. NO usar librerías externas de UI
11. calcDelta devuelve undefined si algún valor es null/0 — nunca mostrar NaN
12. El bloque Inventario usa cards custom (no KpiCard) para Top 3 y Días de inventario
13. RegisterSaleButton se importa en el page.tsx y se renderiza antes del contenido
    Aparece como botón fixed en la esquina superior derecha del viewport
