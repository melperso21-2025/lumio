# PROMPT — Módulo Inventario

## Contexto del proyecto
Estoy construyendo Lumio, una plataforma SaaS de inteligencia de negocio para PyMEs.
- Lee OBLIGATORIAMENTE docs/CURSOR_CONTEXT.md antes de escribir cualquier línea
- Los tipos de Supabase están en src/lib/supabase/database.types.ts
- Sigue el patrón de src/app/(dashboard)/customers/page.tsx para la página
- Sigue el patrón de src/components/customers/NewCustomerForm.tsx para formularios

## Tarea
Crea TRES archivos NUEVOS. NO modifiques ningún archivo existente.

---

## ARCHIVO 1: src/app/(dashboard)/inventory/page.tsx

### Tipo
Server Component — sin 'use client'

### Imports requeridos
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import KpiCard from '@/components/ui/KpiCard'
import AiInsightBox from '@/components/ui/AiInsightBox'
import NewProductForm from '@/components/inventory/NewProductForm'
import AddMovementForm from '@/components/inventory/AddMovementForm'
```

### Lógica de datos
```typescript
// 1. Auth — igual que customers/page.tsx
// 2. Obtener productos
const { data: productsList } = await supabase
  .from('products')
  .select('id, name, sku, sale_price, unit_cost, current_stock, min_stock_alert, lead_time_days, category_id, is_active')
  .eq('company_id', companyId)
  .is('deleted_at', null)
  .eq('is_active', true)
  .order('name', { ascending: true })
  .limit(100)

const products = productsList ?? []

// 3. Obtener categorías para el formulario
const { data: categoriesList } = await supabase
  .from('product_categories')
  .select('id, name')
  .eq('company_id', companyId)
  .is('deleted_at', null)
  .order('name')

const categories = categoriesList ?? []

// 4. KPIs calculados localmente
const total_products = products.length
const low_stock_count = products.filter(p =>
  (p.current_stock ?? 0) <= (p.min_stock_alert ?? 0) && (p.min_stock_alert ?? 0) > 0
).length
const frozen_capital = products.reduce((sum, p) =>
  sum + ((p.current_stock ?? 0) * (p.unit_cost ?? 0)), 0
)
const out_of_stock = products.filter(p => (p.current_stock ?? 0) === 0).length
```

### JSX — estructura exacta

**Sección 1 — Topbar:**
```tsx
<Topbar pageTitle="Inventario" pageSubtitle="Productos y stock" />
```

**Sección 2 — Grid 4 KpiCards:**
```
display: grid, gridTemplateColumns: repeat(4, 1fr), gap: 10
```
- KpiCard label="Productos activos" value={total_products}
- KpiCard label="Stock bajo" value={low_stock_count} — si low_stock_count > 0 mostrar en color var(--red)
- KpiCard label="Sin stock" value={out_of_stock} — si > 0 color var(--red)
- KpiCard label="Capital en stock" prefix="$" value={frozen_capital.toFixed(2)} isGold

**Sección 3 — AiInsightBox si hay productos con stock bajo:**
```tsx
{low_stock_count > 0 && (
  <AiInsightBox
    variant="red"
    title={`⚠ ${low_stock_count} producto${low_stock_count > 1 ? 's' : ''} con stock bajo`}
    text={`Tienes productos por debajo del mínimo. Revisa la columna "Stock" — los marcados en rojo requieren reposición pronto.`}
  />
)}
```

**Sección 4 — Card tabla de productos:**
```
background: var(--card), border: 1px solid var(--border)
border-radius: 12, padding: 20
```

Header de la card:
- Título "Catálogo de productos" font-syne font-bold fontSize 16
- Botón <NewProductForm categories={categories} /> a la derecha

Columnas tabla: Producto | SKU | Categoría | Precio | Costo | Stock | Mín. | Lead time | Acción

Estilos de filas:
- Stock: si current_stock <= min_stock_alert Y min_stock_alert > 0 → texto en var(--red) font-bold
         si current_stock === 0 → badge "Sin stock" rojo
         si normal → texto var(--text)
- Precio y Costo: prefix "$", color var(--text2)
- Lead time: mostrar en días → "{n} día{s}"
- Categoría: mostrar nombre o "—" si no tiene
- Acción: botón pequeño "📦 Movimiento" color var(--gold) que abre AddMovementForm pasando el producto

Si products.length === 0:
```tsx
<AiInsightBox
  variant="blue"
  title="Sin productos registrados"
  text="Agrega tu primer producto usando el botón '+ Nuevo producto'."
