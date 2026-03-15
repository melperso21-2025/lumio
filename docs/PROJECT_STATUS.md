# Lumio — Estado del Proyecto

**Última actualización:** Marzo 2025

Documento de referencia para conocer el estado actual del proyecto, lo implementado, lo pendiente y posibles desarrollos futuros.

---

## 1. Resumen ejecutivo

**Lumio** es una plataforma SaaS de inteligencia de negocio para PyMEs (Ecuador y América Latina), producto de la consultora **Pulse**. Conecta ventas, pautas publicitarias y finanzas en un solo lugar, con un motor de IA (Claude API) para insights semanales.

**Stack:** Next.js 16 · Tailwind v4 · Supabase (PostgreSQL + Auth) · TypeScript

---

## 2. Estructura de archivos actual

```
src/
├── app/
│   ├── layout.tsx                    ✅ Root layout (fuentes Syne + Jakarta)
│   ├── page.tsx                      ✅ Redirige a /dashboard
│   ├── globals.css                   ✅ Variables CSS, reset
│   ├── login/page.tsx                ✅ Login completo (email/password, recuperación)
│   ├── auth/callback/route.ts        ✅ Callback Supabase Auth
│   ├── (dashboard)/
│   │   ├── layout.tsx                ✅ Layout con Sidebar + datos usuario
│   │   ├── dashboard/page.tsx        ✅ Dashboard principal (4 bloques KPIs)
│   │   ├── sales/page.tsx            ✅ Módulo Ventas (tabla + QuickSaleForm)
│   │   ├── ad-campaigns/page.tsx     ✅ Módulo Pautas (tabla + NewCampaignForm)
│   │   ├── customers/page.tsx        🚧 Placeholder
│   │   ├── inventory/page.tsx        🚧 Placeholder
│   │   ├── finance/page.tsx          🚧 Placeholder
│   │   ├── profit-loss/page.tsx      🚧 Placeholder
│   │   ├── ai-insights/page.tsx      🚧 Placeholder
│   │   └── settings/
│   │       ├── users/page.tsx        🚧 Placeholder
│   │       └── import/page.tsx       🚧 Placeholder
│   └── pulse-admin/
│       ├── layout.tsx                ✅ Layout oscuro, solo is_pulse_admin
│       ├── page.tsx                  ✅ Panel con empresas, KPIs globales
│       └── companies/page.tsx        🚧 Placeholder
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx               ✅ Navegación, user chip, sección Pulse Admin
│   │   └── Topbar.tsx                ✅ Título, selector período, Exportar, acción primaria
│   ├── ui/
│   │   ├── KpiCard.tsx               ✅ Card KPI con hover, delta, compare
│   │   └── AiInsightBox.tsx          ✅ Caja insight (variantes gold/red/green/blue)
│   ├── sales/
│   │   └── QuickSaleForm.tsx         ✅ Modal registrar venta (con canales opcionales)
│   └── ad-campaigns/
│       └── NewCampaignForm.tsx       ✅ Formulario pauta (flotante, preview ROAS/CTR)
├── lib/
│   └── supabase/
│       ├── client.ts                 ✅ Cliente browser
│       ├── server.ts                 ✅ Cliente server (cookies)
│       └── database.types.ts         ✅ Tipos generados (1519 líneas)
└── middleware.ts                     ✅ Protección rutas, refresh sesión
```

---

## 3. Rutas y navegación

| Ruta | Estado | Descripción |
|------|--------|-------------|
| `/` | ✅ | Redirige a `/dashboard` |
| `/login` | ✅ | Login, recuperación contraseña |
| `/auth/callback` | ✅ | Callback OAuth / magic link |
| `/dashboard` | ✅ | Dashboard principal con 4 bloques |
| `/sales` | ✅ | Ventas: KPIs, tabla, + Registrar venta |
| `/ad-campaigns` | ✅ | Pautas: KPIs, tabla, + Registrar pauta |
| `/customers` | 🚧 | Placeholder CRM |
| `/inventory` | 🚧 | Placeholder inventario |
| `/finance` | 🚧 | Placeholder bancos |
| `/profit-loss` | 🚧 | Placeholder P&G |
| `/ai-insights` | 🚧 | Placeholder IA |
| `/settings/users` | 🚧 | Placeholder usuarios |
| `/settings/import` | 🚧 | Placeholder importar |
| `/pulse-admin` | ✅ | Panel Pulse (solo is_pulse_admin) |
| `/pulse-admin/companies` | 🚧 | Placeholder gestión empresas |

