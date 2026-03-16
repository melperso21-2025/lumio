# PROMPT — Módulo P&G (Pérdidas y Ganancias)

## Contexto del proyecto
Estoy construyendo Lumio, una plataforma SaaS de inteligencia de negocio para PyMEs.
- Lee OBLIGATORIAMENTE docs/CURSOR_CONTEXT.md antes de escribir cualquier línea
- Los tipos de Supabase están en src/lib/supabase/database.types.ts
- Sigue el patrón de src/app/(dashboard)/finance/page.tsx para la estructura
- Este módulo NO tiene formularios — solo consolida datos existentes
- NO crear ningún componente de formulario

## Tarea
Crea UN solo archivo NUEVO. NO modifiques ningún archivo existente.

---

## ARCHIVO: src/app/(dashboard)/profit-loss/page.tsx

### Tipo
Server Component — sin 'use client'

### Imports requeridos
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import KpiCard from '@/components/ui/KpiCard'
import AiInsightBox from '@/components/ui/AiInsightBox'
```

### Lógica de datos
```typescript
// 1. Auth — igual que finance/page.tsx
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')

const { data: userData } = await supabase
  .from('users').select('company_id').eq('id', user.id).single()
const companyId = userData?.company_id
// Si no hay companyId → mensaje igual que otros módulos

// 2. Mes y año actual
const now = new Date()
const currentMonth = now.getMonth() + 1  // 1-12
const currentYear = now.getFullYear()

// Inicio y fin del mes actual (para filtrar)
const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear
const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

// 3. Ingresos del mes — desde sales
const { data: salesData } = await supabase
  .from('sales')
  .select('gross_total, production_cost, discount_amount')
  .eq('company_id', companyId)
  .is('deleted_at', null)
  .neq('status', 'cancelled')
  .gte('sale_date', monthStart)
  .lt('sale_date', monthEnd)

const sales = salesData ?? []

// 4. Egresos del mes — desde bank_transactions
const { data: expensesData } = await supabase
  .from('bank_transactions')
  .select('amount, category, concept, is_fixed, type')
  .eq('company_id', companyId)
  .gte('tx_date', monthStart)
  .lt('tx_date', monthEnd)

const transactions = expensesData ?? []

// 5. Inversión publicitaria del mes — desde ad_campaigns
const { data: adsData } = await supabase
  .from('ad_campaigns')
  .select('spend, attributed_revenue, roas')
  .eq('company_id', companyId)
  .is('deleted_at', null)
  .gte('campaign_date', monthStart)
  .lt('campaign_date', monthEnd)

const ads = adsData ?? []

// 6. Cálculos del P&G
// INGRESOS
const gross_revenue = sales.reduce((s, r) => s + (r.gross_total ?? 0), 0)
const total_discounts = sales.reduce((s, r) => s + (r.discount_amount ?? 0), 0)
const net_revenue = gross_revenue - total_discounts

// COSTO DE VENTAS
const cost_of_goods = sales.reduce((s, r) => s + (r.production_cost ?? 0), 0)
const gross_profit = net_revenue - cost_of_goods
const gross_margin_pct = net_revenue > 0
  ? (gross_profit / net_revenue) * 100 : 0

// GASTOS OPERATIVOS (desde bank_transactions type=expense)
const operating_expenses = transactions
  .filter(t => t.type === 'expense')
  .reduce((s, t) => s + (t.amount ?? 0), 0)

// Desglose de gastos por categoría
const expensesByCategory = transactions
  .filter(t => t.type === 'expense')
  .reduce((acc, t) => {
    const cat = t.category ?? 'other'
    acc[cat] = (acc[cat] ?? 0) + (t.amount ?? 0)
    return acc
  }, {} as Record<string, number>)

const fixed_expenses = transactions
  .filter(t => t.type === 'expense' && t.is_fixed)
  .reduce((s, t) => s + (t.amount ?? 0), 0)
const variable_expenses = operating_expenses - fixed_expenses

// INVERSIÓN PUBLICITARIA
const ad_spend = ads.reduce((s, a) => s + (a.spend ?? 0), 0)
const ad_revenue = ads.reduce((s, a) => s + (a.attributed_revenue ?? 0), 0)
const avg_roas = ad_spend > 0 ? ad_revenue / ad_spend : 0

// RESULTADO FINAL
const total_expenses_all = operating_expenses + ad_spend
const ebitda = gross_profit - total_expenses_all
const net_margin_pct = net_revenue > 0
  ? (ebitda / net_revenue) * 100 : 0

// Nombre del mes en español
const monthNames = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
]
const monthLabel = `${monthNames[currentMonth - 1]} ${currentYear}`
```

### JSX — estructura exacta

**Sección 1 — Topbar:**
```tsx
<Topbar
  pageTitle="P&G"
  pageSubtitle={`Pérdidas y Ganancias · ${monthLabel}`}
/>
```

**Sección 2 — AiInsightBox resumen:**
```tsx
<AiInsightBox
  variant={ebitda >= 0 ? 'green' : 'red'}
  title={ebitda >= 0 ? `✓ Resultado positivo — ${monthLabel}` : `⚠ Resultado negativo — ${monthLabel}`}
  text={`Ingresos netos: $${net_revenue.toFixed(2)} · Gastos totales: $${total_expenses_all.toFixed(2)} · ${
    ebitda >= 0
      ? `Ganancia: $${ebitda.toFixed(2)} (margen ${net_margin_pct.toFixed(1)}%)`
      : `Pérdida: $${Math.abs(ebitda).toFixed(2)}. Revisa tus gastos operativos y considera aumentar ingresos.`
  }`}
