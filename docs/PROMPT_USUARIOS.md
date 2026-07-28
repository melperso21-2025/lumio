# PROMPT — Módulo Usuarios & Roles

## Contexto del proyecto
Estoy construyendo Lumio, una plataforma SaaS de inteligencia de negocio para PyMEs.
- Lee OBLIGATORIAMENTE docs/CURSOR_CONTEXT.md antes de escribir cualquier línea
- Los tipos de Supabase están en src/lib/supabase/database.types.ts
- Sigue el patrón de src/app/(dashboard)/customers/page.tsx para Server Components
- Sigue el patrón de src/components/customers/NewCustomerForm.tsx para formularios
- Auth de Supabase maneja las credenciales — nosotros solo manejamos la tabla users

## Tarea
Crea TRES archivos NUEVOS. NO modifiques ningún archivo existente.

---

## ARCHIVO 1: src/app/(dashboard)/settings/users/page.tsx

### Tipo
Server Component — sin 'use client'

### Imports requeridos
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import KpiCard from '@/components/ui/KpiCard'
import AiInsightBox from '@/components/ui/AiInsightBox'
import InviteUserForm from '@/components/settings/InviteUserForm'
import EditUserRoleForm from '@/components/settings/EditUserRoleForm'
```

### Lógica de datos
```typescript
// 1. Auth
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')

const { data: userData } = await supabase
  .from('users')
  .select('company_id, role, is_pulse_admin')
  .eq('id', user.id)
  .single()

const companyId = userData?.company_id
const currentUserRole = userData?.role
const isPulseAdmin = userData?.is_pulse_admin ?? false

// Solo admin puede gestionar usuarios
const canManage = currentUserRole === 'admin' || isPulseAdmin

// Si no hay companyId → mensaje igual que otros módulos

// 2. Obtener todos los usuarios de la empresa
const { data: usersList } = await supabase
  .from('users')
  .select('id, full_name, email, role, job_title, last_seen_at, created_at, deleted_at')
  .eq('company_id', companyId)
  .is('deleted_at', null)
  .order('created_at', { ascending: true })

const users = usersList ?? []

// 3. KPIs
const total_users = users.length
const admin_count = users.filter(u => u.role === 'admin').length
const manager_count = users.filter(u => u.role === 'manager').length
const operator_count = users.filter(u => u.role === 'operator').length
```

### JSX — estructura exacta

**Sección 1 — Topbar:**
```tsx
<Topbar pageTitle="Usuarios & Roles" pageSubtitle="Gestión de accesos" />
```

**Sección 2 — AiInsightBox si el usuario no es admin:**
```tsx
{!canManage && (
  <AiInsightBox
    variant="blue"
    title="Acceso restringido"
    text="Solo los administradores pueden gestionar usuarios. Contacta al administrador de tu empresa."
  />
)}
```

**Sección 3 — Grid 4 KpiCards:**
```
display: grid, gridTemplateColumns: repeat(4, 1fr), gap: 10
```
- KpiCard label="Total usuarios" value={total_users}
- KpiCard label="Administradores" value={admin_count} isGold
- KpiCard label="Gerentes" value={manager_count}
- KpiCard label="Operativos" value={operator_count}

**Sección 4 — Card tabla de usuarios:**
```
background: var(--card), border: 1px solid var(--border)
border-radius: 12, padding: 20
```

Header:
- Título "Equipo" font-syne bold 16px
- Si canManage: mostrar <InviteUserForm companyId={companyId} />

Columnas tabla: Usuario | Email | Cargo | Rol | Último acceso | Acciones

Badges de rol:
```typescript
const roleConfig = {
  admin:    { bg: 'var(--gold-bg)',           color: 'var(--gold)',   label: 'Admin'     },
  manager:  { bg: 'rgba(37,99,235,0.1)',      color: 'var(--blue)',  label: 'Gerente'   },
  operator: { bg: 'rgba(146,148,172,0.1)',    color: 'var(--muted)', label: 'Operativo' },
}
```

Columna "Último acceso":
- Si last_seen_at: formatear fecha
- Si null: mostrar "Nunca" en color var(--muted)

Columna "Acciones":
- Solo visible si canManage
- Si el usuario NO es el usuario actual:
  mostrar <EditUserRoleForm userId={u.id} currentRole={u.role} />
- Si es el usuario actual:
  mostrar "— (tú)" en color var(--muted) fontSize 11

Si users.length === 0:
```tsx
<AiInsightBox
  variant="blue"
  title="Sin usuarios registrados"
  text="No hay usuarios en esta empresa todavía."