---

## 4. Base de datos — Tablas y relaciones

### Tablas principales (Supabase)

| Tabla | Uso actual | Relaciones |
|-------|------------|------------|
| `companies` | Layout, Pulse Admin, filtro tenant | — |
| `users` | Auth, layout, QuickSaleForm, Pulse Admin | → companies |
| `sales` | Ventas, QuickSaleForm | → companies, sales_channels, customers |
| `ad_campaigns` | Pautas, NewCampaignForm | → companies |
| `weekly_snapshots` | Dashboard KPIs | → companies |
| `ai_insights` | Dashboard insight, IA | → companies |
| `sales_channels` | QuickSaleForm (opcional) | → companies |
| `customers` | — | → companies |
| `products` | — | → companies, product_categories |
| `inventory_movements` | — | → companies, products |
| `bank_accounts` | — | → companies |
| `bank_transactions` | — | → companies, bank_accounts |
| `accounts_receivable` | — | → companies, customers |
| `branches` | — | → companies |
| `suppliers` | — | → companies |
| `product_categories` | — | → companies |
| `product_price_history` | — | → products |
| `pulse_metrics` | Pulse Admin (fetch, no UI) | → companies |
| `audit_log` | — | — |
| `cities`, `countries` | — | Referencias |

### Funciones RPC disponibles

- `calculate_weekly_snapshot(p_company_id, p_week, p_year)`
- `get_user_company_id()`
- `get_user_role()`
- `is_pulse_admin()`

---

## 5. Avances por módulo

### ✅ Completado

| Módulo | Funcionalidad |
|--------|---------------|
| **Auth** | Login email/password, recuperación, callback, middleware |
| **Layout** | Sidebar (nav, user chip, Pulse Admin condicional), Topbar |
| **Dashboard** | 4 bloques (Ventas, Pautas, Finanzas), AiInsightBox, weekly_snapshots, ai_insights |
| **Ventas** | KPIs calculados, tabla historial, QuickSaleForm (INSERT), badges estado |
| **Pautas** | KPIs calculados, tabla historial, NewCampaignForm (INSERT), badges efectividad/plataforma |
| **Pulse Admin** | Layout oscuro, conteo empresas/usuarios, tabla empresas, badges estado |

### 🚧 Placeholder (estructura lista)

- Clientes, Inventario, Bancos, P&G, IA Insights, Usuarios, Importar, Pulse/Companies

### ⚠️ Pendiente / mejoras

| Área | Detalle |
|------|---------|
| **Ventas** | Columna Canal muestra "—" (no se hace join con sales_channels para nombre) |
| **Dashboard** | Deltas en KpiCards (comparar vs período anterior) no implementados |
| **Topbar** | Selector período y Exportar no tienen lógica real |
| **weekly_snapshots** | Depende de job/cron que ejecute `calculate_weekly_snapshot` |
| **ai_insights** | No hay generación automática con Claude API |

---

## 6. Componentes reutilizables

| Componente | Props | Uso |
|------------|-------|-----|
| `KpiCard` | label, value, delta?, compare?, isGold?, prefix?, suffix? | Dashboard, Ventas, Pautas, Pulse |
| `AiInsightBox` | title, text, variant? (gold/red/green/blue) | Dashboard, Pautas, Pulse |
| `Topbar` | pageTitle, pageSubtitle?, primaryAction? | Todas las páginas dashboard |
| `Sidebar` | userName?, userRole?, companyName?, isPulseAdmin? | Layout dashboard |
| `QuickSaleForm` | channels? (opcional) | Ventas |
| `NewCampaignForm` | — | Pautas |

