# PROMPT — Dashboard v2.3 — Fixes definitivos

## Contexto
Estoy construyendo Lumio, plataforma SaaS para PyMEs.
- Lee docs/CURSOR_CONTEXT.md antes de escribir
- Los tipos están en src/lib/supabase/database.types.ts
- La tabla weekly_snapshots tiene estas columnas relevantes:
  total_sales, total_transactions, avg_ticket, avg_lpp, total_discounts,
  gross_margin_pct, total_ad_spend, avg_roas, total_leads, avg_effectiveness,
  avg_ctr, inventory_days, frozen_capital, cash_days, overdue_receivables,
  net_margin_pct, fixed_vs_total_pct

## Tarea
REEMPLAZA SOLO src/app/(dashboard)/dashboard/page.tsx
NO modifiques ningún otro archivo.

## Problemas a resolver

### PROBLEMA 1 — Query de período anterior incompleto
El query prevSnaps solo pide algunas columnas. Hay que pedir TODAS
las columnas numéricas para poder calcular todos los deltas.

CAMBIO en el query prevSnaps:
```typescript
// ANTES — columnas insuficientes
const { data: prevSnaps } = await supabase
  .from('weekly_snapshots')
  .select('total_sales, total_transactions, avg_lpp, total_ad_spend, avg_roas, total_leads, cash_days, net_margin_pct, avg_effectiveness')

// DESPUÉS — todas las columnas numéricas
const { data: prevSnaps } = await supabase
  .from('weekly_snapshots')
  .select('total_sales, total_transactions, avg_lpp, total_discounts, gross_margin_pct, total_ad_spend, avg_roas, total_leads, avg_effectiveness, avg_ctr, cash_days, net_margin_pct, fixed_vs_total_pct')
  .eq('company_id', companyId)
  .eq('year', currentYear)
  .in('week_number', prevWeekNumbers.length > 0 ? prevWeekNumbers : [0])
```

### PROBLEMA 2 — Variables del período anterior incompletas
Agregar las variables que faltan después de calcular las existentes:

```typescript
// Agregar estas variables que faltan:
const prevTotalDiscounts = prevSnapsData.reduce((s, r) => s + (r.total_discounts ?? 0), 0)
const prevAvgGrossMargin = prevSnapsData.length > 0
  ? prevSnapsData.reduce((s, r) => s + (r.gross_margin_pct ?? 0), 0) / prevSnapsData.length : 0
const prevTotalLeads = prevSnapsData.reduce((s, r) => s + (r.total_leads ?? 0), 0)
const prevAvgEffectiveness = prevSnapsData.length > 0
  ? prevSnapsData.reduce((s, r) => s + (r.avg_effectiveness ?? 0), 0) / prevSnapsData.length : 0
const prevAvgCtr = prevSnapsData.length > 0
  ? prevSnapsData.reduce((s, r) => s + (r.avg_ctr ?? 0), 0) / prevSnapsData.length : 0
const prevFixedVsTotal = prevSnapsData.length > 0
  ? prevSnapsData.reduce((s, r) => s + (r.fixed_vs_total_pct ?? 0), 0) / prevSnapsData.length : 0
const prevTotalTransactions = prevSnapsData.reduce((s, r) => s + (r.total_transactions ?? 0), 0)
```

### PROBLEMA 3 — inventory_days ya existe en la tabla
No hay que calcularlo — leerlo directamente del snapshot:

```typescript
// ELIMINAR todo el bloque de cálculo de inventoryDays (dailySalesUnits, etc.)
// REEMPLAZAR con:
const inventoryDays = snaps.length > 0
  ? Math.round(snaps.reduce((s, r) => s + (r.inventory_days ?? 0), 0) / snaps.length)
  : 0
const inventoryDaysPct = Math.min(Math.round((inventoryDays / 60) * 100), 100)
```

### PROBLEMA 4 — KpiCards sin delta, agregar los que faltan

BLOQUE VENTAS — actualizar estas KpiCards:
```tsx
// Margen bruto — agregar delta
<KpiCard
  label="Margen bruto"
  suffix="%"
  value={avgGrossMargin.toFixed(1)}
  delta={calcDelta(avgGrossMargin, prevAvgGrossMargin)}
  compare="del período"
/>

// Contribución — agregar delta
<KpiCard
  label="Contribución"
  prefix="$"
  value={(totalSales - totalDiscounts).toFixed(0)}
  delta={calcDelta(totalSales - totalDiscounts, prevTotalSales - prevTotalDiscounts)}
/>

// Descuentos — agregar delta
<KpiCard
  label="Descuentos"
  prefix="$"
  value={totalDiscounts.toFixed(2)}
  delta={calcDelta(totalDiscounts, prevTotalDiscounts)}
  compare={totalSales > 0 ? `${Math.round((totalDiscounts / totalSales) * 100)}% de ventas` : undefined}
/>
```

