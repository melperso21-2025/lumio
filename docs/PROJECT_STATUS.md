# Lumio — Estado del Proyecto

**Última actualización:** 11 de abril de 2026

Documento de referencia para conocer el estado actual del proyecto, lo implementado, lo pendiente y posibles desarrollos futuros.

---

## 1. Resumen ejecutivo

**Lumio** es una plataforma SaaS de inteligencia de negocio para PyMEs (Ecuador y América Latina), producto de la consultora **Pulse**. Conecta ventas, pautas publicitarias y finanzas en un solo lugar, con un motor de IA (Claude API) para insights semanales.

**Stack:** Next.js 16 · Tailwind v4 · Supabase (PostgreSQL + Auth) · TypeScript · SheetJS (xlsx)

---

## 2. Estructura de archivos actual

```
src/
├── app/
│   ├── layout.tsx                    ✅ Root layout (fuentes Syne + Jakarta)
│   ├── page.tsx                      ✅ Redirige a /dashboard
│   ├── globals.css                   ✅ Variables CSS, reset
│   ├── login/page.tsx                ✅ Login (email/password, recuperación)
│   ├── auth/callback/route.ts        ✅ Callback Supabase Auth
│   ├── api/
│   │   ├── ai-insights/
│   │   │   ├── generate/route.ts     ✅ POST → genera insight con Claude API
│   │   │   └── request-correction/route.ts ✅ POST → crea solicitud en insight_requests
│   │   ├── snapshots/
│   │   │   └── calculate/route.ts   ✅ POST → recalcula weekly_snapshots (all / recalculateAll)
│   │   ├── import/
│   │   │   └── process/route.ts     ✅ POST → importa CSV
│   │   └── users/
│   │       ├── invite/route.ts      ✅ POST → invita usuario por email
│   │       └── update-role/route.ts ✅ POST → cambia rol
│   ├── (dashboard)/
│   │   ├── layout.tsx               ✅ Layout con DashboardShell + datos usuario
│   │   ├── dashboard/page.tsx       ✅ KPIs, gráficas, DateRangePicker, weekly_snapshots
│   │   ├── sales/page.tsx           ✅ Server: datos + Topbar; SalesOverview (KPIs, tabla, export)
│   │   ├── ad-campaigns/page.tsx    ✅ AdCampaignsOverview (KPIs, CampaignsTable)
│   │   ├── customers/page.tsx       ✅ CustomersOverview (KPIs, CustomersTable, export)
│   │   ├── inventory/page.tsx       ✅ InventoryOverview (KPIs, InventoryTable, export)
│   │   ├── finance/page.tsx         ✅ FinanceOverview (KPIs, TransactionsTable, cuentas)
│   │   ├── profit-loss/page.tsx     ✅ P&G + ProfitLossExportButton (export real a .xlsx)
│   │   ├── ai-insights/page.tsx     ✅ WeekSelector, insight completo (4 módulos + playbook),
│   │   │                               RequestCorrectionButton, detección de staleness
│   │   └── settings/
│   │       ├── users/page.tsx       ✅ InviteUserForm, EditUserRoleForm
│   │       └── import/page.tsx      ✅ ImportSection (CSV)
│   └── pulse-admin/
│       ├── layout.tsx               ✅ Solo is_pulse_admin
│       ├── page.tsx                 ✅ North Star, semáforo MVP, solicitudes corrección,
│       │                               RecalculateSnapshotsButton, KPIs globales, MRR
│       └── companies/page.tsx       ✅ Gestión empresas
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx              ✅ Navegación, user chip, Pulse Admin, onRequestHide
│   │   ├── Topbar.tsx               ✅ Título, DateRangePicker, Exportar, primaryAction, rightExtras
│   │   └── DashboardShell.tsx       ✅ Client wrapper: sidebar colapsable + pestaña de reapertura
│   │                                   (estado persistido en localStorage)
│   ├── ui/
│   │   ├── KpiCard.tsx              ✅ Delta, compare, prefix, suffix
│   │   ├── AiInsightBox.tsx         ✅ Variantes gold/red/green/blue
│   │   ├── DateRangePicker.tsx      ✅ ?from=&to= (presets + custom)
│   │   └── ExportButton.tsx         ✅ Exportar a .xlsx (SheetJS)
│   ├── dashboard/
│   │   ├── RegisterSaleButton.tsx   ✅ Modal registrar venta
│   │   └── PeriodSelector.tsx       ⚠️ Legacy (Topbar usa DateRangePicker)
│   ├── sales/
│   │   ├── SalesOverview.tsx        ✅ KPIs, AiInsightBox, SalesHistoryTable, ExportButton
│   │   ├── SalesHistoryTable.tsx    ✅ Tabla historial de ventas
│   │   └── QuickSaleForm.tsx        ✅ Modal registrar venta
│   ├── ad-campaigns/
│   │   ├── AdCampaignsOverview.tsx  ✅ KPIs, CampaignsTable
│   │   ├── CampaignsTable.tsx       ✅ Tabla campañas
│   │   └── NewCampaignForm.tsx      ✅ Alta pauta
│   ├── customers/
│   │   ├── CustomersOverview.tsx    ✅ KPIs, CustomersTable, ExportButton
│   │   ├── CustomersTable.tsx       ✅ Tabla clientes
│   │   └── NewCustomerForm.tsx      ✅ Modal nuevo cliente
│   ├── inventory/
│   │   ├── InventoryOverview.tsx    ✅ KPIs, InventoryTable, ExportButton
│   │   ├── InventoryTable.tsx       ✅ Productos y stock
│   │   ├── NewProductForm.tsx       ✅ Modal nuevo producto
│   │   └── AddMovementForm.tsx      ✅ Modal movimiento inventario
│   ├── finance/
│   │   ├── FinanceOverview.tsx      ✅ KPIs, cuentas, TransactionsTable
│   │   ├── TransactionsTable.tsx    ✅ Movimientos bancarios
│   │   ├── NewBankAccountForm.tsx   ✅ Modal cuenta
│   │   └── NewTransactionForm.tsx   ✅ Modal ingreso/egreso
│   ├── profit-loss/
│   │   └── ProfitLossExportButton.tsx ✅ Export P&G a .xlsx (client, usa ExportButton)
│   ├── ai-insights/
│   │   ├── GenerateInsightButton.tsx  ✅ Claude API (label y variant configurables)
│   │   ├── InsightCard.tsx            ✅ Card insight en historial lateral
│   │   ├── WeekSelector.tsx           ✅ Selector de semana ISO con datos de snapshot
│   │   └── RequestCorrectionButton.tsx ✅ Modal: solicita regeneración a Pulse
│   ├── settings/
│   │   ├── InviteUserForm.tsx       ✅ Invitar por email
│   │   ├── EditUserRoleForm.tsx     ✅ Rol
│   │   └── ImportSection.tsx        ✅ CSV
│   └── pulse-admin/
│       ├── PulseSidebar.tsx         ✅ Sidebar panel Pulse
│       ├── RecalculateSnapshotsButton.tsx ✅ Recalcular semana actual + histórico completo
│       └── ApproveAndRegenerateButton.tsx ✅ Aprobar solicitud y forzar regeneración insight
├── lib/
│   ├── supabase/
│   │   ├── client.ts                ✅ Cliente browser
│   │   ├── server.ts                ✅ Cliente server (cookies)
│   │   └── database.types.ts        ✅ Tipos generados
│   └── dateUtils.ts                 ✅ getDefaultDateRange() (default = semana actual lun→hoy)
└── middleware.ts                    ✅ Rutas, refresh sesión
```

