# Timeline de Lumio — Historia del Desarrollo
> Reconstruido a partir del historial de Git (~200 commits), las migraciones SQL
> (fechadas en su nombre) y los documentos de estado del proyecto.
> Rango de desarrollo activo documentado: **26-mar-2026 → 10-ago-2026** (~4,5 meses).
---
## 0. Qué es Lumio (contexto)
**Lumio** es una plataforma SaaS de inteligencia de negocio para PyMEs (Ecuador y
Latinoamérica), producto de la consultora **Pulse**. Conecta **ventas, pautas
publicitarias y finanzas** en un solo lugar, con un motor de **IA (Claude API)**
para insights semanales.
- **Stack:** Next.js 16 · Tailwind v4 · Supabase (PostgreSQL + Auth + RLS) · TypeScript
- **Multi-tenant:** aislamiento por `company_id`, soft deletes (`deleted_at`), RLS en todas las tablas
- **Motor BI central:** tabla `weekly_snapshots` + función `calculate_weekly_snapshot`
- **Roles:** operator · manager · admin · pulse_admin
---
## 1. Fundación — Motor BI y CRM (mar 2026)
| Fecha | Hito | Tipo |
|-------|------|------|
| 2026-03-26 | Función SQL `calculate_weekly_snapshot` + endpoint (motor de BI) | 🧱 Arquitectura |
| 2026-03-26 | Fix PostgREST de la función de snapshots | 🐞 Fix |
| 2026-03-28 | Trigger `tg_update_customer_stats`: calcula `lifetime_value` y `last_purchase_at` en clientes tras cada venta | ⚙️ Lógica |
**Cambio de lógica clave:** desde el inicio se decide que el dashboard NO calcula en
vivo sino que lee **snapshots semanales precalculados** — esto define toda la
arquitectura de rendimiento posterior.
---
## 2. IA Insights y modelo multi-empresa inicial (abr 2026)
| Fecha | Hito | Tipo |
|-------|------|------|
| 2026-04-04 | Tabla `insight_requests` con RLS (cliente pide corrección → Pulse aprueba/regenera) | ✨ Feature |
| 2026-04-11 | **Estado documentado** en `PROJECT_STATUS.md`: app completa con Dashboard, Ventas, Pautas, Clientes, Inventario, Finanzas, P&G, IA Insights y Pulse Admin | 📄 Doc |
| 2026-04-18 | Categorías de transacciones bancarias | ✨ Feature |
| 2026-04-18 | Campos extendidos de proveedores | ✨ Feature |
| 2026-04-21 | Límites de usuarios por empresa (`max_users`, `allow_user_invites`) | ⚙️ Lógica |
En este punto ya existían: campo `type` en `ai_insights` (`initial` 360° vs `weekly`),
export a Excel (SheetJS), y P&G con anti-doble-conteo.
---
## 3. Roles, perfil, seguridad de sesión y onboarding (16–22 abr 2026)
| Fecha | Hito | Tipo |
|-------|------|------|
| 2026-04-16 | Mejoras de navegación, roles y seguridad; página de perfil | ✨ Feature |
| 2026-04-16 | **Renombrar rol `seller` → `operator`** y corregir permisos del sidebar | ⚙️ Lógica |
| 2026-04-16 | `PhoneInput` con formato Ecuador; alias en perfil | ✨ Feature |
| 2026-04-16 | **Sesión única por usuario** vía `session_token` | 🔒 Seguridad |
| 2026-04-18 | Inventario mejorado, clientes completos, perfil de usuario | ✨ Feature |
| 2026-04-18 | Módulo de **Proveedores** + validaciones centralizadas | ✨ Feature |
| 2026-04-18 | Corrección masiva de TypeScript para build en Vercel | 🐞 Fix |
| 2026-04-18 | Flujo de **onboarding post-invitación** (`setup-account`) | ✨ Feature |
| 2026-04-21 | Panel **Pulse Admin** de empresas, sidebar colapsable, flujo de invitación | ✨ Feature |
| 2026-04-22 | Validaciones para importación masiva de clientes / suppliers | ✨ Feature |
---
## 4. Importación robusta y recálculos (jun – 5 jul 2026)
| Fecha | Hito | Tipo |
|-------|------|------|
| 2026-05-16 | Rediseño look & feel de Inventario | 🎨 UI |
| 2026-06-29 | `external_ref` en ventas (referencia externa para importación) | ⚙️ Lógica |
| 2026-07-04 | Función `recalculate_sales_totals` (v1 y v2) | ⚙️ Lógica |
| 2026-07-04 | Columna `total_orders` en clientes + RPC mejorada | ⚙️ Lógica |
| 2026-07-04 | Import: `external_ref` en sales, lookup por ref en `sale_items`, fix fechas CSV | 🐞 Fix |
| 2026-07-05 | `recalculate_all_snapshots` (recálculo histórico completo) | ⚙️ Lógica |
| 2026-07-05 | **Índices de rendimiento** para queries frecuentes del dashboard | ⚡ Perf |
| 2026-07-05 | `security definer` con `search_path` seguro | 🔒 Seguridad |
| 2026-07-05 | Modo oscuro con toggle en perfil | ✨ Feature |
| 2026-07-05 | Botón **Recalcular estadísticas** post-importación; recálculo de snapshots tras importar | ✨ Feature |
| 2026-07-05 | Rate limiting, security headers, `SECURITY DEFINER` seguro | 🔒 Seguridad |
| 2026-07-05 | Eliminada página `/test-patch` expuesta en producción | 🔒 Seguridad |
| 2026-07-05 | Rango de fechas global persistido entre módulos | ⚙️ Lógica |
| 2026-07-05 | **Diferenciar margen neto bancario vs contable** entre módulos | ⚙️ Lógica |
| 2026-07-05 | Modelo de IA actualizado a `claude-sonnet-4-7` | ✨ Feature |
| 2026-07-05 | Sección de **Cuentas por Cobrar (CxC)** en Finanzas | ✨ Feature |
| 2026-07-05 | Gestión de canales de venta en Settings | ✨ Feature |
**Problema recurrente de la etapa:** la paginación contra el límite `max_rows` de
Supabase (múltiples fixes para cargar >1000 filas de clientes/ventas/productos).
---
## 5. Gran refactor de UX y lógica de negocio (27–28 jul 2026)
Sesión documentada en `sesion-2026-07-27-resumen.md`. Es el punto de inflexión
más grande del proyecto.
### Correcciones estructurales
| Hito | Tipo |
|------|------|
| **Deduplicación de clientes** (migración SQL consolidó 7.282 clientes activos) | ⚙️ Lógica |
| Combobox de cliente con búsqueda server-side bajo demanda | ✨ Feature |
| **Anulación de ventas con reversión automática de inventario** | ⚙️ Lógica |
| `Promise.all` en todas las páginas (mejora de 40–70% en tiempos de carga) | ⚡ Perf |
### Auditoría de seguridad (todos los hallazgos resueltos)
| Hito | Tipo |
|------|------|
| Rate limiting con Upstash Redis (patrón fail-open) | 🔒 Seguridad |
| Cierre de **escalada de privilegios** en `update-role` (mapa `ASSIGNABLE_BY`) | 🔒 Seguridad |
| Validación de tamaño/tipo de archivo (magic bytes) en importación | 🔒 Seguridad |
| **Reemplazo de `xlsx` por `exceljs` + `papaparse`** (CVEs críticos) | 🔒 Seguridad |
| Validación de dominio de `avatar_url` contra bucket de Supabase | 🔒 Seguridad |
### 6 Quick Wins + nuevos motores de datos
| Fecha | Hito | Tipo |
|-------|------|------|
| 2026-07-27 | **Triggers de inventario** (`inventory_triggers`) | ⚙️ Lógica |
| 2026-07-27 | **Trigger LTV automático** en INSERT/UPDATE/DELETE de ventas (`lifetime_value`, `last_purchase_at`, `total_orders`) | ⚙️ Lógica |
| 2026-07-28 | Historial de precios por producto (`product_price_history`) | ✨ Feature |
| 2026-07-28 | Contexto de IA por empresa (`company_ai_context`) | ✨ Feature |
| 2026-07-28 | Insights de IA por módulo (`ai_module_insights`) | ✨ Feature |
| 2026-07-28 | **Membresías usuario–empresa** (`user_company_memberships`): un usuario en varias cuentas | 🧱 Arquitectura |
| 2026-07-28 | Módulo integral **CxC, CxP y Compras** (`cxc_cxp_compras`) | 🧱 Arquitectura |
---
## 6. Analítica avanzada e IA contextual (28–29 jul 2026)
| Fecha | Hito | Tipo |
|-------|------|------|
| 2026-07-28 | **Gráficos interactivos** (Recharts) en Ventas, Finanzas y Pautas | ✨ Feature |
| 2026-07-28 | P&G comparativo vs período anterior | ✨ Feature |
| 2026-07-28 | Paginación server-side con filtros en URL (Ventas) | ⚡ Perf |
| 2026-07-28 | Desglose por plataforma en Pautas (ROAS, inversión, leads) | ✨ Feature |
| 2026-07-28 | **Segmentación RFM** de clientes (Campeones, Leales, En riesgo, Nuevos, Perdidos) | ✨ Feature |
| 2026-07-28 | Sistema de **alertas por email** (Resend) — stock bajo | ✨ Feature |
| 2026-07-28 | **Feature #11 — IA inline contextual por módulo** ("¿Qué me dice la IA?") | ✨ Feature |
| 2026-07-28 | Perfil del negocio para contexto de IA | ✨ Feature |
| 2026-07-28 | Feature #12 — estados vacíos accionables | ✨ Feature |
| 2026-07-28 | F13/F14 — historial de compras por proveedor y punto de equilibrio | ✨ Feature |
| 2026-07-28 | **F15 — Rediseño completo del P&G** para emprendedores sin base contable | 🎨 UI + Lógica |
| 2026-07-29 | Patrón de scroll estandarizado en todos los módulos | 🎨 UI |
| 2026-07-29 | **Sucursales + estados de venta configurables** (`branches_and_sale_statuses`) | 🧱 Arquitectura |
| 2026-07-29 | Pulse Admin: métricas reales, suspender empresa/usuario, MVP | ✨ Feature |
| 2026-07-29 | Migración de emails a **Resend** (invitaciones y recuperación de contraseña) | ✨ Feature |
| 2026-07-29 | Fix trigger de saldo bancario; recálculo de LTV al importar ventas | 🐞 Fix |
---
## 7. Consolidación de Bancos y Compras (1–5 ago 2026)
| Fecha | Hito | Tipo |
|-------|------|------|
| 2026-08-01 | Edición y eliminación de cuentas bancarias | ✨ Feature |
| 2026-08-01 | CRUD completo en Compras (botones pill) | ✨ Feature |
| 2026-08-05 | Persistencia correcta al editar/eliminar movimientos bancarios | 🐞 Fix |
| 2026-08-05 | Saldo de cuentas en tiempo real al editar/eliminar movimientos | ⚙️ Lógica |
| 2026-08-05 | Estandarización de decimales en todos los KPIs | 🎨 UI |
| 2026-08-05 | Fix de datos inconsistentes entre KPIs, tabla y CxP en Compras | 🐞 Fix |
---
## 8. Robustez de importación y estandarización de schema (8–9 ago 2026)
| Fecha | Hito | Tipo |
|-------|------|------|
| 2026-08-08 | Parser de fechas y selección de hoja Excel más robustos | 🐞 Fix |
| 2026-08-08 | **Fix detección XLSX vs CSV** (magic byte causaba falso positivo) | 🐞 Fix |
| 2026-08-08 | `WorkbookReader` streaming para evitar bug de comentarios de ExcelJS | 🐞 Fix |
| 2026-08-08 | Tipo de documento **`ruc_extranjero`** para clientes y proveedores | ⚙️ Lógica |
| 2026-08-08 | Proveedores: separar teléfono en celular (req.) + convencional (opc.) | ⚙️ Lógica |
| 2026-08-09 | Clientes: separar `phone` en `mobile` + `phone` (estándar inglés) | ⚙️ Lógica |
| 2026-08-09 | Soft delete + unique en catálogos de cliente | ⚙️ Lógica |
| 2026-08-09 | Fix `recalculate_sales_totals` y protección de `gross_total` histórico | 🐞 Fix |
| 2026-08-09 | Clientes ordenados por LTV descendente (sort server-side) | ✨ Feature |
| 2026-08-09 | Checklist de estado de datos en importación | ✨ Feature |
| 2026-08-09 | **Estandarización de schema (v1 y v2)** + documento de referencia | 🧱 Arquitectura |
---
## 9. Refactor por "flujos", auditoría final y calidad (9–10 ago 2026)
Revisión sistemática end-to-end de los cinco flujos de negocio principales.
| Fecha | Hito | Tipo |
|-------|------|------|
| 2026-08-09 | **Flujo Ventas:** trigger de recálculo automático, anular en detalle, estados dinámicos | ⚙️ Lógica |
| 2026-08-09 | **Flujo 2 (Compras):** bugs críticos en compras, inventario, CxP + pago desde UI | 🐞 Fix |