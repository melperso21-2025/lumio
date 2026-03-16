# PROMPT — Módulo Bancos & Finanzas

## Contexto del proyecto
Estoy construyendo Lumio, una plataforma SaaS de inteligencia de negocio para PyMEs.
- Lee OBLIGATORIAMENTE docs/CURSOR_CONTEXT.md antes de escribir cualquier línea
- Los tipos de Supabase están en src/lib/supabase/database.types.ts
- Sigue el patrón de src/app/(dashboard)/inventory/page.tsx para la página
- Sigue el patrón de src/components/inventory/AddMovementForm.tsx para formularios
- El trigger tg_update_bank_balance actualiza current_balance automáticamente — NO actualizar saldo manualmente

## Tarea
Crea TRES archivos NUEVOS. NO modifiques ningún archivo existente.

---

## ARCHIVO 1: src/app/(dashboard)/finance/page.tsx

### Tipo
Server Component — sin 'use client'

### Imports requeridos
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import KpiCard from '@/components/ui/KpiCard'
import AiInsightBox from '@/components/ui/AiInsightBox'
import NewBankAccountForm from '@/components/finance/NewBankAccountForm'
import NewTransactionForm from '@/components/finance/NewTransactionForm'
```

### Lógica de datos
```typescript
// 1. Auth — igual que inventory/page.tsx
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')

const { data: userData } = await supabase
  .from('users').select('company_id').eq('id', user.id).single()
const companyId = userData?.company_id
// Si no hay companyId → mensaje igual que otros módulos

// 2. Obtener cuentas bancarias
const { data: accountsList } = await supabase
  .from('bank_accounts')
  .select('id, bank_name, account_type, account_number, initial_balance, current_balance, is_active')
  .eq('company_id', companyId)
  .is('deleted_at', null)
  .eq('is_active', true)
  .order('bank_name')

const accounts = accountsList ?? []

// 3. Obtener últimas 50 transacciones
const { data: txList } = await supabase
  .from('bank_transactions')
  .select('id, account_id, type, amount, category, concept, tx_date, is_fixed')
  .eq('company_id', companyId)
  .order('tx_date', { ascending: false })
  .limit(50)

const transactions = txList ?? []

// 4. KPIs calculados localmente
const total_balance = accounts.reduce((sum, a) => sum + (a.current_balance ?? 0), 0)
const total_income = transactions
  .filter(t => t.type === 'income')
  .reduce((sum, t) => sum + (t.amount ?? 0), 0)
const total_expenses = transactions
  .filter(t => t.type === 'expense')
  .reduce((sum, t) => sum + (t.amount ?? 0), 0)
const fixed_expenses = transactions
  .filter(t => t.type === 'expense' && t.is_fixed)
  .reduce((sum, t) => sum + (t.amount ?? 0), 0)

// Días de caja: saldo total / gasto diario promedio
// gasto diario = total_expenses / 30 (estimado)
const daily_expense_avg = total_expenses > 0 ? total_expenses / 30 : 0
const cash_days = daily_expense_avg > 0
  ? Math.floor(total_balance / daily_expense_avg)
  : 0
```

### JSX — estructura exacta

**Sección 1 — Topbar:**
```tsx
<Topbar pageTitle="Bancos & Finanzas" pageSubtitle="Cuentas y movimientos" />
```

**Sección 2 — Grid 4 KpiCards:**
```
display: grid, gridTemplateColumns: repeat(4, 1fr), gap: 10
```
- KpiCard label="Saldo total" prefix="$" value={total_balance.toFixed(2)} isGold
- KpiCard label="Ingresos" prefix="$" value={total_income.toFixed(2)}
  — delta positivo siempre (verde)
- KpiCard label="Egresos" prefix="$" value={total_expenses.toFixed(2)}
- KpiCard label="Días de caja" value={cash_days}
  compare="meta: >30 días"
  — si cash_days < 30: mostrar value en color var(--orange) con nota de alerta
  — si cash_days < 10: mostrar value en color var(--red)

**Sección 3 — AiInsightBox alerta si días de caja < 30:**
```tsx
{cash_days < 30 && cash_days >= 0 && (
  <AiInsightBox
    variant={cash_days < 10 ? 'red' : 'gold'}
    title={cash_days < 10 ? '🔴 Alerta crítica de caja' : '⚠ Días de caja bajos'}
    text={`Tienes aproximadamente ${cash_days} días de caja disponibles. ${
      cash_days < 10
        ? 'Acción urgente: revisar ingresos pendientes y reducir egresos no esenciales.'
        : 'Considera revisar tus CxC pendientes y planificar ingresos para las próximas semanas.'
    }`}
  />
)}
```

**Sección 4 — Grid 2 columnas (gridTemplateColumns: '1fr 1.5fr'):**

Columna izquierda — Card "Cuentas bancarias":
```
background: var(--card), border: 1px solid var(--border)
border-radius: 12, padding: 20
```
Header: "Cuentas bancarias" font-syne bold + <NewBankAccountForm />

Si accounts.length === 0:
```tsx
<AiInsightBox variant="blue" title="Sin cuentas registradas"
  text="Agrega tu primera cuenta bancaria o caja para comenzar a registrar movimientos." />