**No existen aún:** DataTable, BarChart (mencionados en CURSOR_CONTEXT)

---

## 7. Seguridad y permisos

- **Middleware:** Redirige a `/login` si no hay sesión; a `/dashboard` si hay sesión y está en `/login`
- **Layout dashboard:** Obtiene usuario, company_id; redirige si no hay usuario
- **Layout pulse-admin:** Redirige si no hay usuario o `is_pulse_admin !== true`
- **RLS:** Supabase Row Level Security (configurado en BD, no en código)
- **Roles:** admin, manager, operator (en users.role) — no hay lógica de permisos por rol en UI aún

---

## 8. Posibles desarrollos — Hoja de ruta

### Fase 1 — Completar módulos core (prioridad alta)

1. **Clientes (CRM)**
   - CRUD customers
   - Relación con sales (customer_id)
   - Tipos: customer_type, label

2. **Inventario**
   - CRUD products, product_categories
   - inventory_movements (entradas/salidas)
   - Vista stock actual, alertas bajo stock

3. **Bancos & Finanzas**
   - CRUD bank_accounts
   - bank_transactions (ingresos/egresos)
   - Saldo calculado o por trigger

4. **P&G (Pérdidas y ganancias)**
   - Vista consolidada ingresos vs gastos
   - Usar sales, ad_campaigns, bank_transactions, etc.

### Fase 2 — IA y analítica

5. **IA Insights**
   - Integración Claude API
   - Generar ai_insights (executive_summary, playbook)
   - Job semanal o manual

6. **weekly_snapshots**
   - Cron/job que llame `calculate_weekly_snapshot`
   - O implementar cálculo en backend

7. **Deltas en KPIs**
   - Comparar snapshot actual vs anterior
   - Mostrar ▲/▼ en KpiCards

### Fase 3 — Configuración y operación

8. **Usuarios & Roles**
   - CRUD usuarios por empresa
   - Asignar rol (admin/manager/operator)
   - Invitar por email

9. **Importar datos**
   - Carga CSV para sales, customers, products
   - Validación y mapeo columnas

10. **Selector período Topbar**
    - Pasar período a páginas (context o query)
    - Filtrar datos por semana/mes/30 días

11. **Exportar**
    - Export CSV/Excel de tablas visibles

### Fase 4 — Pulse Admin

12. **Gestión empresas**
    - CRUD companies
    - Asignar plan, status (active/trial/suspended)
    - Crear usuarios iniciales

13. **pulse_metrics**
    - UI para ver/editar métricas por empresa
    - MRR, Churn, NPS, etc.

14. **Canal en Ventas**
    - Join sales_channels para mostrar nombre en tabla
    - Selector de canal en QuickSaleForm (ya tiene prop channels)

---

## 9. Dependencias técnicas

- **Supabase:** RLS, triggers para stock/saldo, funciones RPC
- **Claude API:** Para ai_insights (requiere API key, job/cron)
- **Vercel Cron / Supabase Edge Functions:** Para weekly_snapshots y ai_insights automáticos

---

## 10. Checklist rápido

| Item | Estado |
|------|--------|
| Login / Auth | ✅ |
| Layout dashboard | ✅ |
| Dashboard 4 bloques | ✅ |
| Ventas (listado + alta) | ✅ |
| Pautas (listado + alta) | ✅ |
| Pulse Admin básico | ✅ |
| Clientes | 🚧 |
| Inventario | 🚧 |
| Bancos | 🚧 |
| P&G | 🚧 |
| IA Insights (UI + generación) | 🚧 |
| Usuarios & Roles | 🚧 |
| Importar datos | 🚧 |
| Deltas en KPIs | ❌ |
| Selector período funcional | ❌ |
| Exportar | ❌ |
| Canal en ventas (nombre) | ❌ |

---

*Documento generado para planificación. Actualizar según avances.*
