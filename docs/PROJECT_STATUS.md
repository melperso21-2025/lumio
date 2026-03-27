# Lumio — Estado del Proyecto

**Última actualización:** 26 de marzo de 2026

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
│   ├── page.tsx                    ✅ Redirige a /dashboard
│   ├── globals.css                 ✅ Variables CSS, reset
│   ├── login/page.tsx              ✅ Login (email/password, recuperación)
│   ├── auth/callback/route.ts      ✅ Callback Supabase Auth
│   ├── (dashboard)/
│   │   ├── layout.tsx              ✅ Layout con Sidebar + datos usuario
│   │   ├── dashboard/page.tsx      ✅ KPIs, gráficas, DateRangePicker, weekly_snapshots
│   │   ├── sales/page.tsx          ✅ Server: datos + Topbar; SalesOverview (KPIs, tabla, export)
│   │   ├── ad-campaigns/page.tsx   ✅ AdCampaignsOverview (KPIs, CampaignsTable)
│   │   ├── customers/page.tsx      ✅ CustomersOverview (KPIs, CustomersTable, export)
│   │   ├── inventory/page.tsx      ✅ InventoryOverview (KPIs, InventoryTable, export)
│   │   ├── finance/page.tsx        ✅ FinanceOverview (KPIs, TransactionsTable, cuentas)
│   │   ├── profit-loss/page.tsx    ✅ P&G (ingresos, gastos, publicidad, from/to)
│   │   ├── ai-insights/page.tsx    ✅ GenerateInsightButton, InsightCard, KPIs
│   │   └── settings/
│   │       ├── users/page.tsx      ✅ InviteUserForm, EditUserRoleForm
│   │       └── import/page.tsx     ✅ ImportSection (CSV)
│   └── pulse-admin/
│       ├── layout.tsx              ✅ Solo is_pulse_admin
│       ├── page.tsx                ✅ Empresas, KPIs globales
│       └── companies/page.tsx      ✅ Gestión empresas
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx             ✅ Navegación, user chip, Pulse Admin
│   │   └── Topbar.tsx              ✅ Título, DateRangePicker, Exportar (stub), primaryAction
│   ├── ui/
│   │   ├── KpiCard.tsx             ✅ Delta, compare, prefix, suffix
│   │   ├── AiInsightBox.tsx        ✅ Variantes gold/red/green/blue
│   │   ├── DateRangePicker.tsx     ✅ ?from=&to= (presets + custom)
│   │   └── ExportButton.tsx        ✅ Exportar a .xlsx (SheetJS)
│   ├── dashboard/
│   │   ├── RegisterSaleButton.tsx  ✅ Modal registrar venta
│   │   └── PeriodSelector.tsx      ⚠️ Legacy (Topbar usa DateRangePicker)
│   ├── sales/
│   │   ├── SalesOverview.tsx       ✅ KPIs, AiInsightBox, SalesHistoryTable, ExportButton
│   │   ├── SalesHistoryTable.tsx   ✅ Tabla historial de ventas
│   │   └── QuickSaleForm.tsx       ✅ Modal registrar venta
│   ├── ad-campaigns/
│   │   ├── AdCampaignsOverview.tsx ✅ KPIs, CampaignsTable
│   │   ├── CampaignsTable.tsx      ✅ Tabla campañas
│   │   └── NewCampaignForm.tsx     ✅ Alta pauta
│   ├── customers/
│   │   ├── CustomersOverview.tsx   ✅ KPIs, CustomersTable, ExportButton
│   │   ├── CustomersTable.tsx      ✅ Tabla clientes
│   │   └── NewCustomerForm.tsx     ✅ Modal nuevo cliente
│   ├── inventory/
│   │   ├── InventoryOverview.tsx ✅ KPIs, InventoryTable, ExportButton
│   │   ├── InventoryTable.tsx      ✅ Productos y stock
│   │   ├── NewProductForm.tsx      ✅ Modal nuevo producto
│   │   └── AddMovementForm.tsx     ✅ Modal movimiento inventario
│   ├── finance/
│   │   ├── FinanceOverview.tsx     ✅ KPIs, cuentas, TransactionsTable
│   │   ├── TransactionsTable.tsx   ✅ Movimientos bancarios
│   │   ├── NewBankAccountForm.tsx  ✅ Modal cuenta
│   │   └── NewTransactionForm.tsx  ✅ Modal ingreso/egreso
│   ├── ai-insights/
│   │   ├── GenerateInsightButton.tsx ✅ Claude API
│   │   └── InsightCard.tsx         ✅ Card insight
│   ├── settings/
│   │   ├── InviteUserForm.tsx      ✅ Invitar por email
│   │   ├── EditUserRoleForm.tsx    ✅ Rol
│   │   └── ImportSection.tsx       ✅ CSV
│   └── pulse-admin/
│       └── PulseSidebar.tsx        ✅ Sidebar panel Pulse
├── lib/
│   ├── supabase/
│   │   ├── client.ts               ✅ Cliente browser
│   │   ├── server.ts               ✅ Cliente server (cookies)
│   │   └── database.types.ts       ✅ Tipos generados
│   └── dateUtils.ts                ✅ getDefaultDateRange() (default = semana actual lun→hoy)
└── middleware.ts                   ✅ Rutas, refresh sesión
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
| `/profit-loss` | ✅ | P&G: ingresos, gastos, publicidad, neto, filtro from/to |
| `/ai-insights` | ✅ | IA: insights, GenerateInsightButton, tarjetas y KPIs |
| `/settings/users` | ✅ | Usuarios: InviteUserForm, EditUserRoleForm |
| `/settings/import` | ✅ | ImportSection (CSV) |
| `/pulse-admin` | ✅ | Panel Pulse (solo is_pulse_admin) |
| `/pulse-admin/companies` | ✅ | Gestión empresas |