---

## 3. Rutas y navegación

| Ruta | Estado | Descripción |
|------|--------|-------------|
| `/` | ✅ | Redirige a `/dashboard` |
| `/login` | ✅ | Login, recuperación contraseña |
| `/auth/callback` | ✅ | Callback OAuth / magic link |
| `/dashboard` | ✅ | DateRangePicker, 4 bloques KPIs, gráfica, ventas por canal, CxC |
| `/sales` | ✅ | SalesOverview: KPIs con período anterior, tabla, ExportButton, QuickSaleForm |
| `/ad-campaigns` | ✅ | AdCampaignsOverview: KPIs, tabla campañas, NewCampaignForm |
| `/customers` | ✅ | CustomersOverview: KPIs, tabla, ExportButton, NewCustomerForm |
| `/inventory` | ✅ | InventoryOverview: KPIs, tabla productos, export, formularios |
| `/finance` | ✅ | FinanceOverview: cuentas, TransactionsTable, formularios, filtro tx_date |
| `/profit-loss` | ✅ | P&G: ingresos, gastos, publicidad, neto, filtro from/to, export Excel |
| `/ai-insights` | ✅ | WeekSelector, insight completo (4 módulos + playbook), staleness, RequestCorrectionButton |
| `/settings/users` | ✅ | Usuarios: InviteUserForm, EditUserRoleForm |
| `/settings/import` | ✅ | ImportSection (CSV) |
| `/pulse-admin` | ✅ | North Star, semáforo MVP, solicitudes corrección, RecalculateSnapshotsButton |
| `/pulse-admin/companies` | ✅ | Gestión empresas |

---

## 4. Filtro por rango de fechas (from/to)

Las siguientes páginas usan `searchParams.from` y `searchParams.to` con `getDefaultDateRange()` (por defecto: **lunes de la semana actual → hoy**):

