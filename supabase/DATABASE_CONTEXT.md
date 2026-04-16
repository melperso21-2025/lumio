# DATABASE_CONTEXT.md — Lumio / Pulse
> Generado desde Supabase. Usar como referencia en Cursor para evitar duplicar tablas, columnas, funciones o triggers existentes.

---

## Stack
- **Base de datos:** PostgreSQL vía Supabase
- **Schema principal:** `public`
- **Multi-tenant:** Todas las tablas usan `company_id` (uuid) como llave de aislamiento
- **Soft deletes:** La mayoría de tablas usan `deleted_at` (timestamp) en lugar de borrado físico
- **Timestamps automáticos:** `created_at` y `updated_at` manejados por el trigger `set_updated_at`
- **Seguridad:** RLS (Row Level Security) activo en todas las tablas

---

## Tablas

### `companies`
Entidad raíz del sistema. Cada cliente de Pulse es una empresa.
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| company_id | - | No aplica — esta ES la entidad raíz |
| legal_rep_user_id | uuid | FK → users |
| country_id | uuid | FK → countries |
| city_id | uuid | FK → cities |
| tax_id | text | UNIQUE |
| status | text | — |
| tags | ARRAY | — |
| metadata | jsonb | — |
| deleted_at | timestamp | Soft delete |

---

### `users`
Usuarios del sistema. Pueden ser empleados de una empresa o admins de Pulse.
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| email | text | UNIQUE |
| role | text | Roles: `admin`, `manager`, `seller`, etc. |
| is_pulse_admin | boolean | Solo admins de Pulse tienen `true` |

---

### `branches`
Sucursales físicas o digitales de una empresa.
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| manager_user_id | uuid | FK → users |
| city_id | uuid | FK → cities |
| name | text | — |
| type | text | Default: `'physical'` |
| is_active | boolean | — |
| deleted_at | timestamp | Soft delete |

---

### `customers`
Clientes de cada empresa.
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| origin_channel_id | uuid | FK → sales_channels |
| customer_type | text | — |
| label | text | — |
| tags | ARRAY | — |
| deleted_at | timestamp | Soft delete |

---

### `sales`
Registro de ventas. Fuente principal de ingresos.
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| customer_id | uuid | FK → customers |
| seller_id | uuid | FK → users |
| channel_id | uuid | FK → sales_channels |
| branch_id | uuid | FK → branches |
| sale_date | date | — |
| week_number | integer | Semana ISO |
| year | integer | — |
| status | text | — |
| tags | ARRAY | — |
| deleted_at | timestamp | Soft delete |

> ⚠️ **Pendiente:** Agregar columnas `production_cost` y `discount_amount` para precisión del P&L.

---

### `sales_channels`
Canales de venta (WhatsApp, web, tienda física, etc.).
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| deleted_at | timestamp | Soft delete |

---

### `products`
Catálogo de productos de cada empresa.
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| supplier_id | uuid | FK → suppliers |
| category_id | uuid | FK → product_categories |
| sku | text | UNIQUE por company_id |
| current_stock | numeric | Actualizado por trigger |
| is_active | boolean | — |
| tags | ARRAY | — |
| deleted_at | timestamp | Soft delete |

---

### `product_categories`
Categorías de productos, soporta jerarquía padre/hijo.
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| parent_id | uuid | FK → product_categories (self-referencial) |
| slug | text | UNIQUE por company_id |
| deleted_at | timestamp | Soft delete |

---

### `product_price_history`
Historial de cambios de precio por producto.
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| product_id | uuid | FK → products |
| company_id | uuid | FK → companies |
| changed_by_user_id | uuid | FK → users |
| effective_to | timestamp | NULL = precio activo actual |

---

### `inventory_movements`
Movimientos de inventario (entradas, salidas, ajustes).
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| product_id | uuid | FK → products |
| movement_date | date | — |

---

### `suppliers`
Proveedores de productos.
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| country_id | uuid | FK → countries |
| deleted_at | timestamp | Soft delete |

---

### `bank_accounts`
Cuentas bancarias de cada empresa.
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| bank_name | text | — |
| account_type | text | — |
| initial_balance | numeric | Default: 0 |
| current_balance | numeric | Actualizado por trigger |
| is_active | boolean | — |
| metadata | jsonb | — |
| deleted_at | timestamp | Soft delete |

---

### `bank_transactions`
Transacciones bancarias (ingresos y egresos).
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| account_id | uuid | FK → bank_accounts |
| type | text | — |
| amount | numeric | — |
| category | text | ⚠️ `'marketing'` se excluye del P&L (usar `ad_campaigns` como fuente) |
| concept | text | — |
| tx_date | date | — |
| is_fixed | boolean | Default: false |

> ⚠️ **Regla crítica de P&L:** Nunca mezclar `bank_transactions` con `category='marketing'` y `ad_campaigns` para gastos de publicidad — produce doble conteo. `ad_campaigns` es la fuente autoritativa de inversión publicitaria.

---

