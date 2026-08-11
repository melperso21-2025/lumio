# Estándares de Seguridad — Lumio

> Checklist obligatorio. Todo nuevo endpoint, página o migración debe cumplir estas reglas antes de llegar a `main`.

---

## 1. Autenticación y autorización

### En API Routes (`/api/**`)
- Siempre llamar `supabase.auth.getUser()` al inicio — nunca confiar en headers manuales
- Verificar que el usuario tenga `company_id` asignado antes de operar datos
- Para operaciones destructivas (delete, update masivo): verificar rol `admin` o `is_pulse_admin`
- `supabaseAdmin` **solo** para operaciones que requieren bypassear RLS con propósito explícito (invite, cron, webhooks). Nunca en rutas que el usuario final dispara directamente

### En Server Components (`page.tsx`)
- Usar `createClient()` (cliente con cookies del usuario), **nunca** `supabaseAdmin`
- El cliente con sesión respeta RLS — es la protección real contra cross-tenant
- Si la query falla por RLS, es una señal de que falta una política, no de que hay que usar admin

### Multi-tenant
- Toda query de datos de negocio debe incluir `.eq('company_id', companyId)` explícito
- El `companyId` siempre se obtiene del perfil del usuario autenticado, nunca del body/query params
- En API Routes donde el cliente envía `companyId` (ej: ai-insights), verificar que la empresa exista y no esté eliminada antes de procesar

---

## 2. RLS (Row Level Security)

### Toda tabla de negocio debe tener:
```sql
ALTER TABLE public.mi_tabla ENABLE ROW LEVEL SECURITY;

-- SELECT: solo registros de la empresa del usuario y no eliminados
CREATE POLICY mi_tabla_select ON public.mi_tabla FOR SELECT
  USING (company_id = get_user_company_id() AND deleted_at IS NULL);

-- INSERT: solo para la propia empresa
CREATE POLICY mi_tabla_insert ON public.mi_tabla FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

-- UPDATE: solo registros propios y no eliminados
CREATE POLICY mi_tabla_update ON public.mi_tabla FOR UPDATE
  USING (company_id = get_user_company_id() AND deleted_at IS NULL);
```

### Reglas obligatorias de RLS
- **Siempre** incluir `deleted_at IS NULL` en SELECT y UPDATE para tablas con soft-delete
- Usar `get_user_company_id()` — nunca hardcodear IDs
- Políticas de Pulse Admin: agregar `OR is_pulse_admin()` cuando aplique
- Nunca crear políticas que cubran `DELETE` — usamos soft-delete siempre

### Soft-delete estándar
- Toda tabla de negocio tiene columna `deleted_at TIMESTAMPTZ NULL`
- Para eliminar: `UPDATE ... SET deleted_at = NOW()` — nunca `DELETE`
- Excepción: tablas de auditoría o log sin `deleted_at` usan `DELETE` físico (ej: `inventory_movements`)

---

## 3. Funciones y triggers de base de datos

### SECURITY DEFINER obligatorio
Toda función de trigger debe declarar:
```sql
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
```
Sin esto, la función hereda el `search_path` del contexto que la llama — riesgo de SQL injection por schema confusion.

### Parámetros de funciones RPC
- No cambiar el nombre ni el orden de parámetros en `CREATE OR REPLACE` — Postgres lo rechaza
- Para cambiar la firma: `DROP FUNCTION IF EXISTS` primero, luego `CREATE`

---

## 4. Rate limiting

### Endpoints que requieren rate limiting obligatorio
| Tipo | Limiter | Identificador |
|------|---------|---------------|
| Auth (login, reset) | `authLimiter` (10/min) | IP |
| IA (generate, generate-initial, module) | `aiLimiter` (5/5min) | IP |
| APIs generales | `apiLimiter` (60/min) | IP (si aplica) |

