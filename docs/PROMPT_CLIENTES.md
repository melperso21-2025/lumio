# PROMPT — Módulo Clientes (CRM básico)

## Contexto del proyecto
Estoy construyendo Lumio, una plataforma SaaS de inteligencia de negocio para PyMEs.
- Lee OBLIGATORIAMENTE docs/CURSOR_CONTEXT.md antes de escribir cualquier línea
- Los tipos de Supabase están en src/lib/supabase/database.types.ts
- El patrón de autenticación está en src/app/(dashboard)/sales/page.tsx — síguelo exactamente
- El patrón de formulario modal está en src/components/sales/QuickSaleForm.tsx — síguelo exactamente

## Tarea
Crea DOS archivos NUEVOS. NO modifiques ningún archivo existente.

---

## ARCHIVO 1: src/app/(dashboard)/customers/page.tsx

### Tipo
Server Component — sin 'use client'

### Imports requeridos (exactos)
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import KpiCard from '@/components/ui/KpiCard'
import AiInsightBox from '@/components/ui/AiInsightBox'
import NewCustomerForm from '@/components/customers/NewCustomerForm'
```

### Lógica de datos
```typescript
// 1. Auth — igual que sales/page.tsx
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')

const { data: userData } = await supabase
  .from('users')
  .select('company_id')
  .eq('id', user.id)
  .single()

const companyId = userData?.company_id
// Si no hay companyId → mostrar mensaje igual que sales/page.tsx

// 2. Query de clientes
const { data: customersList } = await supabase
  .from('customers')
  .select('id, full_name, phone, email, customer_type, label, lifetime_value, last_purchase_at, registered_since, created_at')
  .eq('company_id', companyId)
  .is('deleted_at', null)
  .order('created_at', { ascending: false })
  .limit(100)

const customers = customersList ?? []

// 3. KPIs calculados localmente
const total_customers = customers.length
const vip_count = customers.filter(c => c.label === 'vip').length
const wholesale_count = customers.filter(c => c.customer_type === 'wholesale').length
const total_ltv = customers.reduce((sum, c) => sum + (c.lifetime_value ?? 0), 0)
```

### JSX — estructura exacta

**Sección 1 — Topbar:**
```tsx
<Topbar pageTitle="Clientes" pageSubtitle="CRM básico" />
```

**Sección 2 — Grid 4 KpiCards:**
```
display: grid, gridTemplateColumns: repeat(4, 1fr), gap: 10
```
- KpiCard label="Total clientes" value={total_customers}
- KpiCard label="VIP" value={vip_count} isGold
- KpiCard label="Mayoristas" value={wholesale_count}
- KpiCard label="LTV total" prefix="$" value={total_ltv.toFixed(2)}

**Sección 3 — Card tabla de clientes:**
```
background: var(--card)
border: 1px solid var(--border)
border-radius: 12px
padding: 20px
```

Header de la card:
```
display: flex, justifyContent: space-between, alignItems: center, marginBottom: 16px
```
- Título "Directorio de clientes" en font-syne font-bold fontSize 16 color var(--text)
- Componente <NewCustomerForm /> (el botón disparador vive dentro del componente)

Si customers.length === 0:
```tsx
<AiInsightBox
  variant="blue"
  title="Sin clientes registrados"
  text="Aún no hay clientes en el directorio. Usa el botón '+ Nuevo cliente' para agregar el primero."
/>
```

Si hay clientes — tabla con overflowX: auto:

Columnas: Nombre | Teléfono | Tipo | Etiqueta | LTV | Última compra | Cliente desde

Estilos de la tabla:
- thead th: fontSize 11, color var(--muted), fontWeight 600, padding '10px 12px', textAlign left
- tbody tr: borderBottom '1px solid var(--border)'
- tbody td: fontSize 12, padding '10px 12px'

**Badges de Tipo (customer_type):**
```typescript
const typeConfig = {
  retail:     { bg: 'rgba(37,99,235,0.1)',   color: 'var(--blue)',   label: 'Retail'     },
  wholesale:  { bg: 'rgba(124,58,237,0.1)',  color: '#7C3AED',      label: 'Mayorista'  },
  occasional: { bg: 'rgba(146,148,172,0.1)', color: 'var(--muted)', label: 'Eventual'   },
  b2b:        { bg: 'rgba(5,150,105,0.1)',   color: 'var(--green)', label: 'B2B'        },
}
```

**Badges de Etiqueta (label):**
```typescript
const labelConfig = {
  vip:       { bg: 'var(--gold-bg)',           color: 'var(--gold)',   label: 'VIP'         },
  frequent:  { bg: 'rgba(5,150,105,0.1)',      color: 'var(--green)', label: 'Frecuente'   },
  new:       { bg: 'rgba(37,99,235,0.1)',      color: 'var(--blue)',  label: 'Nuevo'       },
  recovery:  { bg: 'rgba(217,119,6,0.1)',      color: 'var(--orange)','label': 'Recuperar' },
}
```

Estilo badge (aplicar a ambos tipos):
```typescript
{
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 6,
  fontSize: 11,
  fontWeight: 500,
  background: config.bg,
  color: config.color,
}
```

**Columna LTV:**
- Si lifetime_value > 0: mostrar en font-syne fontWeight 700 color var(--gold)
- Si es 0 o null: mostrar "—" en color var(--muted)

**Columna Última compra y Cliente desde:**
- Formatear con toLocaleDateString('es-EC', { day:'2-digit', month:'2-digit', year:'numeric' })
- Si es null: mostrar "—"

---

## ARCHIVO 2: src/components/customers/NewCustomerForm.tsx

### Tipo
'use client' — componente con estado

### Imports requeridos
```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
```

### Estado del componente
```typescript
const [open, setOpen] = useState(false)
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
const [success, setSuccess] = useState(false)