/>
```

**Sección 3 — Grid 4 KpiCards (resumen ejecutivo):**
```
display: grid, gridTemplateColumns: repeat(4, 1fr), gap: 10
```
- KpiCard label="Ingresos netos" prefix="$" value={net_revenue.toFixed(2)} isGold
- KpiCard label="Margen bruto" suffix="%" value={gross_margin_pct.toFixed(1)}
- KpiCard label="Gastos totales" prefix="$" value={total_expenses_all.toFixed(2)}
- KpiCard label="Resultado neto" prefix="$" value={ebitda.toFixed(2)}
  — si ebitda >= 0: isGold=true
  — si ebitda < 0: mostrar value con color var(--red) usando style inline

**Sección 4 — Grid 3 columnas (detalle del P&G):**
```
display: grid, gridTemplateColumns: 'repeat(3, 1fr)', gap: 16
```

**Columna 1 — Card "Ingresos":**
```
background: var(--card), border: 1px solid var(--border)
border-radius: 12, padding: 20
```
Header: punto verde (●) + "Ingresos" font-syne bold 14px

Filas del estado financiero (patrón común para todas):
```tsx
// Cada fila:
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
  <span style={{ fontSize: 12, color: 'var(--text2)' }}>Concepto</span>
  <span style={{ fontSize: 13, fontFamily: 'var(--font-syne)', fontWeight: 600, color: 'var(--text)' }}>$ {valor}</span>
</div>
```

Filas a mostrar:
- "Ventas brutas"     → gross_revenue    color var(--text)
- "(-) Descuentos"   → total_discounts  color var(--red) con prefijo "-$"
- Línea separadora
- "Ingresos netos"   → net_revenue      color var(--gold) font-bold texto más grande (15px)
- "(-) Costo ventas" → cost_of_goods    color var(--red) con prefijo "-$"
- Línea separadora
- "Ganancia bruta"   → gross_profit     color var(--green) si > 0, var(--red) si < 0
- "Margen bruto"     → gross_margin_pct suffix "%" color var(--muted) fontSize 11

**Columna 2 — Card "Gastos operativos":**
Header: punto rojo (●) + "Gastos operativos" font-syne bold 14px

Filas fijas:
- "Gastos fijos"     → fixed_expenses   color var(--red)
- "Gastos variables" → variable_expenses color var(--orange)
- Línea separadora
- "Total operativo"  → operating_expenses font-bold

Luego desglose por categoría (si hay datos):
```tsx
{Object.entries(expensesByCategory)
  .sort((a, b) => b[1] - a[1])
  .map(([cat, amount]) => (
    // fila con nombre de categoría capitalizado y monto
    // color var(--text2), fontSize 11
  ))
}
```

Categorías a traducir:
```typescript
const catLabels: Record<string, string> = {
  payroll:   'Nómina',
  marketing: 'Marketing',
  supplier:  'Proveedores',
  rent:      'Arriendo',
  utilities: 'Servicios',
  taxes:     'Impuestos',
  logistics: 'Logística',
  other:     'Otros',
}
```

**Columna 3 — Card "Publicidad & Resultado":**
Header: punto dorado (●) + "Publicidad & Resultado" font-syne bold 14px

Sección publicidad:
- "Inversión pauta"   → ad_spend   color var(--text)
- "Ventas atribuidas" → ad_revenue color var(--green)
- "ROAS"             → avg_roas.toFixed(2) color var(--gold) font-syne bold

Línea separadora con label "RESULTADO FINAL" en uppercase muted 9px

Resultado final:
- "(-) Gastos totales"  → total_expenses_all  color var(--red)
- Línea separadora
- "RESULTADO NETO"     → ebitda  fontSize 18, font-syne bold
  color var(--green) si >= 0, var(--red) si < 0
  prefix "$"
- "Margen neto"        → net_margin_pct suffix "%" color var(--muted) fontSize 11

---

## Notas técnicas importantes

1. Este módulo es de SOLO LECTURA — no tiene formularios ni botones de acción
2. Los datos vienen de 3 tablas: sales, bank_transactions, ad_campaigns
3. Filtrar SIEMPRE por el mes actual usando gte/lt con las fechas calculadas
4. sales: filtrar por deleted_at IS NULL y status != 'cancelled'
5. bank_transactions: NO tiene deleted_at (es inmutable) — NO agregar .is('deleted_at', null)
6. ad_campaigns: filtrar por deleted_at IS NULL
7. Si no hay datos en alguna tabla, mostrar 0 (no errores)
8. El P&G muestra el mes actual — en versiones futuras el Topbar selector de período lo controlará

---

## Reglas de código — OBLIGATORIAS

1. TypeScript estricto — tipos explícitos
2. Variables CSS — SOLO var(--gold), var(--text), etc.
3. Comentarios en español
4. NO usar librerías externas de UI
5. Server Component — sin 'use client'
6. Fuentes: títulos y valores en font-syne, etiquetas en font-jakarta
7. Manejar caso de 0 datos gracefully (mostrar ceros, no errores)