```

Si hay cuentas — lista de cards por cuenta:
```
Cada cuenta: div con padding 12px, border-bottom 1px solid var(--border)
display flex, justifyContent space-between, alignItems center
```
- Izquierda: nombre del banco en font-syne bold 13px + tipo en badge
- Centro: últimos 4 dígitos en color var(--muted) fontSize 11
- Derecha: saldo en font-syne bold 16px color var(--gold)
           si saldo < 0: color var(--red)

Badges de tipo:
- checking → "Corriente" bg rgba(37,99,235,0.1) color var(--blue)
- savings  → "Ahorros"   bg rgba(5,150,105,0.1) color var(--green)
- cash     → "Caja"      bg rgba(232,165,0,0.1) color var(--gold)
- other    → "Otra"      bg var(--hover) color var(--text2)

Columna derecha — Card "Movimientos recientes":
```
background: var(--card), border: 1px solid var(--border)
border-radius: 12, padding: 20
```
Header: "Movimientos recientes" font-syne bold + <NewTransactionForm accounts={accounts} />

Si transactions.length === 0:
```tsx
<AiInsightBox variant="blue" title="Sin movimientos"
  text="Registra tu primer ingreso o egreso usando el botón '+ Movimiento'." />
```

Si hay transacciones — tabla:
Columnas: Fecha | Cuenta | Concepto | Categoría | Tipo | Monto

- Tipo badge: income → "Ingreso" verde, expense → "Egreso" rojo
- Monto: si income → color var(--green) prefix "+$"
         si expense → color var(--red) prefix "-$"
- is_fixed badge: si true → "Fijo" en amber pequeño al lado del concepto
- Fecha: formatDate igual que otros módulos
- Cuenta: buscar nombre en accounts por account_id → mostrar bank_name o "—"

---

## ARCHIVO 2: src/components/finance/NewBankAccountForm.tsx

### Tipo
'use client'

### Estado
```typescript
const [open, setOpen] = useState(false)
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
const [success, setSuccess] = useState(false)
const [bank_name, setBankName] = useState('')
const [account_type, setAccountType] = useState('checking')
const [account_number, setAccountNumber] = useState('')
const [initial_balance, setInitialBalance] = useState('0')
```

### handleSubmit
```typescript
// Validación: bank_name requerido
// INSERT en bank_accounts:
{
  company_id,
  bank_name: bank_name.trim(),
  account_type,
  account_number: account_number.trim() || null,
  initial_balance: parseFloat(initial_balance) || 0,
  current_balance: parseFloat(initial_balance) || 0,  // saldo inicial = saldo actual
  is_active: true,
}
```

### Campos del formulario
Usar inputStyle y labelStyle de NewCustomerForm.tsx

1. bank_name — text requerido, placeholder "Banco Pichincha", label "Nombre del banco"
2. account_type — select:
   - checking → "Cuenta corriente"
   - savings  → "Cuenta de ahorros"
   - cash     → "Caja chica"
   - other    → "Otra"
3. account_number — text, placeholder "últimos 4 dígitos", label "Número (opcional)"
4. initial_balance — number step 0.01, placeholder "0.00", label "Saldo inicial $"

Botón disparador:
```tsx
<button style={{ background: 'linear-gradient(135deg, #F5C842, #F09A1A)', color: '#1A1B2E' }}
  className="font-syne font-bold text-sm px-4 py-2 rounded-lg">
  + Nueva cuenta
