# Pendientes — Lumio

> Archivo vivo. Actualizar cuando se resuelva un ítem o aparezca uno nuevo.
> Formato: `- [ ]` pendiente · `- [x]` resuelto (mover a sección Resueltos al cerrar sprint)

---

## Entorno / Infraestructura

- [ ] **Vercel producción**: agregar variable `INTERNAL_API_SECRET`
  - Protege el endpoint `/api/auth/verify-session` de llamadas externas
  - Mismo valor que se use en `.env.local`
  - Sin esta variable el endpoint acepta cualquier request en producción

- [ ] **Vercel producción**: agregar variables de Upstash Redis
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
  - Sin estas variables el rate limiting de IA falla abierto (permite todo) en producción
  - Ya están configuradas en staging/dev

---

## Seguridad — deuda técnica

- [ ] **S5 (trigger CxC)**: `tg_create_ar_from_sale` solo se dispara en `AFTER UPDATE`, no en `AFTER INSERT`
  - Una venta nueva a crédito puede no generar su CxC si el insert no tiene el trigger
  - Fix: `DROP TRIGGER ... CREATE TRIGGER ... AFTER INSERT OR UPDATE`
  - Archivo: migración nueva en `supabase/migrations/`

- [ ] **S6 (condición de carrera en stock)**: `api/sales/[id]/route.ts` valida stock y luego descuenta en dos queries separadas
  - Con concurrencia alta dos ventas simultáneas pueden aprobar el mismo stock
  - Fix: envolver en RPC de Postgres con `SELECT FOR UPDATE` o transacción
  - Impacto: bajo por volumen actual de PyMEs, pero escala mal

---

## Calidad — deuda técnica

- [ ] **M8**: Colores hex hardcodeados (`#F97316`, `#EF4444`, `#DC2626`) mezclados con CSS vars
  - Afecta: varios componentes de tabla y KPIs
  - Fix: mover a variables CSS en el tema global

- [ ] **M9**: Doble cast `as unknown as Parameters<...>` en receivables y payables pages
  - Señal de que los tipos de Supabase y los tipos de los componentes están desalineados
  - Fix: generar tipos correctos o alinear las interfaces

- [ ] **B1 parcial**: `update-role` sincroniza `user_company_memberships` solo para la empresa activa del target
  - Si el usuario tiene membresías en múltiples empresas, las otras no se actualizan
  - Fix: actualizar todas las filas de `user_company_memberships` donde `user_id = userId`

---

## Resueltos (auditoría 2026-08-10)

- [x] S1 — `supabaseAdmin` en server components (receivables, payables, purchases)
- [x] S2 — `verify-session` sin protección de secreto
- [x] S3 — `listUsers(perPage:1000)` para buscar por email
- [x] S4 — `totalCobrado` sumaba `amount` en vez de `amount_paid`
- [x] S5 — Rate limiting faltante en endpoints de IA
- [x] M1 — Fechas `from`/`to` sin validar formato
- [x] M2 — `companyId` en body sin verificar empresa activa
- [x] M3 — `console.log` en producción (ya estaba resuelto)
- [x] M4 — `today` congelado a nivel de módulo en CxC y CxP
- [x] M5 — Queries sin `.limit()` en receivables y payables
- [x] M6 — Rollback de productos ponía `current_stock = 0`
- [x] M7 — Semana ISO calculada con fórmula incorrecta en dashboard
- [x] B1 — `update-role` no sincronizaba `user_company_memberships`
- [x] B2 — Modelo Claude hardcodeado en 3 routes
- [x] B3 — Errores PostgreSQL expuestos al cliente en recalculate-stats
- [x] B4 — N/A (companies no tiene columna status, deleted_at ya filtra)
- [x] B5 — `cron/stock-alert` procesaba empresas secuencialmente
- [x] B6 — `scope="col"` faltante en 14 tablas, `aria-pressed` en filtros