### `ad_campaigns`
Campañas publicitarias por plataforma (Meta, Google, etc.).
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| campaign_date | date | — |
| week_number | integer | — |
| year | integer | — |
| platform | text | — |
| spend | numeric | Default: 0 |
| clicks | integer | — |
| reach | integer | — |
| impressions | integer | — |
| leads_count | integer | — |
| quality_leads | integer | — |
| transactions | integer | — |
| attributed_revenue | numeric | — |
| roas | numeric | Calculado |
| ctr | numeric | Calculado |
| cpm | numeric | Calculado |
| effectiveness_rate | numeric | Calculado |
| conversion_rate | numeric | Calculado |
| metadata | jsonb | — |
| tags | ARRAY | — |
| deleted_at | timestamp | Soft delete |

> ⚠️ **ROAS y effectiveness_rate:** Calcular con promedios ponderados (`SUM/SUM`), no `AVG()` simple.

---

### `accounts_receivable`
Cuentas por cobrar / facturas emitidas.
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| customer_id | uuid | FK → customers |
| amount | numeric | — |
| issue_date | date | Default: `CURRENT_DATE` |
| due_date | date | — |
| status | text | Default: `'pending'` |
| invoice_ref | text | — |
| deleted_at | timestamp | Soft delete |

---

### `ai_insights`
Análisis de IA generados por Pulse para cada empresa.
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| week_number | integer | `0` = análisis inicial global |
| year | integer | — |
| type | text | `'initial'` o `'weekly'` |
| insight_sales | text | — |
| insight_campaigns | text | — |
| insight_inventory | text | — |
| insight_finance | text | — |
| playbook | jsonb | — |
| executive_summary | text | — |
| viewed_at | timestamp | — |

> **Reglas de negocio:**
> - `week_number=0` + `type='initial'` = análisis inicial único, generado por Pulse Admin
> - Clientes generan 1 análisis por semana (semana ISO completa, lun–dom)
> - Regeneración requiere aprobación de Pulse (`is_pulse_admin = true` + `forcedByPulse: true`)
> - UNIQUE constraint en `(company_id, week_number, year)`

---

### `insight_requests`
Solicitudes de regeneración de insights.
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| requested_by | uuid | FK → users |
| reviewed_by | uuid | FK → users |
| week_number | integer | — |
| year | integer | — |
| status | text | — |

---

### `weekly_snapshots`
Snapshots semanales calculados de métricas financieras y operativas.
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| week_number | integer | — |
| year | integer | — |
| UNIQUE constraint | — | `(company_id, week_number, year)` |

> ⚠️ **Bug histórico resuelto:** La función `calculate_weekly_snapshot` tenía un error de tipo `22P02` por reutilizar variables `numeric` para almacenar valores `date`. Está corregido.

---

### `pulse_metrics`
Métricas internas de Pulse (solo accesibles por Pulse Admin).
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| week_number | integer | — |
| year | integer | — |
| UNIQUE constraint | — | `(company_id, week_number, year)` |

---

### `audit_log`
Log de auditoría de todas las operaciones sensibles.
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| user_id | uuid | FK → users |
| action | text | — |
| table_name | text | — |
| record_id | uuid | — |
| old_values | jsonb | — |
| new_values | jsonb | — |
| ip_address | inet | — |

---

### `cities` / `countries`
Tablas de referencia geográfica. Lectura pública para todos los usuarios.

---

## Funciones PostgreSQL

| Función | Tipo de retorno | Descripción |
|---|---|---|
| `calculate_weekly_snapshot()` | void | Calcula y persiste el snapshot semanal de métricas |
| `get_user_company_id()` | uuid | Retorna el `company_id` del usuario autenticado actual |
| `get_user_role()` | text | Retorna el rol del usuario autenticado actual |
| `is_pulse_admin()` | boolean | Verifica si el usuario es admin de Pulse |
| `insert_initial_price()` | trigger | Registra el precio inicial al crear un producto |
| `set_updated_at()` | trigger | Actualiza automáticamente `updated_at` en cualquier tabla |
| `track_price_change()` | trigger | Registra cambios de precio en `product_price_history` |
| `update_bank_balance()` | trigger | Actualiza `current_balance` en `bank_accounts` al insertar transacciones |
| `update_customer_on_sale()` | trigger | Actualiza métricas del cliente (LTV, etc.) al registrar una venta |
| `update_product_stock()` | trigger | Actualiza `current_stock` en `products` al insertar movimientos de inventario |
| `write_audit_log()` | trigger | Escribe en `audit_log` para operaciones auditadas |

---

## Triggers activos

