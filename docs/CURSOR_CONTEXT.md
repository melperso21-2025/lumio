# LUMIO — Contexto maestro del proyecto
# Pega esto en Cursor AI (Ctrl+L) UNA SOLA VEZ al inicio de cada sesión de trabajo

---

## ¿Qué es este proyecto?

Lumio es una plataforma SaaS de inteligencia de negocio para PyMEs de Ecuador y América Latina.
Es un producto de la consultora **Pulse**.

El sistema conecta tres módulos que las PyMEs siempre han tenido separados:
- Ventas y transacciones
- Pautas publicitarias (Meta Ads, Google Ads) con cálculo automático de ROAS, CTR, efectividad
- Finanzas (P&G, bancos, cuentas por cobrar)

Tiene un motor de IA (Claude API de Anthropic) que genera insights semanales y un playbook
de acciones priorizadas para el dueño del negocio.

---

## Stack tecnológico

- **Framework:** Next.js 14+ con App Router y TypeScript
- **Estilos:** Tailwind CSS + variables CSS personalizadas (NO uses clases de Tailwind para colores de marca — usa las variables CSS)
- **Base de datos:** Supabase (PostgreSQL) con Row Level Security
- **Auth:** Supabase Auth (email + contraseña)
- **Fuentes:** Syne (títulos, logo, KPIs) + Plus Jakarta Sans (body, UI)
- **IA:** Anthropic Claude API

---

## Identidad visual — CRÍTICO, nunca cambiar

### Paleta Light Mode (DEFAULT — siempre usar esto)
```
--bg:        #F7F8FC   (fondo de la app)
--surface:   #FFFFFF   (cards, sidebar, topbar)
--border:    #E4E6F0   (bordes)
--border2:   #CDD0E0   (bordes más oscuros)
--text:      #1A1B2E   (texto principal)
--text2:     #4A4D6A   (texto secundario)
--muted:     #9294AC   (labels, placeholders)
--hover:     rgba(26,27,46,0.04)
```

### Colores de marca (invariables)
```
--gold:      #E8A500   (acento principal — botones, links activos, logo)
--gold-light:#F5C842   (gradiente gold)
--amber:     #F09A1A   (gradiente amber)
--gold-bg:   rgba(232,165,0,0.08)   (fondo sutil dorado)
--gold-bdr:  rgba(232,165,0,0.22)   (borde dorado sutil)
--green:     #059669   (métricas positivas, ▲ deltas)
--red:       #DC2626   (métricas negativas, errores)
--blue:      #2563EB   (info, links secundarios)
--orange:    #D97706   (alertas, advertencias)
```

### Tipografía
- **Títulos y logo:** `font-family: var(--font-syne)` — siempre bold/extrabold
- **Body y UI:** `font-family: var(--font-jakarta)` — weights 300-600
- El logo siempre en minúsculas: **lumio** con la "m" en color dorado
- KPI values: Syne Bold, tamaño grande

### Logo
```tsx
// Siempre así — nunca cambiar
<span className="font-syne font-extrabold" style={{color:'var(--text)'}}>
  lu<span style={{color:'var(--gold)'}}>m</span>io
</span>
```

### Botón primario
```tsx
// Gradiente dorado, texto oscuro
style={{
  background: 'linear-gradient(135deg, #F5C842, #F09A1A)',
  color: '#1A1B2E',
  fontFamily: 'var(--font-syne)',
  fontWeight: 700,
}}
```

### Inputs
- Fondo: `var(--surface)`, borde: `var(--border2)`
- Al focus: `borderColor: 'var(--gold)'` + `boxShadow: '0 0 0 3px var(--gold-bg)'`

---

## Estructura de archivos del proyecto

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx          ✅ LISTO
│   ├── (dashboard)/
│   │   ├── layout.tsx              (sidebar + topbar)
│   │   ├── dashboard/page.tsx      (4 bloques de KPIs)
│   │   ├── sales/page.tsx
│   │   ├── ad-campaigns/page.tsx   (módulo pautas — el más importante)
│   │   ├── inventory/page.tsx
│   │   ├── finance/page.tsx
│   │   ├── customers/page.tsx
│   │   ├── ai-insights/page.tsx
│   │   └── settings/
│   │       ├── users/page.tsx
│   │       └── import/page.tsx
│   ├── auth/callback/route.ts      ✅ LISTO
│   ├── layout.tsx                  ✅ LISTO
│   └── globals.css                 ✅ LISTO
├── lib/
│   └── supabase/
│       ├── client.ts               ✅ LISTO
│       └── server.ts               ✅ LISTO
├── components/
│   ├── ui/                         (componentes reutilizables)
│   │   ├── KpiCard.tsx
│   │   ├── DataTable.tsx
│   │   ├── BarChart.tsx
│   │   └── AiInsightBox.tsx
│   └── layout/
│       ├── Sidebar.tsx
│       └── Topbar.tsx
└── middleware.ts                   ✅ LISTO
```

---

## Base de datos — tablas principales (Supabase)

Las tablas siguen estos estándares:
- Nombres en inglés, snake_case
- Todas tienen: `created_at`, `updated_at`, `deleted_at` (soft delete)
- Todas tienen: `metadata jsonb`, `tags text[]`
- Nunca usar DELETE — siempre UPDATE deleted_at = now()

Tablas del MVP:
```
companies          → empresa cliente (tenant principal)
users              → extiende auth.users, tiene rol: admin|manager|operator
branches           → locales/sucursales de cada empresa
sales_channels     → canales: physical|web|whatsapp|marketplace|b2b
customers          → CRM básico con customer_type y label; lifetime_value y last_purchase_at se actualizan vía trigger tg_update_customer_stats
sales              → ventas, tiene week_number GENERATED automático
ad_campaigns       → pautas, tiene roas/ctr/cpm/effectiveness GENERATED
product_categories → categorías jerárquicas
suppliers          → proveedores con lead_time_days
products           → catálogo con current_stock (actualiza via trigger)
inventory_movements→ inmutable, actualiza stock via trigger
bank_accounts      → cuentas bancarias
bank_transactions  → inmutable, actualiza saldo via trigger
accounts_receivable→ CxC
ai_insights        → insights semanales generados por Claude API
weekly_snapshots   → KPIs pre-calculados para el dashboard (leer aquí primero)
audit_log          → inmutable, se llena via triggers
```

---

## Arquitectura de datos — cómo leer del dashboard

```typescript
// El dashboard SIEMPRE lee de weekly_snapshots primero (pre-calculado, ultra rápido)
// Los módulos individuales calculan al vuelo desde las tablas originales