/>
```

---

## ARCHIVO 2: src/components/inventory/NewProductForm.tsx

### Tipo
'use client'

### Props
```typescript
interface Category { id: string; name: string }
interface NewProductFormProps { categories?: Category[] }
```

### Estado
```typescript
const [open, setOpen] = useState(false)
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
const [success, setSuccess] = useState(false)
const [name, setName] = useState('')
const [sku, setSku] = useState('')
const [category_id, setCategoryId] = useState('')
const [sale_price, setSalePrice] = useState('')
const [unit_cost, setUnitCost] = useState('')
const [current_stock, setCurrentStock] = useState('0')
const [min_stock_alert, setMinStockAlert] = useState('0')
const [lead_time_days, setLeadTimeDays] = useState('1')
```

### handleSubmit
```typescript
// Validación: name requerido, sale_price > 0
// INSERT en products:
{
  company_id,
  name: name.trim(),
  sku: sku.trim() || null,
  category_id: category_id || null,
  sale_price: parseFloat(sale_price) || 0,
  unit_cost: parseFloat(unit_cost) || 0,
  current_stock: parseInt(current_stock) || 0,
  min_stock_alert: parseInt(min_stock_alert) || 0,
  lead_time_days: parseInt(lead_time_days) || 1,
  is_active: true,
}
// Si current_stock > 0, insertar también un inventory_movement:
{
  company_id,
  product_id: insertedProduct.id,
  type: 'in',
  quantity: parseInt(current_stock),
  reason: 'initial',
  movement_date: today,
  notes: 'Stock inicial al crear producto'
}
```

### Campos del formulario
Usar mismo inputStyle y labelStyle que NewCustomerForm.tsx

Distribuir en grid 2 columnas (gridTemplateColumns: repeat(2, 1fr)):
1. name — text, requerido, colSpan 2, placeholder "Nombre del producto"
2. sku — text, placeholder "SKU-001"
3. category_id — select con categorías (si categories.length > 0)
4. sale_price — number, step 0.01, placeholder "0.00", label "Precio de venta $"
5. unit_cost — number, step 0.01, placeholder "0.00", label "Costo unitario $"
6. current_stock — number, min 0, label "Stock inicial"
7. min_stock_alert — number, min 0, label "Alerta stock mínimo"
8. lead_time_days — number, min 1, label "Días para reponer"

Preview en tiempo real (colSpan 2):
```
Margen: {sale_price > 0 && unit_cost > 0
  ? (((sale_price - unit_cost) / sale_price) * 100).toFixed(1) + '%'
  : '—'}
Capital a ingresar: $ {(current_stock * unit_cost).toFixed(2)}
```
Mostrar en color var(--gold), font-syne, fontSize 11

Botón disparador:
```tsx
<button style={{ background: 'linear-gradient(135deg, #F5C842, #F09A1A)', color: '#1A1B2E' }}>
  + Nuevo producto
</button>
```

---

## ARCHIVO 3: src/components/inventory/AddMovementForm.tsx

### Tipo
'use client'

### Props
```typescript
interface Product { id: string; name: string; current_stock: number }
interface AddMovementFormProps { product: Product }
```

### Descripción
Botón pequeño que abre un modal para registrar entrada, salida o ajuste de stock.

### Estado
```typescript
const [open, setOpen] = useState(false)
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
const [success, setSuccess] = useState(false)
const [type, setType] = useState<'in' | 'out' | 'adjustment'>('in')
const [quantity, setQuantity] = useState('1')
const [reason, setReason] = useState('purchase')
const [notes, setNotes] = useState('')
```

### Opciones de tipo y razón
```typescript
const typeOptions = [
  { value: 'in',         label: '📥 Entrada'  },
  { value: 'out',        label: '📤 Salida'   },
  { value: 'adjustment', label: '⚖ Ajuste'   },
]

const reasonOptions: Record<string, { value: string; label: string }[]> = {
  in:         [
    { value: 'purchase',    label: 'Compra'      },
    { value: 'return',      label: 'Devolución'  },
    { value: 'adjustment',  label: 'Ajuste'      },
  ],
  out:        [
    { value: 'sale',        label: 'Venta'       },
    { value: 'damage',      label: 'Daño/Merma'  },
    { value: 'transfer',    label: 'Transferencia'},
    { value: 'adjustment',  label: 'Ajuste'      },
  ],
  adjustment: [
    { value: 'adjustment',  label: 'Ajuste de inventario' },
  ],
}
```

### handleSubmit
```typescript
// Validación: quantity > 0
// INSERT en inventory_movements:
{
  company_id,
  product_id: product.id,
  type,
  quantity: parseInt(quantity),
  reason,
  movement_date: today,
  notes: notes.trim() || null,
}
// El trigger de BD actualiza current_stock automáticamente
```

### Modal — diseño compacto (maxWidth: 380)

Header: "Movimiento de stock · {product.name}" truncado en 30 chars

Mostrar stock actual:
```tsx
<div style={{ background: 'var(--gold-bg)', border: '1px solid var(--gold-bdr)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12 }}>
  Stock actual: <strong style={{ fontFamily: 'var(--font-syne)', color: 'var(--gold)' }}>
    {product.current_stock} unidades
  </strong>
</div>
```

Campos:
1. type — selector de 3 botones (no select): in/out/adjustment con estilos activo/inactivo
   - Activo: background var(--gold-bg), color var(--gold), border var(--gold-bdr)
   - Inactivo: background var(--hover), color var(--text2)
2. quantity — number min 1, requerido
3. reason — select que cambia según el tipo seleccionado
4. notes — textarea opcional, rows 2

Botón disparador (pequeño, ghost):
```tsx
<button style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--gold-bdr)', background: 'var(--gold-bg)', color: 'var(--gold)', cursor: 'pointer' }}>
  📦 Movimiento
</button>
```

---

## Reglas de código — OBLIGATORIAS

1. TypeScript estricto — tipos explícitos en TODOS los props y estados
2. Variables CSS — SOLO var(--gold), var(--text), etc. Nunca hex directos en componentes
3. Soft delete — SIEMPRE .is('deleted_at', null) en queries
4. Error handling — SIEMPRE manejar el objeto error de Supabase
5. Comentarios en español
6. NO usar librerías externas de UI
7. Server Components sin 'use client'
8. Fuentes: títulos y KPIs en font-syne, todo lo demás font-jakarta
9. Patrones consistentes con QuickSaleForm y NewCustomerForm
10. El trigger de BD actualiza current_stock — NO actualizar manualmente en el frontend