| Trigger | Tabla | Evento | Momento | Función que llama |
|---|---|---|---|---|
| `tg_receivables_updated_at` | accounts_receivable | UPDATE | BEFORE | set_updated_at |
| `tg_campaigns_updated_at` | ad_campaigns | UPDATE | BEFORE | set_updated_at |
| `tg_audit_campaigns` | ad_campaigns | INSERT/UPDATE | AFTER | write_audit_log |
| `tg_insights_updated_at` | ai_insights | UPDATE | BEFORE | set_updated_at |
| `tg_bank_accounts_updated_at` | bank_accounts | UPDATE | BEFORE | set_updated_at |
| `tg_update_bank_balance` | bank_transactions | INSERT | AFTER | update_bank_balance |
| `tg_audit_bank_tx` | bank_transactions | INSERT | AFTER | write_audit_log |
| `tg_branches_updated_at` | branches | UPDATE | BEFORE | set_updated_at |
| `tg_companies_updated_at` | companies | UPDATE | BEFORE | set_updated_at |
| `tg_customers_updated_at` | customers | UPDATE | BEFORE | set_updated_at |
| `tg_update_product_stock` | inventory_movements | INSERT | AFTER | update_product_stock |
| `tg_categories_updated_at` | product_categories | UPDATE | BEFORE | set_updated_at |
| `tg_track_price_change` | products | UPDATE | AFTER | track_price_change |
| `tg_insert_initial_price` | products | INSERT | AFTER | insert_initial_price |
| `tg_products_updated_at` | products | UPDATE | BEFORE | set_updated_at |
| `tg_pulse_metrics_updated_at` | pulse_metrics | UPDATE | BEFORE | set_updated_at |
| `tg_sales_updated_at` | sales | UPDATE | BEFORE | set_updated_at |
| `tg_audit_sales` | sales | INSERT/UPDATE | AFTER | write_audit_log |
| `tg_update_customer_on_sale` | sales | INSERT | AFTER | update_customer_on_sale |
| `tg_channels_updated_at` | sales_channels | UPDATE | BEFORE | set_updated_at |
| `tg_suppliers_updated_at` | suppliers | UPDATE | BEFORE | set_updated_at |
| `tg_users_updated_at` | users | UPDATE | BEFORE | set_updated_at |
| `tg_snapshots_updated_at` | weekly_snapshots | UPDATE | BEFORE | set_updated_at |

---

## Políticas RLS (Row Level Security)

### Patrón general
- `get_user_company_id()` aísla datos por empresa
- `get_user_role()` controla acceso por rol (`admin`, `manager`, `seller`)
- `is_pulse_admin()` da acceso cross-company a Pulse

### Resumen por tabla

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| companies | mismo company o pulse_admin | solo pulse_admin | admin de empresa o pulse_admin | — |
| users | mismo company o pulse_admin | mismo company o pulse_admin | propio user, admin de empresa, o pulse_admin | — |
| sales | mismo company o pulse_admin | mismo company | admin o manager de empresa | — |
| products | mismo company o pulse_admin | mismo company | admin o manager | — |
| ad_campaigns | mismo company o pulse_admin | mismo company | mismo company | — |
| ai_insights | mismo company o pulse_admin | solo pulse_admin | mismo company o pulse_admin | — |
| bank_accounts | admin/manager o pulse_admin | admin de empresa | admin de empresa | — |
| bank_transactions | admin/manager o pulse_admin | admin o manager | — | — |
| weekly_snapshots | mismo company o pulse_admin | solo pulse_admin | solo pulse_admin | — |
| pulse_metrics | solo pulse_admin | solo pulse_admin | solo pulse_admin | — |
| insight_requests | mismo company o pulse_admin | mismo company | solo pulse_admin | — |
| cities / countries | público (true) | — | — | — |

> ⚠️ **Crítico antes del primer cliente real:** Verificar que RLS esté habilitado (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) en **todas** las tablas — especialmente `weekly_snapshots` y `pulse_metrics`.

---

## Relaciones clave (Foreign Keys)

```
companies
├── users (company_id)
├── branches (company_id)
│   └── cities → countries
├── customers (company_id)
│   └── sales_channels (origin_channel_id)
├── sales (company_id)
│   ├── users (seller_id)
│   ├── sales_channels (channel_id)
│   ├── branches (branch_id)
│   └── customers (customer_id)
├── products (company_id)
│   ├── suppliers (supplier_id)
│   ├── product_categories (category_id, self-ref parent_id)
│   ├── product_price_history (product_id)
│   └── inventory_movements (product_id)
├── bank_accounts (company_id)
│   └── bank_transactions (account_id)
├── ad_campaigns (company_id)
├── ai_insights (company_id)
├── insight_requests (company_id)
├── weekly_snapshots (company_id)
├── pulse_metrics (company_id)
├── accounts_receivable (company_id)
└── audit_log (company_id)
```

---

## Datos de demo / desarrollo

- **company_id demo:** `4dd15f94-a915-4555-8f54-58951a7d1335`
- Usar este ID en queries de prueba locales

---

## Pendientes críticos antes del primer cliente

1. **`production_cost` y `discount_amount`** en `sales` — requeridos para P&L preciso
2. **Verificación de RLS** — confirmar que todas las tablas tienen RLS habilitado en Supabase
3. **Deployment en Vercel** — plataforma actualmente solo corre en local
4. **Continuidad de snapshots** — revisar lógica de rollover semanal