---

## 4. Filtro por rango de fechas (from/to)

Las siguientes páginas usan `searchParams.from` y `searchParams.to` con `getDefaultDateRange()` (por defecto: **lunes de la semana actual → hoy**):

- **Dashboard:** weekly_snapshots, ventas por canal, bank_transactions en rango
- **Ventas, Pautas, Clientes, Finance, P&G:** consultas filtradas por el campo de fecha correspondiente (`sale_date`, `campaign_date`, `registered_since`, `tx_date`, etc.)

Varias páginas calculan además un **período anterior** (misma duración que el rango elegido, o comparación YTD cuando el inicio es 1-ene) para **deltas en KPIs** y cajas de insight (SalesOverview, AdCampaignsOverview, CustomersOverview, InventoryOverview, FinanceOverview).

**Inventario:** la vista lista productos y stock actual; el rango en URL puede usarse en KPIs/resúmenes del overview según implementación, no como “historial de stock por día” global.

**Topbar** con `showPeriodSelector` envuelve `<DateRangePicker />` en `Suspense`.

---

## 5. Componentes reutilizables

| Componente | Props / notas | Uso |
|------------|---------------|-----|
| `KpiCard` | label, value, delta?, compare?, isGold?, prefix?, suffix? | Overviews, dashboard |
| `AiInsightBox` | title, text, variant? | Overviews, dashboard |
| `Topbar` | pageTitle, pageSubtitle?, showPeriodSelector?, showExportButton?, primaryAction? | Páginas dashboard |
| `DateRangePicker` | Lee `?from=`, `?to=` de la URL | Topbar cuando showPeriodSelector |
| `ExportButton` | data, filename, sheetName?, disabled? | **Ventas, Clientes, Inventario** (export real Excel) |
| `Sidebar` | userName?, userRole?, companyName?, isPulseAdmin? | Layout dashboard |
| `SalesOverview` / `SalesHistoryTable` | Ver props en componentes | `/sales` |
| `AdCampaignsOverview` / `CampaignsTable` | — | `/ad-campaigns` |
| `CustomersOverview` / `CustomersTable` | — | `/customers` |
| `InventoryOverview` / `InventoryTable` | — | `/inventory` |
| `FinanceOverview` / `TransactionsTable` | — | `/finance` |
| `QuickSaleForm`, `NewCampaignForm`, … | — | Formularios en cada módulo |
| `RegisterSaleButton` | companyId | Dashboard |
| `GenerateInsightButton` | — | AI Insights |
| `InviteUserForm`, `ImportSection` | — | Settings |

---

## 6. Exportación Excel

| Ubicación | Comportamiento |
|-----------|----------------|
| **Ventas, Clientes, Inventario** | `ExportButton` en el bloque Overview: exporta datos visibles/tabular según implementación. |
| **Pautas, Finanzas, P&G** | `showExportButton` en Topbar muestra un botón **Exportar deshabilitado** (placeholder); aún no enlazado a `ExportButton`. |

---

## 7. Dependencias

- **xlsx** (SheetJS): `ExportButton` → `.xlsx`
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
| `weekly_snapshots` | Dashboard KPIs |
| `ai_insights` | Dashboard, IA |
| `sales_channels` | QuickSaleForm, ventas |
| `customers` | CRM |
| `products` | Inventario |
| `inventory_movements` | Inventario |
| `bank_accounts` | Finance |
| `bank_transactions` | Finance, P&G, dashboard |
| `accounts_receivable` | CxC (dashboard) |

---

## 9. Checklist rápido

| Item | Estado |
|------|--------|
| Login / Auth | ✅ |
| Layout dashboard | ✅ |
| Dashboard 4 bloques + DateRangePicker | ✅ |
| Deltas KPIs (dashboard y módulos con Overview) | ✅ |
| Ventas (Overview, tabla, export Excel, QuickSale) | ✅ |
| Pautas (Overview, tabla, alta) | ✅ |
| Clientes (Overview, export Excel) | ✅ |
| Inventario (Overview, export Excel) | ✅ |
| Bancos & Finanzas (Overview, transacciones) | ✅ |
| P&G | ✅ |
| IA Insights | ✅ |
| Usuarios & Roles | ✅ |
| Importar datos | ✅ |
| Pulse Admin | ✅ |
| Selector período (DateRangePicker) | ✅ |
| Export Excel funcional | ✅ Ventas, Clientes, Inventario |
| Topbar “Exportar” global | ⚠️ Stub deshabilitado donde se muestra |

---

## 10. Pendiente / mejoras

| Área | Detalle |
|------|---------|
| **Exportación** | Conectar `ExportButton` en Pautas, Finanzas y/o P&G, o sustituir el stub del Topbar por acción real cuando aplique. |
| **weekly_snapshots** | Depende de job/cron que ejecute `calculate_weekly_snapshot`. |
| **PeriodSelector** | Legacy; el flujo actual usa `DateRangePicker` en Topbar. |
| **Consistencia UX** | Decidir si se mantiene el botón deshabilitado en Topbar en páginas que ya exportan desde el Overview (duplicidad visual). |

---

*Documento actualizado según el código en el repositorio (marzo 2026).*