- **Dashboard:** weekly_snapshots, ventas por canal, bank_transactions en rango
- **Ventas, Pautas, Clientes, Finance, P&G:** consultas filtradas por el campo de fecha correspondiente (`sale_date`, `campaign_date`, `registered_since`, `tx_date`, etc.)

Varias páginas calculan además un **período anterior** (misma duración que el rango elegido, o comparación YTD cuando el inicio es 1-ene) para **deltas en KPIs** y cajas de insight (SalesOverview, AdCampaignsOverview, CustomersOverview, InventoryOverview, FinanceOverview).

**Inventario:** la vista lista productos y stock actual; el rango en URL puede usarse en KPIs/resúmenes del overview según implementación, no como "historial de stock por día" global.

**Topbar** con `showPeriodSelector` envuelve `<DateRangePicker />` en `Suspense`.

**IA Insights** usa `searchParams.week` y `searchParams.year` (número de semana ISO) en lugar del rango from/to. El `WeekSelector` se coloca en `rightExtras` de la Topbar.

---

## 5. Componentes reutilizables

| Componente | Props / notas | Uso |
|------------|---------------|-----|
| `KpiCard` | label, value, delta?, compare?, isGold?, prefix?, suffix? | Overviews, dashboard |
| `AiInsightBox` | title, text, variant? | Overviews, dashboard |
| `Topbar` | pageTitle, pageSubtitle?, showPeriodSelector?, showExportButton?, primaryAction?, rightExtras? | Páginas dashboard |
| `DateRangePicker` | Lee `?from=`, `?to=` de la URL | Topbar cuando showPeriodSelector |
| `ExportButton` | data, filename, sheetName?, disabled? | Ventas, Clientes, Inventario, P&G |
| `DashboardShell` | userName?, userRole?, companyName?, isPulseAdmin? | Layout dashboard (client, colapsable) |
| `Sidebar` | userName?, userRole?, companyName?, isPulseAdmin?, onRequestHide? | Dentro de DashboardShell |
| `WeekSelector` | weeks, selectedWeek, selectedYear | `/ai-insights` (rightExtras de Topbar) |
| `RequestCorrectionButton` | companyId, weekNumber, year | `/ai-insights` (cuando existe insight) |
| `GenerateInsightButton` | companyId, weekNumber, year, hasExisting, hasEnoughData, label?, variant? | `/ai-insights` |
| `ProfitLossExportButton` | data, from, to | `/profit-loss` |
| `RecalculateSnapshotsButton` | — (sin props) | `/pulse-admin` |
| `ApproveAndRegenerateButton` | requestId, companyId, weekNumber, year | `/pulse-admin` |
| `SalesOverview` / `SalesHistoryTable` | Ver props en componentes | `/sales` |
| `AdCampaignsOverview` / `CampaignsTable` | — | `/ad-campaigns` |
| `CustomersOverview` / `CustomersTable` | — | `/customers` |
| `InventoryOverview` / `InventoryTable` | — | `/inventory` |
| `FinanceOverview` / `TransactionsTable` | — | `/finance` |
| `QuickSaleForm`, `NewCampaignForm`, … | — | Formularios en cada módulo |
| `RegisterSaleButton` | companyId | Dashboard |
| `InviteUserForm`, `ImportSection` | — | Settings |

---

## 6. Exportación Excel

| Ubicación | Comportamiento |
|-----------|----------------|
| **Ventas, Clientes, Inventario** | `ExportButton` en el bloque Overview: exporta datos visibles. |
| **P&G** | `ProfitLossExportButton` (client component) en la página: export real a `.xlsx`. |
| **Pautas, Finanzas** | `showExportButton` en Topbar muestra un botón **Exportar deshabilitado** (placeholder); pendiente de conectar. |

---

## 7. Dependencias

- **xlsx** (SheetJS): `ExportButton` y `ProfitLossExportButton` → `.xlsx`
- **@anthropic-ai/sdk**: Claude API → `ai_insights`
- **Supabase**: Auth, PostgreSQL, RLS

---

## 8. Base de datos — Tablas principales

| Tabla | Uso actual |
|-------|------------|
| `companies` | Layout, Pulse Admin, tenant |
| `users` | Auth, layout, roles, invitaciones |
| `sales` | Ventas, QuickSaleForm, P&G |
| `ad_campaigns` | Pautas, NewCampaignForm, P&G |
| `weekly_snapshots` | Dashboard KPIs, WeekSelector en IA Insights |
| `ai_insights` | Dashboard, IA Insights (historial, semana seleccionada) |
| `insight_requests` | Solicitudes de corrección de análisis (cliente → Pulse) |
| `ai_insights` (campo `type`) | `'weekly'` (por defecto) o `'initial'` (análisis 360° histórico, solo uno por empresa) |
| `sales_channels` | QuickSaleForm, ventas |
| `customers` | CRM (lifetime_value + last_purchase_at via trigger) |
| `products` | Inventario |
| `inventory_movements` | Inventario |
| `bank_accounts` | Finance |
| `bank_transactions` | Finance, P&G, dashboard |
| `accounts_receivable` | CxC (dashboard) |

