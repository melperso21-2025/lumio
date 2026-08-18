# Diccionario de Datos — Lumio

> Glosario de términos de negocio, valores de enumeración y reglas de cálculo.
> Para la estructura técnica de tablas, ver [DATABASE.md](./DATABASE.md).

---

## Términos de negocio

| Término | Definición |
|---|---|
| **PyME** | Pequeña y mediana empresa. Segmento objetivo de Lumio en Ecuador y Latinoamérica. |
| **Empresa (company)** | Unidad organizacional principal. Todo dato de negocio pertenece a una empresa vía `company_id`. |
| **Tenant** | Sinónimo de empresa en el contexto multi-tenant de Lumio. |
| **Pulse Admin** | Rol especial del equipo Pulse. Accede a todas las empresas. Único que puede aprobar regeneraciones de insights. |
| **Usuario activado** | Usuario que ha visto su primer insight de IA con sus propios datos (no datos demo). |
| **LTV** | Lifetime Value. Valor total acumulado de compras de un cliente (`customers.total_purchases`). |
| **ROAS** | Return on Ad Spend. `revenue / spend`. Siempre ponderado: `SUM(revenue) / SUM(spend)`. |
| **Efectividad** | Tasa de conversión de campañas: `conversions / leads * 100`. |
| **Semana ISO** | Semana según el estándar ISO 8601 (lunes–domingo). Usada en todos los snapshots y análisis. |
| **Snapshot** | Consolidado semanal de KPIs calculado por `calculate_weekly_snapshot()`. |
| **Insight inicial** | Análisis global histórico generado una única vez por Pulse Admin (`type='initial'`, `week_number=0`). |
| **Soft delete** | Eliminación lógica: `UPDATE deleted_at = NOW()`. Nunca se borra data financiera real. |
| **Balance (CxC)** | `amount - amount_paid`. Columna `GENERATED ALWAYS STORED` en `accounts_receivable`. |
| **Balance (CxP)** | `amount - amount_paid`. Columna `GENERATED ALWAYS STORED` en `accounts_payable`. |
| **Margen bruto** | `(gross_profit / total_revenue) * 100`. |
| **Margen neto** | `(net_profit / total_revenue) * 100`. |
| **Días de inventario** | Estimación de cuántos días dura el inventario actual al ritmo de venta actual. |
| **Inversión publicitaria** | `ad_campaigns.spend` es la única fuente de verdad. Las transacciones bancarias de categoría `marketing` se excluyen del P&L para evitar doble conteo. |

---

## Enumeraciones

### companies.plan
| Valor | Descripción | Límite IA/mes |
|---|---|---|
| `trial` | Prueba gratuita | 0 |
| `basic` | Básico — $29/mes | 5 |
| `standard` | Estándar — $59/mes | 20 |
| `pro` | Pro — $99/mes | ilimitado (999) |

### users.role
| Valor | Permisos |
|---|---|
| `pulse_admin` | Acceso total a todas las empresas. Puede aprobar insight_requests y generar análisis iniciales. |
| `admin` | Admin de su empresa. Puede invitar usuarios, hacer rollback de importaciones, cambiar roles. |
| `manager` | Acceso completo a módulos de negocio. No puede gestionar usuarios. |
| `operator` | Acceso de solo lectura y registro de ventas básico. |

### sales.payment_method / purchases.payment_method
| Valor | Descripción |
|---|---|
| `cash` | Contado / efectivo |
| `credit` | Crédito — genera CxC (ventas) o CxP (compras) automáticamente |
| `transfer` | Transferencia bancaria |
| `card` | Tarjeta de crédito/débito |

### sales.status
> Verificado contra la restricción `CHECK` de la tabla el 18-ago-2026.
> La base **rechaza** `pending` y `completed`.

| Valor | Descripción |
|---|---|
| `closed` | Venta cerrada (valor por defecto en importación) |
| `review` | Venta en revisión |
| `contact` | Pendiente de contacto con el cliente |
| `cancelled` | Venta cancelada — revierte inventario y cancela CxC asociada |

### accounts_receivable.status / accounts_payable.status
| Valor | Descripción |
|---|---|
| `pending` | Sin cobros / pagos registrados |
| `partial` | Con cobros / pagos parciales (`amount_paid > 0 AND amount_paid < amount`) |
| `paid` | Totalmente cobrado / pagado (`amount_paid >= amount`) |
| `overdue` | Vencido (cálculo en aplicación, no trigger) |
| `cancelled` | Cancelado (cuando la venta o compra origen se cancela) |

### inventory_movements.type
| Valor | Descripción | Efecto en stock |
|---|---|---|
| `in` | Entrada de inventario | `current_stock += quantity` |
| `out` | Salida de inventario | `current_stock -= quantity` |
| `adjustment` | Ajuste físico absoluto | `current_stock = quantity` (sobrescribe) |

### inventory_movements.reason
> Verificado contra la restricción `CHECK` el 18-ago-2026.
> La base **rechaza** `sale_reversal`.

| Valor | Origen |
|---|---|
| `sale` | Generado automáticamente por `tg_sync_inventory_from_sale_item` |
| `purchase` | Generado automáticamente por `tg_sync_inventory_from_purchase_item` |
| `return` | Devolución de mercadería |
| `adjustment` | Creado manualmente (conteo físico) |
| `damage` | Merma o producto dañado |
| `transfer` | Traslado entre sucursales |
| `initial` | Stock inicial al crear el producto |