### Implementación estándar
```typescript
import { aiLimiter, checkRateLimit } from '@/lib/ratelimit'

const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
const rl = await checkRateLimit(aiLimiter, `prefijo-endpoint:${ip}`)
if (!rl.allowed) {
  return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en unos minutos.' }, { status: 429 })
}
```

El rate limiter falla abierto si no hay variables de Upstash configuradas — **verificar que estén en producción**.

---

## 5. Endpoints internos

### Proteger con secreto compartido
Cualquier endpoint que no deba ser llamado por el cliente final:
```typescript
const internalSecret = request.headers.get('x-internal-secret')
if (!internalSecret || internalSecret !== process.env.INTERNAL_API_SECRET) {
  return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
}
```

### Crons de Vercel
```typescript
const authHeader = request.headers.get('authorization')
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
}
```

---

## 6. Manejo de errores

### Nunca exponer mensajes internos al cliente
```typescript
// ❌ MAL — expone detalles de PostgreSQL
if (error) return NextResponse.json({ error: error.message }, { status: 500 })

// ✅ BIEN — log interno, mensaje genérico al cliente
if (error) {
  console.error('[nombre-endpoint] error:', error.message)
  return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
}
```

### console.log en producción
- `console.log` no debe existir en código de producción — usar solo para debug temporal
- `console.error` está permitido para registrar errores reales en servidor

---

## 7. Validación de inputs

### Parámetros de fecha
Siempre validar formato antes de pasar a queries:
```typescript
const isoDate = /^\d{4}-\d{2}-\d{2}$/
const from = isoDate.test(params.from ?? '') ? params.from! : defaults.from
const to   = isoDate.test(params.to   ?? '') ? params.to!   : defaults.to
```

### Queries sin filtro de período
Si una query no filtra por fechas y puede devolver todos los registros históricos:
```typescript
.limit(500) // protección ante empresas con historial grande
```

### Roles permitidos
Definir siempre como constante, no inline:
```typescript
const VALID_ROLES = new Set(['admin', 'manager', 'operator'])
if (!VALID_ROLES.has(role)) return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
```

---

## 8. Accesibilidad mínima

### Tablas
- Todo `<th>` en `<thead>` debe tener `scope="col"`
- Todo `<th>` en `<tbody>` (cabecera de fila) debe tener `scope="row"`

### Botones de filtro/toggle
- Agregar `aria-pressed={isActive}` y `type="button"` explícito

---

## 9. Variables de entorno requeridas

| Variable | Uso | Entornos |
|----------|-----|----------|
| `SUPABASE_URL` | Conexión Supabase | dev, prod |
| `SUPABASE_ANON_KEY` | Cliente público | dev, prod |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client (RLS bypass) | dev, prod |
| `ANTHROPIC_API_KEY` | Claude API | dev, prod |
| `RESEND_API_KEY` | Email | dev, prod |
| `NEXT_PUBLIC_APP_URL` | URLs de redirección | dev, prod |
| `CRON_SECRET` | Autenticar crons de Vercel | prod |
| `INTERNAL_API_SECRET` | Endpoints internos (verify-session) | dev, prod |
| `UPSTASH_REDIS_REST_URL` | Rate limiting | dev, prod |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting | dev, prod |

---

## 10. Checklist de PR

Antes de hacer merge a `main`, verificar:

- [ ] Nuevas API routes tienen `getUser()` al inicio
- [ ] `supabaseAdmin` solo donde es estrictamente necesario (con comentario explicando por qué)
- [ ] Nuevas tablas tienen RLS habilitado con las 3 políticas base + `deleted_at IS NULL`
- [ ] Funciones trigger tienen `SECURITY DEFINER SET search_path = public`
- [ ] Endpoints de IA tienen `aiLimiter`
- [ ] Errores de DB van a `console.error`, no al cliente
- [ ] Parámetros de fecha validados con regex
- [ ] `<th>` con `scope="col"` y botones toggle con `aria-pressed`
- [ ] Variables de entorno nuevas documentadas en esta sección 9