/>
```

**Sección 5 — Card informativa de roles:**
```
background: var(--card), border: 1px solid var(--border)
border-radius: 12, padding: 20, marginTop: 0
```
Título "Descripción de roles" font-syne bold 13px marginBottom 16

3 columnas (grid repeat(3, 1fr) gap 12):
Cada columna tiene badge de rol + nombre + descripción en fontSize 12 color var(--text2):
- Admin: "Acceso completo. Puede gestionar usuarios, ver finanzas, generar análisis de IA y configurar la empresa."
- Gerente: "Puede ver todos los módulos incluyendo finanzas. No puede gestionar usuarios ni generar análisis de IA."
- Operativo: "Puede registrar ventas, pautas, clientes e inventario. No tiene acceso a finanzas ni configuración."

---

## ARCHIVO 2: src/components/settings/InviteUserForm.tsx

### Tipo
'use client'

### Props
```typescript
interface InviteUserFormProps {
  companyId: string
}
```

### Estado
```typescript
const [open, setOpen] = useState(false)
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
const [success, setSuccess] = useState(false)
const [email, setEmail] = useState('')
const [full_name, setFullName] = useState('')
const [role, setRole] = useState('operator')
const [job_title, setJobTitle] = useState('')
```

### handleSubmit — IMPORTANTE
```typescript
// Invitar usuario via Supabase Admin API
// NO usar supabase.auth.signUp (eso es para registro público)
// Usar fetch al API route que crearemos

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  setError(null)
  setSuccess(false)

  if (!email.trim() || !full_name.trim()) {
    setError('Email y nombre son obligatorios.')
    return
  }

  setLoading(true)

  try {
    const response = await fetch('/api/users/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        full_name: full_name.trim(),
        role,
        job_title: job_title.trim() || null,
        company_id: companyId,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      setError(data.error ?? 'Error al invitar al usuario.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    resetForm()
    router.refresh()

    setTimeout(() => {
      setOpen(false)
      setSuccess(false)
    }, 1500)

  } catch {
    setError('Error de conexión. Intenta de nuevo.')
    setLoading(false)
  }
}
```

### Campos del formulario
Usar inputStyle y labelStyle de NewCustomerForm.tsx

1. full_name — text requerido, placeholder "Nombre completo"
2. email — email requerido, placeholder "correo@empresa.com"
3. role — select:
   - operator → "Operativo — registra ventas y operaciones"
   - manager  → "Gerente — ve todos los módulos sin editar config"
   - admin    → "Administrador — acceso completo"
4. job_title — text opcional, placeholder "Ej: Vendedor, Contador"

Nota informativa debajo del campo role:
```tsx
<div style={{
  background: 'var(--gold-bg)', border: '1px solid var(--gold-bdr)',
  borderRadius: 8, padding: '8px 12px', fontSize: 11, color: 'var(--text2)'
}}>
  📧 El usuario recibirá un email de invitación para crear su contraseña.
</div>
```

Botón disparador:
```tsx
<button style={{ background: 'linear-gradient(135deg, #F5C842, #F09A1A)', color: '#1A1B2E' }}
  className="font-syne font-bold text-sm px-4 py-2 rounded-lg">
  + Invitar usuario
</button>
```

Modal: maxWidth 440, mismo patrón que NewCustomerForm

---

## ARCHIVO 3: src/components/settings/EditUserRoleForm.tsx

### Tipo
'use client'

### Props
```typescript
interface EditUserRoleFormProps {
  userId: string
  currentRole: string
}
```

### Estado
```typescript
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
const [role, setRole] = useState(currentRole)
const [saved, setSaved] = useState(false)
```

### Descripción
Componente inline — NO es un modal. Es un select pequeño que aparece directamente en la fila de la tabla. Al cambiar el valor llama al API route y actualiza el rol.

### handleChange
```typescript
async function handleChange(newRole: string) {
  setRole(newRole)
  setSaved(false)
  setError(null)
  setLoading(true)

  try {
    const response = await fetch('/api/users/update-role', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role: newRole }),
    })

    const data = await response.json()

    if (!response.ok) {
      setError(data.error ?? 'Error al actualizar rol')
      setRole(currentRole) // revertir
      setLoading(false)
      return
    }

    setSaved(true)
    setLoading(false)
    setTimeout(() => setSaved(false), 2000)

  } catch {
    setError('Error de conexión')
    setRole(currentRole)
    setLoading(false)
  }
}
```

### JSX
```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
  <select
    value={role}
    onChange={(e) => handleChange(e.target.value)}
    disabled={loading}
    style={{
      fontSize: 11,
      padding: '3px 8px',
      borderRadius: 6,
      border: '1px solid var(--border2)',
      background: 'var(--surface)',
      color: 'var(--text)',
      fontFamily: 'var(--font-jakarta)',
      cursor: loading ? 'not-allowed' : 'pointer',
      opacity: loading ? 0.6 : 1,
    }}
  >
    <option value="operator">Operativo</option>
    <option value="manager">Gerente</option>
    <option value="admin">Admin</option>
  </select>
  {loading && <span style={{ fontSize: 10, color: 'var(--muted)' }}>...</span>}
  {saved && <span style={{ fontSize: 10, color: 'var(--green)' }}>✓</span>}
  {error && <span style={{ fontSize: 10, color: 'var(--red)' }}>✗</span>}