</button>
```

Modal: maxWidth 420, mismo patrón que NewCustomerForm

---

## ARCHIVO 3: src/components/finance/NewTransactionForm.tsx

### Tipo
'use client'

### Props
```typescript
interface Account { id: string; bank_name: string; account_type: string }
interface NewTransactionFormProps { accounts?: Account[] }
```

### Estado
```typescript
const [open, setOpen] = useState(false)
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
const [success, setSuccess] = useState(false)
const [type, setType] = useState<'income' | 'expense'>('income')
const [account_id, setAccountId] = useState('')
const [amount, setAmount] = useState('')
const [category, setCategory] = useState('')
const [concept, setConcept] = useState('')
const [tx_date, setTxDate] = useState(new Date().toISOString().slice(0, 10))
const [is_fixed, setIsFixed] = useState(false)
```

### Categorías por tipo
```typescript
const incomeCategories = [
  { value: 'sale',        label: 'Venta'              },
  { value: 'collection',  label: 'Cobro CxC'          },
  { value: 'loan',        label: 'Préstamo recibido'  },
  { value: 'investment',  label: 'Inversión recibida' },
  { value: 'other',       label: 'Otro ingreso'       },
]

const expenseCategories = [
  { value: 'payroll',     label: 'Nómina'             },
  { value: 'marketing',   label: 'Marketing / Pauta'  },
  { value: 'supplier',    label: 'Proveedor'          },
  { value: 'rent',        label: 'Arriendo'           },
  { value: 'utilities',   label: 'Servicios básicos'  },
  { value: 'taxes',       label: 'Impuestos'          },
  { value: 'logistics',   label: 'Logística'          },
  { value: 'other',       label: 'Otro egreso'        },
]
```

### handleSubmit
```typescript
// Validación: amount > 0, account_id requerido si hay cuentas
// INSERT en bank_transactions:
{
  company_id,
  account_id: account_id || null,
  type,
  amount: parseFloat(amount),
  category: category || null,
  concept: concept.trim() || null,
  tx_date,
  is_fixed,
}
// El trigger tg_update_bank_balance actualiza current_balance automáticamente
```

### Campos del formulario
Distribuir en grid 2 columnas donde aplique:

1. Selector de tipo — 2 botones (igual que AddMovementForm):
   - "📈 Ingreso" / "📉 Egreso"
   - Activo: gold, Inactivo: hover/text2

2. account_id — select con cuentas disponibles, label "Cuenta"
   - Si accounts.length === 0: input text disabled con mensaje "Primero crea una cuenta"

3. amount — number step 0.01 requerido, label "Monto $"

4. category — select que cambia según tipo (incomeCategories / expenseCategories)

5. concept — text, placeholder "Descripción del movimiento", label "Concepto"

6. tx_date — date input, label "Fecha"

7. is_fixed — checkbox con label "¿Es un gasto/ingreso fijo recurrente?"
   Estilo del checkbox row:
   ```tsx
   <div style={{ display: 'flex', alignItems: 'center', gap: 8, gridColumn: '1 / -1' }}>
     <input type="checkbox" id="tx-fixed" checked={is_fixed} onChange={e => setIsFixed(e.target.checked)}
       style={{ width: 16, height: 16, accentColor: 'var(--gold)' }} />
     <label htmlFor="tx-fixed" style={{ fontSize: 12, color: 'var(--text2)', cursor: 'pointer' }}>
       Es un movimiento fijo recurrente (nómina, arriendo, etc.)
     </label>
   </div>
   ```

Botón disparador:
```tsx
<button style={{ background: 'linear-gradient(135deg, #F5C842, #F09A1A)', color: '#1A1B2E' }}
  className="font-syne font-bold text-sm px-4 py-2 rounded-lg">
  + Movimiento
</button>
```

Modal: maxWidth 480, mismo patrón que NewCustomerForm

---

## Reglas de código — OBLIGATORIAS

1. TypeScript estricto — tipos explícitos en TODOS los props y estados
2. Variables CSS — SOLO var(--gold), var(--text), etc. Nunca hex directos en componentes
3. NO hay soft delete en bank_transactions — es inmutable, nunca agregar deleted_at
4. bank_accounts SÍ tiene deleted_at — usar .is('deleted_at', null) en queries
5. Error handling — SIEMPRE manejar el objeto error de Supabase
6. Comentarios en español
7. NO usar librerías externas de UI
8. El trigger tg_update_bank_balance actualiza current_balance automáticamente
   NO actualizar current_balance manualmente en el frontend
9. Fuentes: títulos y KPIs en font-syne, todo lo demás font-jakarta
10. Patrones consistentes con NewCustomerForm y AddMovementForm