// Campos del formulario
const [full_name, setFullName] = useState('')
const [phone, setPhone] = useState('')
const [email, setEmail] = useState('')
const [customer_type, setCustomerType] = useState('retail')
const [label, setLabel] = useState('new')
const [registered_since, setRegisteredSince] = useState(
  new Date().toISOString().slice(0, 10)
)
```

### Función handleSubmit
```typescript
// Validación: full_name requerido
// Obtener user → company_id (igual que QuickSaleForm.tsx)
// INSERT en customers:
{
  company_id,
  full_name: full_name.trim(),
  phone: phone.trim() || null,
  email: email.trim() || null,
  customer_type,
  label,
  registered_since,
}
// En éxito: setSuccess(true), resetear campos, router.refresh()
// Cerrar modal después de 1200ms
```

### Campos del formulario

Usar este estilo base para todos los inputs/selects (igual que QuickSaleForm):
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
```

onFocus: borderColor = 'var(--gold)', boxShadow = '0 0 0 3px var(--gold-bg)'
onBlur: borderColor = 'var(--border2)', boxShadow = 'none'

Label style:
```typescript
{
  display: 'block',
  fontSize: 9,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 600,
  marginBottom: 4,
}
```

**Campos a incluir en el formulario:**

1. full_name — input type text, requerido, placeholder "Nombre completo"
2. phone — input type text, placeholder "+593 99 000 0000"
3. email — input type email, placeholder "cliente@empresa.com"
4. customer_type — select con opciones:
   - retail → "Retail (consumidor final)"
   - wholesale → "Mayorista"
   - occasional → "Eventual"
   - b2b → "Empresa (B2B)"
5. label — select con opciones:
   - new → "Nuevo"
   - frequent → "Frecuente"
   - vip → "VIP"
   - recovery → "Recuperar"
6. registered_since — input type date, label "Cliente desde"

### Estructura del modal

Botón disparador:
```tsx
<button
  type="button"
  onClick={() => setOpen(true)}
  className="font-syne font-bold text-sm px-4 py-2 rounded-lg"
  style={{
    background: 'linear-gradient(135deg, #F5C842, #F09A1A)',
    color: '#1A1B2E',
  }}
>
  + Nuevo cliente
</button>
```

Overlay del modal:
```
position: fixed, inset: 0, zIndex: 50
background: rgba(0,0,0,0.45)
display: flex, alignItems: center, justifyContent: center
```

Contenido del modal:
```
background: var(--card)
border: 1px solid var(--border)
borderRadius: 12
padding: 24
width: 100%, maxWidth: 480
boxShadow: 0 20px 40px rgba(0,0,0,0.14)
```

Header del modal:
```
display: flex, justifyContent: space-between, alignItems: center, marginBottom: 20
Título: "Nuevo cliente" font-syne font-bold fontSize 16 color var(--text)
Botón ×: color var(--muted), fontSize 18, sin borde, cursor pointer
```

Mensaje de éxito (si success === true):
```
background: rgba(5,150,105,0.08)
border: 1px solid rgba(5,150,105,0.2)
borderRadius: 8, padding: '10px 14px', marginBottom: 16
fontSize: 12, color: var(--green), fontWeight: 500
texto: "✓ Cliente registrado correctamente"
```

Mensaje de error (si error !== null):
```
background: rgba(220,38,38,0.06)
border: 1px solid rgba(220,38,38,0.2)
borderRadius: 8, padding: '8px 12px'
fontSize: 12, color: var(--red)
```

Botones del formulario (al final, en flex gap 8):
- Cancelar: background var(--hover), color var(--text2), border 1px solid var(--border)
- Guardar: gradiente dorado, font-syne font-bold, color #1A1B2E
  - Si loading: texto "Guardando..." y opacity 0.7

---

## Reglas de código — OBLIGATORIAS

1. TypeScript estricto — tipos explícitos en TODOS los props y estados
2. Variables CSS — SOLO var(--gold), var(--text), etc. Nunca hex directos en componentes
3. Soft delete — SIEMPRE .is('deleted_at', null) en queries
4. Error handling — SIEMPRE manejar el objeto error de Supabase
5. Comentarios en español
6. NO usar librerías externas de UI
7. Server Components sin 'use client' — solo formularios y componentes con hooks
8. Fuentes: títulos y KPIs en font-syne, todo lo demás font-jakarta (default)