</div>
```

---

## ARCHIVO 4: src/app/api/users/invite/route.ts

### Tipo
API Route — Next.js App Router

### Imports
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
```

### Lógica
```typescript
export async function POST(request: NextRequest) {
  try {
    const { email, full_name, role, job_title, company_id } = await request.json()

    if (!email || !full_name || !company_id) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Verificar que el usuario que invita es admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: inviterData } = await supabase
      .from('users')
      .select('role, is_pulse_admin, company_id')
      .eq('id', user.id)
      .single()

    if (inviterData?.role !== 'admin' && !inviterData?.is_pulse_admin) {
      return NextResponse.json({ error: 'Sin permisos para invitar usuarios' }, { status: 403 })
    }

    if (inviterData?.company_id !== company_id && !inviterData?.is_pulse_admin) {
      return NextResponse.json({ error: 'Sin permisos para esta empresa' }, { status: 403 })
    }

    // 2. Crear usuario en Supabase Auth con invitación
    // Usar service role para poder crear usuarios
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: authData, error: authError } = await serviceSupabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    })

    if (authError) {
      // Si el usuario ya existe en auth, continuar con la creación en users
      if (!authError.message.includes('already been registered')) {
        return NextResponse.json({ error: authError.message }, { status: 400 })
      }
    }

    const userId = authData?.user?.id

    if (userId) {
      // 3. Crear registro en tabla users
      const { error: userError } = await serviceSupabase
        .from('users')
        .upsert({
          id:           userId,
          company_id:   company_id,
          full_name:    full_name,
          email:        email,
          role:         role ?? 'operator',
          job_title:    job_title ?? null,
          is_pulse_admin: false,
        }, {
          onConflict: 'id'
        })

      if (userError) {
        return NextResponse.json({ error: userError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, message: `Invitación enviada a ${email}` })

  } catch (error) {
    console.error('Error invitando usuario:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
```

---

## ARCHIVO 5: src/app/api/users/update-role/route.ts

### Tipo
API Route — Next.js App Router

### Lógica
```typescript
export async function PATCH(request: NextRequest) {
  try {
    const { userId, role } = await request.json()

    if (!userId || !role) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const validRoles = ['admin', 'manager', 'operator']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Verificar que quien cambia el rol es admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: changerData } = await supabase
      .from('users')
      .select('role, is_pulse_admin, company_id')
      .eq('id', user.id)
      .single()

    if (changerData?.role !== 'admin' && !changerData?.is_pulse_admin) {
      return NextResponse.json({ error: 'Sin permisos para cambiar roles' }, { status: 403 })
    }

    // 2. Verificar que el usuario a modificar pertenece a la misma empresa
    const { data: targetUser } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', userId)
      .single()

    if (targetUser?.company_id !== changerData?.company_id && !changerData?.is_pulse_admin) {
      return NextResponse.json({ error: 'Sin permisos para este usuario' }, { status: 403 })
    }

    // 3. Actualizar rol
    const { error: updateError } = await supabase
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error actualizando rol:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
```

---

## Estructura de carpetas a crear

```
src/app/
├── api/
│   └── users/
│       ├── invite/
│       │   └── route.ts       ← ARCHIVO 4
│       └── update-role/
│           └── route.ts       ← ARCHIVO 5
└── (dashboard)/
    └── settings/
        └── users/
            └── page.tsx       ← ARCHIVO 1 (reemplaza el placeholder)

src/components/
└── settings/
    ├── InviteUserForm.tsx     ← ARCHIVO 2
    └── EditUserRoleForm.tsx   ← ARCHIVO 3
```

---

## Reglas de código — OBLIGATORIAS

1. TypeScript estricto — tipos explícitos en TODO
2. Variables CSS — SOLO var(--gold), var(--text), etc.
3. Soft delete — SIEMPRE .is('deleted_at', null) en queries de users
4. El API route /invite usa SUPABASE_SERVICE_ROLE_KEY para poder crear usuarios
5. NUNCA exponer SUPABASE_SERVICE_ROLE_KEY al frontend
6. Error handling completo en todos los API routes
7. Comentarios en español
8. NO usar librerías externas de UI
9. EditUserRoleForm es inline (no modal) — cambia el rol inmediatamente al seleccionar
10. Solo admin puede ver el botón de invitar y el selector de rol en la tabla