BLOQUE PAUTAS — actualizar estas KpiCards:
```tsx
// Trans. digitales — usar total_transactions del snap (proxy) con delta
// NOTA: no existe total_ad_transactions en snapshots, usar total_transactions del período de ads
// Por ahora mostrar leads como proxy de actividad digital
<KpiCard
  label="Trans. digitales"
  value={snaps.reduce((s, r) => s + (r.total_transactions ?? 0), 0)}
  delta={calcDelta(
    snaps.reduce((s, r) => s + (r.total_transactions ?? 0), 0),
    prevTotalTransactions
  )}
/>

// Leads generados — agregar delta
<KpiCard
  label="Leads generados"
  value={totalLeads}
  delta={calcDelta(totalLeads, prevTotalLeads)}
  compare={prevTotalLeads > 0 ? `Ant: ${prevTotalLeads}` : undefined}
/>

// Efectividad — agregar delta
<KpiCard
  label="Efectividad"
  suffix="%"
  value={avgEffectiveness.toFixed(1)}
  delta={calcDelta(avgEffectiveness, prevAvgEffectiveness)}
  compare={prevAvgEffectiveness > 0 ? `Ant: ${prevAvgEffectiveness.toFixed(1)}%` : undefined}
/>

// CTR — agregar delta
<KpiCard
  label="CTR"
  suffix="%"
  value={snaps.length > 0
    ? (snaps.reduce((s, r) => s + (r.avg_ctr ?? 0), 0) / snaps.length).toFixed(2)
    : '0'
  }
  delta={calcDelta(
    snaps.length > 0 ? snaps.reduce((s, r) => s + (r.avg_ctr ?? 0), 0) / snaps.length : 0,
    prevAvgCtr
  )}
  compare={prevAvgCtr > 0 ? `Ant: ${prevAvgCtr.toFixed(2)}%` : undefined}
/>
```

BLOQUE FINANCIERO — actualizar Gastos fijos:
```tsx
// Gastos fijos / Egresos — agregar delta
<KpiCard
  label="Gastos fijos / Egr"
  suffix="%"
  value={fixedExpensesPct}
  delta={calcDelta(fixedExpensesPct, Math.round(prevFixedVsTotal))}
  compare="Benchmark: <55%"
/>
```

### PROBLEMA 5 — Gráfica: mostrar valor encima de la barra más alta
Agregar el monto de la semana más alta visible sobre su barra:

```tsx
// En el map de history, identificar la barra más alta
const maxIdx = history.reduce((maxI, h, i, arr) =>
  (h.total_sales ?? 0) > (arr[maxI].total_sales ?? 0) ? i : maxI, 0)

// Dentro del map, agregar etiqueta encima de la barra más alta:
{i === maxIdx && (
  <div style={{
    position: 'absolute',
    top: -16,
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: 7,
    color: 'var(--gold)',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  }}>
    ${((h.total_sales ?? 0) / 1000).toFixed(1)}k
  </div>
)}
// El div contenedor de la barra necesita position: 'relative'
```

### PROBLEMA 6 — Actualizar el insight de IA
El texto del AiInsightBox del dashboard muestra el insight antiguo (generado antes
de importar los datos). Agregar un mensaje condicional si el insight es de
una semana anterior a la actual:

```tsx
// Calcular si el insight está desactualizado
const insightIsStale = insight && insight.week_number !== currentWeek

// Cambiar el AiInsightBox:
<AiInsightBox
  variant={insightIsStale ? 'blue' : 'gold'}
  title={insightIsStale
    ? `lumio IA · Resumen semana ${insight?.week_number ?? currentWeek} (desactualizado)`
    : `lumio IA · Resumen ejecutivo — Semana ${insight?.week_number ?? currentWeek}`
  }
  text={insightIsStale
    ? `Este análisis es de la semana ${insight?.week_number}. Ve a IA Insights para generar el análisis actualizado de la semana ${currentWeek}.`
    : (insight?.executive_summary ?? 'Registra ventas y pautas para ver tus primeros insights.')
  }
/>
```

---

## RESUMEN DE CAMBIOS

1. Query prevSnaps ampliado con todas las columnas numéricas
2. Variables del período anterior: agregar prevTotalDiscounts, prevAvgGrossMargin,
   prevTotalLeads, prevAvgEffectiveness, prevAvgCtr, prevFixedVsTotal, prevTotalTransactions
3. inventory_days leído directamente de weekly_snapshots (no calcular)
4. Deltas agregados en: Margen bruto, Contribución, Descuentos,
   Trans. digitales, Leads, Efectividad, CTR, Gastos fijos
5. Etiqueta encima de la barra más alta en la gráfica
6. AiInsightBox muestra aviso si el insight está desactualizado

## Reglas
- TypeScript estricto
- NO agregar imports nuevos
- NO cambiar la estructura del JSX — solo los datos y props
- Comentarios en español
- Mantener todos los fixes v2.2 (exportar deshabilitado, formato números, etc.)