// Patrón para queries con soft delete:
const { data } = await supabase
  .from('sales')
  .select('*')
  .eq('company_id', companyId)
  .is('deleted_at', null)        // ← SIEMPRE agregar esto
  .order('sale_date', { ascending: false })
```

---

## Seguridad — RLS

- Cada usuario solo ve datos de su `company_id`
- El middleware redirige a `/login` si no hay sesión
- Roles: `admin` (todo), `manager` (lectura + análisis), `operator` (solo carga datos)
- `is_pulse_admin = true` → ve todo (panel de Pulse)

---

## Modelo de negocio — cómo opera Lumio

- **Pulse administra** las cuentas de empresas (no hay registro público en el MVP)
- Pulse crea las empresas en Supabase y les invita por email
- El cliente recibe credenciales y solo usa la app
- El panel de Pulse Admin (`/pulse-admin`) solo es visible para `is_pulse_admin = true`

---

## Dashboard — estructura de 4 bloques

El dashboard principal tiene KPIs organizados en bloques visuales:

```
BLOQUE 1 — VENTAS
  Ventas $ | Transacciones | LPP | Costo ($%) | Contribución | Descuentos

BLOQUE 2 — INVENTARIO
  Top 3 sin movimiento | Capital paralizado | Días de inventario

BLOQUE 3 — PAUTAS
  Inversión vs período ant. | ROAS | Leads | Calidad contactos | Tasa conversión

BLOQUE 4 — FINANCIERO
  Ingresos vs Egresos | CxC vencidas | Días de caja | Margen neto | Gastos fijos %
```

Cada bloque tiene:
- Un header con título, color de acento y link "Ver detalle →"
- Los KPI cards con valor principal, delta vs período anterior y comparativo

---

## Reglas de código — seguir siempre

1. **TypeScript estricto** — siempre tipar props, estados y respuestas de Supabase
2. **'use client'** solo cuando sea necesario (formularios, hooks de estado)
3. **Server Components** por defecto para páginas y layouts
4. **Variables CSS** para colores de marca — NUNCA hardcodear hex en componentes
5. **Soft delete** — nunca `.delete()`, siempre `.update({ deleted_at: new Date() })`
6. **Error handling** — siempre manejar el `error` de Supabase, nunca asumir éxito
7. **Loading states** — siempre mostrar feedback al usuario mientras carga
8. **Comentarios en español** — el código en inglés, los comentarios en español

---

## Componentes reutilizables — estructura esperada

```tsx
// KpiCard — patrón estándar para todos los KPIs del dashboard
interface KpiCardProps {
  label: string
  value: string | number
  delta?: number        // positivo = verde, negativo = rojo
  compare?: string      // "Prom: $128" o "Ant: $4.0"
  isGold?: boolean      // para destacar el KPI principal (ROAS, ventas)
}
```

---

## Lo que está LISTO (no tocar)

- `src/app/layout.tsx` — fuentes Syne + Plus Jakarta Sans
- `src/app/globals.css` — variables CSS y reset
- `src/app/login/page.tsx` — pantalla de login completa
- `src/app/auth/callback/route.ts` — callback de Supabase Auth
- `src/lib/supabase/client.ts` — cliente browser
- `src/lib/supabase/server.ts` — cliente server
- `src/middleware.ts` — protección de rutas
- `tailwind.config.ts` — configuración con fuentes y colores

---

## Próximo a construir

1. `src/components/layout/Sidebar.tsx` — sidebar con navegación
2. `src/components/layout/Topbar.tsx` — barra superior
3. `src/app/(dashboard)/layout.tsx` — layout del dashboard con sidebar + topbar
4. `src/components/ui/KpiCard.tsx` — card de KPI reutilizable
5. `src/app/(dashboard)/dashboard/page.tsx` — dashboard principal con 4 bloques

---

## Instrucción para el agente

Cuando generes código para este proyecto:
- Respeta SIEMPRE la paleta de colores y tipografía definida arriba
- Usa variables CSS (`var(--gold)`, `var(--text)`, etc.) en lugar de clases Tailwind para los colores de marca
- El diseño es Light Mode por defecto, limpio, profesional — referencia: Stripe Dashboard, Linear, Notion
- NO uses librerías de componentes externas (shadcn, MUI, Ant) — todo custom con Tailwind + CSS vars
- Los datos de prueba deben ser realistas (nombres ecuatorianos, $ en dólares, semanas reales)
- Siempre incluir loading state y error handling en componentes con datos