### Migraciones SQL aplicadas

| Archivo | Descripción |
|---------|-------------|
| `20260326143000_calculate_weekly_snapshot.sql` | Función SQL `calculate_weekly_snapshot` + endpoint |
| `20260326160000_calculate_weekly_snapshot_postgrest_fix.sql` | Fix PostgREST para la función anterior |
| `20260328120000_trigger_customer_stats.sql` | Trigger `tg_update_customer_stats`: actualiza `lifetime_value` y `last_purchase_at` en `customers` tras cada venta |
| `20260404100000_insight_requests.sql` | Tabla `insight_requests` con RLS: clientes crean solicitudes, Pulse las aprueba/rechaza/marca como done |
| *(pendiente ejecutar)* `ALTER TABLE ai_insights ADD COLUMN type text DEFAULT 'weekly' CHECK (type IN ('initial', 'weekly'))` | Campo `type` para distinguir análisis inicial (360° histórico) de análisis semanales |

---

## 9. Checklist rápido

| Item | Estado |
|------|--------|
| Login / Auth | ✅ |
| Layout dashboard | ✅ |
| Sidebar colapsable con persistencia localStorage | ✅ |
| Dashboard 4 bloques + DateRangePicker | ✅ |
| Deltas KPIs (dashboard y módulos con Overview) | ✅ |
| Ventas (Overview, tabla, export Excel, QuickSale) | ✅ |
| Pautas (Overview, tabla, alta) | ✅ |
| Clientes (Overview, export Excel) | ✅ |
| Inventario (Overview, export Excel) | ✅ |
| Bancos & Finanzas (Overview, transacciones) | ✅ |
| P&G + Export Excel real | ✅ |
| IA Insights (generación, historial, 4 módulos + playbook) | ✅ |
| WeekSelector — navegar entre semanas de análisis | ✅ |
| Detección de insight desactualizado (staleness vs snapshot) | ✅ |
| RequestCorrectionButton — cliente solicita regeneración a Pulse | ✅ |
| Usuarios & Roles | ✅ |
| Importar datos (CSV) | ✅ |
| Pulse Admin — KPIs globales + North Star + semáforo MVP | ✅ |
| Pulse Admin — solicitudes de corrección pendientes | ✅ |
| Pulse Admin — ApproveAndRegenerateButton | ✅ |
| Pulse Admin — RecalculateSnapshotsButton (semana actual + histórico) | ✅ |
| Pulse Admin — GenerateInitialInsightButton por empresa | ✅ |
| Análisis Inicial 360° (historial completo, una sola vez por empresa) | ✅ |
| IA Insights — banner de diagnóstico inicial visible para el cliente | ✅ |
| Selector período (DateRangePicker) | ✅ |
| Export Excel — Ventas, Clientes, Inventario, P&G | ✅ |
| Export Excel — Pautas, Finanzas | ⚠️ Stub deshabilitado en Topbar |
| Trigger customer stats (lifetime_value, last_purchase_at) | ✅ |
| Tabla insight_requests + RLS | ✅ |

---

## 10. Pendiente / mejoras

| Área | Detalle |
|------|---------|
| **Exportación** | Conectar `ExportButton` real en Pautas y Finanzas (reemplazar el stub deshabilitado del Topbar). |
| **weekly_snapshots — cron** | El endpoint `POST /api/snapshots/calculate` con `{ "all": true }` ya existe. El **cron externo** (p. ej. Supabase `pg_cron` o Vercel Cron) debe llamar a ese POST **cada lunes a las 02:00 UTC**. No está programado en el repo. El botón `RecalculateSnapshotsButton` en Pulse Admin permite hacerlo manualmente. |
| **insight_requests — flujo completo** | El flujo cliente→Pulse ya existe (crear solicitud + aprobar/regenerar). Pendiente: marcar la solicitud como `done` tras la regeneración exitosa y notificar al cliente. |
| **PeriodSelector** | Legacy; el flujo actual usa `DateRangePicker` en Topbar. Se puede eliminar. |
| **Consistencia UX** | Decidir si se mantiene el botón deshabilitado en Topbar en páginas que ya exportan desde el Overview (duplicidad visual). |
| **MRR real** | En `/pulse-admin` el MRR está hardcodeado a $0. Pendiente conectar tabla de pagos/suscripciones. |

---

*Documento actualizado según el código en el repositorio (abril 2026).*