### ai_insights.type
| Valor | Descripción |
|---|---|
| `initial` | Análisis histórico global (`week_number=0`). Generado una sola vez. |
| `weekly` | Análisis de la semana ISO anterior. Uno por semana por empresa. |

### insight_requests.status
| Valor | Descripción |
|---|---|
| `pending` | Enviada, esperando revisión de Pulse Admin |
| `approved` | Aprobada — el cron o Pulse Admin procederá a regenerar |
| `rejected` | Rechazada por Pulse Admin |
| `done` | Regeneración completada |

### playbook_actions.priority
| Valor | Descripción |
|---|---|
| `urgent` | Acción crítica inmediata |
| `soon` | Implementar esta semana / este mes |
| `later` | Mejora a futuro |

### playbook_actions.status
| Valor | Descripción |
|---|---|
| `pending` | No iniciada |
| `in_progress` | En ejecución |
| `done` | Completada |
| `dismissed` | Descartada por el usuario |

### bank_transactions.type
| Valor | Descripción |
|---|---|
| `income` | Ingreso — suma al saldo de la cuenta |
| `expense` | Gasto — resta al saldo de la cuenta |

### customers.id_type / suppliers.id_type
| Valor | Descripción | Validación |
|---|---|---|
| `cedula` | Cédula ecuatoriana | 10 dígitos, algoritmo módulo-10 |
| `ruc` | RUC ecuatoriano | 13 dígitos |
| `passport` | Pasaporte | Alfanumérico |
| `ruc_extranjero` | RUC o tax ID extranjero | Alfanumérico, longitud flexible |

### ad_campaigns.platform
> Verificado contra la restricción `CHECK` el 18-ago-2026.
> La base **rechaza** `otro`: hoy no es posible registrar campañas de una red
> distinta a las tres listadas. Ver PENDING.md.

| Valor | Red publicitaria |
|---|---|
| `meta` | Meta Ads (Facebook / Instagram) |
| `google` | Google Ads |
| `tiktok` | TikTok Ads |

### import_logs.status
| Valor | Descripción |
|---|---|
| `processing` | Importación en curso |
| `success` | Todas las filas importadas exitosamente |
| `partial` | Algunas filas importadas, otras fallaron |
| `failed` | Ninguna fila importada |
| `rolled_back` | Importación revertida vía rollback |

---

## Reglas de cálculo

### ROAS (Return on Ad Spend)
```
ROAS = SUM(ad_campaigns.revenue) / SUM(ad_campaigns.spend)
```
Siempre ponderado. No usar `AVG(roas)` — distorsiona con campañas de tamaños muy distintos.

### Efectividad de campaña
```
efectividad = (conversions / leads) * 100
```
Ponderada a nivel agregado: `SUM(conversions) / SUM(leads) * 100`.

### P&L (Pérdidas y Ganancias)
```
Ingresos       = SUM(sales.net_total) WHERE status = 'completed'
Costo ventas   = SUM(sale_items.quantity * sale_items.unit_cost)
Margen bruto   = Ingresos - Costo ventas
Gastos op.     = SUM(bank_transactions.amount) WHERE type = 'expense' AND category != 'marketing'
Inversión pub. = SUM(ad_campaigns.spend)  ← fuente única, no bank_transactions
Gastos totales = Gastos op. + Inversión pub.
Utilidad neta  = Margen bruto - Gastos totales
```

### CxC balance (columna GENERATED)
```sql
balance = amount - amount_paid
```

### CxP balance (columna GENERATED)
```sql
balance = amount - amount_paid
```

### purchase_items.subtotal (columna GENERATED)
```sql
subtotal = quantity * unit_cost
```

### Días de inventario
```
inventory_days = inventory_value / (cost_of_goods_sold / days_in_period)
```
Calculado en `calculate_weekly_snapshot()`.

### Semana ISO
Siempre usar `isoWeekFromString(date).week` — no calcular manualmente con `Math.ceil`.
Función disponible en `src/lib/dateUtils.ts`.

---

## Variables de entorno

| Variable | Uso | Requerido en |
|---|---|---|
| `SUPABASE_URL` | Conexión Supabase | dev, prod |
| `SUPABASE_ANON_KEY` | Cliente público (RLS activo) | dev, prod |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client (RLS bypass) — solo para operaciones internas | dev, prod |
| `ANTHROPIC_API_KEY` | Claude API para AI Insights | dev, prod |
| `RESEND_API_KEY` | Envío de emails (invitaciones, recuperación) | dev, prod |
| `NEXT_PUBLIC_APP_URL` | URL base para redirects de auth | dev, prod |
| `CRON_SECRET` | Bearer token para crons de Vercel | prod |
| `INTERNAL_API_SECRET` | Header `x-internal-secret` para `/api/auth/verify-session` | dev, prod |
| `UPSTASH_REDIS_REST_URL` | Rate limiting con Upstash | dev, prod |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting con Upstash | dev, prod |

---

## Validaciones de documentos — Ecuador

Implementadas en `src/lib/validations/index.ts`:

| Documento | Regla |
|---|---|
| Cédula | 10 dígitos exactos, algoritmo módulo-10 (dígito verificador en posición 10) |
| RUC persona natural | 13 dígitos. Los primeros 10 pasan validación de cédula |
| RUC empresa | 13 dígitos. Tercer dígito entre 6–9 |
| Teléfono celular | Formato `+5939XXXXXXXX` (12 dígitos total, empieza con 0 tras +593) |
| Teléfono fijo | Formato `+593[2-7]XXXXXXX` (11 dígitos total) |
