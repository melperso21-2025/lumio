# PROMPT — Dashboard v2.2 — Fixes menores

## Contexto
Estoy construyendo Lumio, plataforma SaaS para PyMEs.
- Lee docs/CURSOR_CONTEXT.md antes de escribir
- Los tipos están en src/lib/supabase/database.types.ts

## Tarea
REEMPLAZA SOLO src/app/(dashboard)/dashboard/page.tsx
NO modifiques ningún otro archivo.

## Fixes a aplicar

### FIX 1 — calcDelta: mostrar 0 cuando no hay cambio
```typescript
// ANTES
function calcDelta(current: number, previous: number): number | undefined {
  if (!previous || previous === 0) return undefined
  return Math.round(((current - previous) / previous) * 100)
}

// DESPUÉS — mostrar 0% cuando hay datos pero sin cambio
function calcDelta(current: number, previous: number): number | undefined {
  if (!previous || previous === 0) return undefined
  const delta = Math.round(((current - previous) / previous) * 100)
  return delta  // incluye 0, que KpiCard mostrará como neutro
}
```

También actualizar KpiCard para que muestre 0% en neutro:
En el page.tsx, el 0 ya se pasa correctamente. El fix es que KpiCard
actualmente tiene `delta !== 0` como condición. Cambiar la condición
en el page.tsx para forzar que siempre se muestre si hay prev:

```typescript
// En vez de calcDelta, usar esta versión que nunca retorna undefined si hay prev:
function calcDelta(current: number, previous: number): number | undefined {
  if (previous === 0 || prevSnapsData.length === 0) return undefined
  return Math.round(((current - previous) / previous) * 100)
}
```

### FIX 2 — Días de inventario: cálculo mejorado
```typescript
// ANTES — proxy impreciso
const inventoryDays = totalStock > 0
  ? Math.min(Math.round(totalStock / Math.max(products.length * 0.3, 1)), 90) : 0

// DESPUÉS — basado en ventas reales del período
// Usar totalTransactions del snapshot como proxy de rotación diaria
const daysInPeriod = period === 'week' ? 7 : period === 'month' ? 30 : 30
const dailySalesUnits = totalTransactions > 0
  ? (totalTransactions * 2) / daysInPeriod  // 2 = avg LPP estimado
  : 0
const inventoryDays = dailySalesUnits > 0
  ? Math.min(Math.round(totalStock / dailySalesUnits), 120)
  : totalStock > 0 ? 90 : 0
const inventoryDaysPct = Math.min(Math.round((inventoryDays / 60) * 100), 100)
// Usar 60 como referencia (óptimo 20-45, max visual 60+)
```

### FIX 3 — Gráfica de barras: mejor contraste visual
El problema es que los valores son similares y las barras se ven iguales.
Solución: usar escala logarítmica suavizada y altura mínima diferenciada.

```typescript
// ANTES
const heightPct = Math.max(((h.total_sales ?? 0) / maxSales) * 100, 4)

// DESPUÉS — escala que amplifica diferencias pequeñas
const rawPct = maxSales > 0 ? (h.total_sales ?? 0) / maxSales : 0
// Aplicar raíz cuadrada para amplificar diferencias en rangos similares
const heightPct = Math.max(Math.sqrt(rawPct) * 100, 6)
```

### FIX 4 — Botón Exportar: ocultar o mostrar tooltip
Cambiar el botón Exportar por uno que muestre un mensaje "Próximamente":

```tsx
// ANTES — botón sin funcionalidad
<button type="button" style={{ ... }}>⬇ Exportar</button>

// DESPUÉS — botón con title tooltip
<button
  type="button"
  title="Exportar CSV — próximamente"
  style={{
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '6px 12px', borderRadius: 6, fontSize: 11,
    border: '1px solid var(--border2)', background: 'transparent',
    color: 'var(--muted)', cursor: 'not-allowed',
    fontFamily: 'var(--font-jakarta)',
    opacity: 0.6,
  }}
>
  ⬇ Exportar
</button>
```

### FIX 5 — AiInsightBox de alerta cuando días de caja < 30
Ya existe en el código pero verificar que funcione correctamente.
El bloque Financiero debe mostrar un AiInsightBox ANTES de las KpiCards
cuando avgCashDays < 30:

```tsx
{avgCashDays < 30 && avgCashDays > 0 && (
  <div style={{ marginBottom: 12 }}>
    <AiInsightBox
      variant={avgCashDays < 15 ? 'red' : 'gold'}
      title={avgCashDays < 15 ? '🔴 Alerta crítica de caja' : '⚠ Días de caja bajos'}
      text={`Tienes aproximadamente ${Math.round(avgCashDays)} días de caja disponibles. ${
        avgCashDays < 15
          ? 'Acción urgente: revisar ingresos pendientes y reducir egresos no esenciales.'
          : 'Considera revisar tus CxC pendientes y planificar ingresos para las próximas semanas.'
      }`}
    />
  </div>
)}
```

Agregar este bloque ANTES del grid de 5 KpiCards del bloque Financiero.

### FIX 6 — Tooltip en barras de la gráfica
Agregar el monto encima de cada barra al hacer hover (title attribute):

```tsx
// En cada barra de la gráfica, agregar title para tooltip nativo
<div
  title={`S${h.week_number}: $${(h.total_sales ?? 0).toLocaleString('es-EC')}`}
  style={{ ... }}
/>
```

### FIX 7 — Ventas por canal: formateo de números
Los números en Ventas por canal se muestran con punto en lugar de coma
($1.400 en lugar de $1,400). Corregir el locale:

```typescript
// ANTES
${ch.total.toLocaleString('es-EC')}

// DESPUÉS — usar formato consistente con 2 decimales
$${ch.total.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
```

---

## Instrucciones para Cursor

Aplica los 7 fixes al archivo src/app/(dashboard)/dashboard/page.tsx.
Mantén toda la estructura existente — solo cambia las partes específicas.
No agregues imports nuevos — todos los componentes ya están importados.
Comentarios en español.
TypeScript estricto.
