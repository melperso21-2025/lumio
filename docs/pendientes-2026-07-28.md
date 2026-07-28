# Pendientes — Sesión del 28/07/2026

## 🔴 CRÍTICO — Hacer primero

### 1. Activar Upstash en Vercel PRODUCCIÓN
El rate limiting está configurado en **staging** pero NO en producción.
- Ir a Vercel → proyecto lumio → Settings → Environment Variables
- Agregar para el entorno **Production**:
  - `UPSTASH_REDIS_REST_URL` = (mismo valor que staging)
  - `UPSTASH_REDIS_REST_TOKEN` = (mismo valor que staging)
- Redeploy automático al guardar
- Verificar que el rate limiting funcione en prod haciendo múltiples requests a `/api/ai-insights`

---

## 🟡 MEDIANO PLAZO — Mejoras planificadas

### 2. Gráficos interactivos
Ningún módulo tiene visualización temporal real. Prioridad:
- **Ventas:** gráfico de área con tendencia semanal (Recharts recomendado)
- **Finanzas:** línea de evolución de saldo bancario total
- **Pautas:** ROAS semanal con línea de benchmark (ej: ROAS > 3x)
- Implementar primero en Ventas (mayor visibilidad)

### 3. P&G comparativo vs período anterior
- Agregar columna "Período anterior" + delta % en el estado de resultados
- Los datos del período anterior ya se cargan en `getPreviousPeriodRolling`
- Solo falta ejecutar las mismas queries de P&G sobre ese período y mostrar la tercera columna
- Archivo base: `src/app/(dashboard)/profit-loss/page.tsx`

### 4. Paginación server-side en Ventas
- Actualmente: límite de 200 con banner de aviso (no es paginación real)
- Implementar con parámetro URL `?page=N`
- `totalSalesCount` ya se consulta — usar para calcular páginas totales
- Los filtros (semana, canal, estado) deben funcionar combinados con la paginación

### 5. Desglose por plataforma en Pautas
- Agregar sección de tarjetas por plataforma antes de la tabla de campañas
- Los datos de `platform` ya están en `ad_campaigns`
- Mostrar: inversión, ROAS y leads por plataforma (Meta, Google, TikTok, etc.)
- Gráfico de barras horizontales comparando ROAS entre plataformas

### 6. Segmentación RFM básica en Clientes
- Datos disponibles: `last_purchase_at`, `total_orders`, `lifetime_value`
- 4 segmentos: Champion / En riesgo / Dormido (>90 días) / Nuevo
- Mostrar como filtros en el directorio de clientes
- KPIs adicionales en la cabecera del módulo
- El trigger de LTV (ya aplicado hoy) garantiza que los datos estén actualizados

### 7. Historial de precios por producto
- La tabla `product_price_history` existe en el schema pero no tiene UI
- Mostrar en `/inventory/[id]` en una sección "Historial de precios"
- Columnas: fecha, precio de venta anterior, costo anterior, usuario que cambió

---

## 🟣 ESTRATÉGICO — Largo plazo

### 8. Sistema de alertas / notificaciones por email
- Días de caja < 15 → email inmediato al admin
- Stock crítico en X productos → resumen semanal
- CxC con >7 días vencidas → aviso al admin
- ROAS cae >30% semana sobre semana
- Implementar con Cron jobs de Vercel + Resend (o similar)
- Tabla de configuración de alertas por empresa en Settings

### 9. Integración ventas → stock automático
- Al registrar `sale_item`, descontar automáticamente de `inventory_movements`
- El trigger `tg_update_product_stock` ya existe
- Solo falta el trigger en `sale_items` que inserte un movimiento `out`
- ⚠ Requiere pruebas extensas — servicios deben estar excluidos (`product_type = 'service'`)
- Agregar opción por empresa para activar/desactivar durante la transición

### 10. CxP — Cuentas por pagar a proveedores
- Nueva tabla `accounts_payable` (proveedor, monto, vencimiento, estado)
- Vista en Finanzas junto a CxC
- KPI "obligaciones pendientes" en dashboard
- Alertas de vencimiento
- Habilita flujo de caja proyectado: CxC por cobrar - CxP por pagar

### 11. IA inline contextual por módulo
- Botón "¿Qué me dice la IA?" en cada módulo
- Micro-análisis de 3-4 oraciones + 2-3 acciones concretas
- Requiere endpoint liviano + rate limiting por módulo/empresa
- Ejemplo en Ventas: detectar caídas vs semana anterior y recomendar acciones

---

## 📋 BACKLOG — Bajo esfuerzo, bajo impacto

### 12. Estados vacíos accionables
- Mensaje genérico actual: "No hay productos en el catálogo"
- Propuesta: texto + CTA directo. Ej: "Tu catálogo está vacío → [Agregar producto] [Importar Excel]"
- Aplicar en: Ventas, Inventario, Clientes, Proveedores

### 13. Historial de compras por proveedor
- En `/suppliers/[id]`: agregar sección con total comprado, número de entregas, precio promedio
- JOIN: `inventory_movements` (tipo `in`) → `products` → `supplier_id`

### 14. Punto de equilibrio en P&G
- Con gastos fijos (ya disponibles en `bank_transactions.is_fixed`) y margen bruto promedio
- Calcular ventas mínimas necesarias para cubrir costos fijos
- Mostrar como tarjeta en P&G: "PE: $8,500/semana · Esta semana: $11,200 (+31%)"

---

## 🧪 SQL pendientes de ejecutar

> Los siguientes queries están listos como migraciones pero deben ejecutarse en Supabase SQL Editor de ser necesario.

```
-- Verificar que el trigger LTV esté activo (ejecutado hoy):
SELECT tgname, tgenabled FROM pg_trigger WHERE tgrelid = 'sales'::regclass;

-- Debe mostrar: tg_ltv_on_sale_insert, tg_ltv_on_sale_update, tg_ltv_on_sale_delete
```

---

## 📁 Archivos clave de referencia

| Módulo | Archivo principal |
|--------|------------------|
| Dashboard | `src/app/(dashboard)/dashboard/page.tsx` |
| Ventas | `src/app/(dashboard)/sales/page.tsx` |
| Inventario | `src/components/inventory/InventoryTable.tsx` |
| Finanzas | `src/components/finance/ReceivablesTable.tsx` |
| P&G | `src/app/(dashboard)/profit-loss/page.tsx` |
| Clientes | `src/components/customers/CustomersOverview.tsx` |
| Pautas | `src/components/ad-campaigns/AdCampaignsOverview.tsx` |
| IA Insights | `src/app/(dashboard)/ai-insights/page.tsx` |
| Rate limiting | `src/lib/rateLimit.ts` |
| Importación | `src/lib/import/buildContext.ts` |

---

## ✅ Completado en sesiones anteriores (no repetir)

- [x] Rate limiting Upstash (staging)
- [x] Migraciones SQL de seguridad (RLS)
- [x] Caché de test-patch limpiada
- [x] Escalada de roles (update-role)
- [x] Validación de archivos en importación (magic bytes + tamaño)
- [x] Reemplazo xlsx → exceljs + papaparse
- [x] Validación avatar_url (allowlist de dominio)
- [x] Promise.all en todas las páginas del dashboard
- [x] Deduplicación de clientes (migración SQL)
- [x] Botón "Anular venta" en historial
- [x] Exportar dashboard (DashboardExportButton)
- [x] Cliente en historial de ventas
- [x] Marcar CxC como pagadas (ReceivablesTable + API)
- [x] Link visual en nombre de producto (inventario)
- [x] Eliminar AiInsightBox falso en Pautas
- [x] Trigger LTV automático al registrar ventas
