# DATABASE_CONTEXT.md — Lumio / Pulse
> Generado desde Supabase. Usar como referencia en Cursor para evitar duplicar tablas, columnas, funciones o triggers existentes.
> Copia en docs/context/ para archivo histórico. El original activo está en `docs/DATABASE_CONTEXT.md` y `supabase/DATABASE_CONTEXT.md`.

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
| name | text | Nombre comercial |
| plan | text | p. ej. `trial` / `active` / `suspended` |
| status | text | Estado de suscripción |
| tax_id | text | UNIQUE, RUC Ecuador (13 dígitos) / vacío |
| sector | text | — |
| trial_expires_at | date/timestamp | — |
| operational_since | date | — |
| active_modules | text[] | Módulos habilitados en el producto (slugs) |
| branch_count | integer | — |
| pulse_notes | text | Notas internas solo para Pulse |
| max_users | integer | NOT NULL, default `3`, CHECK `max_users >= 0`. `0` = la empresa no puede tener usuarios adicionales. |
| allow_user_invites | boolean | NOT NULL, default `true`. Si `false`, los admins de esa empresa no pueden invitar; Pulse gestiona vía `is_pulse_admin`. |
| tags | ARRAY | — |
| metadata | jsonb | — |
| deleted_at | timestamp | Soft delete |

**Límite de usuarios:** antes de aceptar una invitación, la API valida el conteo de filas en `users` con `company_id` y `deleted_at IS NULL` frente a `max_users` (ver `/api/users/invite`).

**Reglas de invitación (roles):**
- **Usuario Pulse** (`is_pulse_admin = true`): puede crear usuarios con cualquier rol (`admin`, `manager`, `operator`).
- **Admin de empresa** (`role = 'admin'` y no Pulse): solo puede invitar `manager` y `operator`, **no** otro `admin`.
- Límite de asientos: si `count(users) >= max_users`, la invitación se rechaza con 403.
- `allow_user_invites = false`: aplica a invitaciones iniciadas desde la empresa.

---

### `users`
Usuarios del sistema. Pueden ser empleados de una empresa o admins de Pulse.
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| email | text | UNIQUE |
| full_name | text | Nombre completo |
| role | text | Roles válidos: `admin`, `manager`, `operator` |
| is_pulse_admin | boolean | Solo admins de Pulse tienen `true` |
| job_title | text | Cargo del usuario |
| phone | text | Teléfono / celular |
| avatar_url | text | URL pública en Storage bucket `avatars` |
| notify_whatsapp | boolean | Acepta notificaciones por WhatsApp |
| notify_email | boolean | Acepta notificaciones por email |
| last_seen_at | timestamp | Última vez que inició sesión |
| onboarded_at | timestamp | Fecha en que completó el onboarding |
| metadata | jsonb | Datos extra sin esquema fijo |
| session_token | text | Token único de la sesión activa (sesión única por dispositivo) |
| session_token_created_at | timestamptz | Fecha de creación del session_token actual |
| created_at | timestamp | Auto-gestionado por trigger `set_updated_at` |
| updated_at | timestamp | Auto-gestionado por trigger `set_updated_at` |
| deleted_at | timestamp | Soft delete |

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
| full_name | text | — |
| phone | text | — |
| email | text | — |
| tax_id | text | Número de identificación |
| id_type | text | CHECK ('cedula','ruc','pasaporte') |
| address | text | Opcional |
| customer_type | text | UUID ref a customer_types.id |
| label | text | UUID ref a customer_labels.id |
| is_company | boolean | Default false |
| contact_name | text | Persona de contacto si es empresa |
| lifetime_value | numeric | Calculado por trigger |
| last_purchase_at | timestamp | Actualizado por trigger |
| registered_since | date | Fecha de alta |
| tags | ARRAY | — |
| deleted_at | timestamp | Soft delete |

---

### `customer_types`
Tipos de cliente configurables por empresa.
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| name | text | Obligatorio |
| color | text | Hex color, default '#888780' |
| is_active | boolean | Default true |
| deleted_at | timestamp | Soft delete |

---

### `customer_labels`
Etiquetas de cliente configurables por empresa.
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| name | text | Obligatorio |
| color | text | Hex color, default '#888780' |
| is_active | boolean | Default true |
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

### `sale_items`
Líneas de detalle de cada venta.
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| sale_id | uuid | FK → sales |
| product_id | uuid | FK → products |
| quantity | numeric | CHECK > 0 |
| unit_price | numeric | Precio al momento de la venta |
| unit_cost | numeric | Costo al momento de la venta |
| discount_amount | numeric | Descuento aplicado a esta línea |
| subtotal | numeric | GENERATED: (quantity × unit_price) - discount_amount |
| created_at | timestamptz | — |
| deleted_at | timestamptz | Soft delete — activa reverso de inventario |

> **Triggers activos:**
> - `tg_sync_inventory_from_sale_item` — INSERT genera `inventory_movements` (type='out', reason='sale'). Soft delete genera reversión.
> - `tg_recalculate_sale_totals` — recalcula `gross_total`, `discount_amount`, `production_cost`, `lines_per_order` en `sales`.

> **Regla crítica:** Nunca insertar manualmente en `inventory_movements` para ventas — el trigger lo hace automáticamente. Hacerlo manualmente produce duplicados de stock.

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
Catálogo de productos y servicios de cada empresa.
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| supplier_id | uuid | FK → suppliers |
| category_id | uuid | FK → product_categories |
| name | text | — |
| sku | text | UNIQUE por company_id |
| product_type | text | `'product'` (default) \| `'service'` |
| unit_type | text | `'unit'` \| `'weight'` \| `'volume'` \| `'length'` \| `'area'` — NULL para servicios |
| sale_price | numeric | Precio de venta |
| unit_cost | numeric | Costo unitario |
| current_stock | numeric | Soporta decimales. Actualizado por trigger. 0 para servicios |
| min_stock_alert | numeric | Umbral de alerta de stock |
| lead_time_days | integer | Días de reposición |
| is_active | boolean | — |
| tags | ARRAY | — |
| deleted_at | timestamp | Soft delete |

**Semáforo de stock:**
- 🔴 Crítico: `current_stock <= min_stock_alert`
- 🟡 Bajo: `current_stock <= min_stock_alert * 2`
- 🟢 Normal: `current_stock > min_stock_alert * 2`

---

### `product_categories`
Categorías de productos, soporta jerarquía padre/hijo.
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| parent_id | uuid | FK → product_categories (self-referencial) |
| name | text | — |
| slug | text | UNIQUE por company_id. Auto-generado desde el nombre |
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
| type | text | `'in'` \| `'out'` \| `'adjustment'` |
| reason | text | `'purchase'` \| `'sale'` \| `'return'` \| `'adjustment'` \| `'damage'` \| `'initial'` |
| quantity | numeric | Soporta decimales |
| movement_date | date | — |
| notes | text | Obligatorio para `type='adjustment'` |
| created_at | timestamp | — |

---

### `suppliers`
Proveedores de productos.
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| name | text | — |
| is_company | boolean | Default true |
| id_type | text | CHECK ('cedula','ruc','pasaporte') |
| tax_id | text | Número de identificación |
| phone | text | Formato +593XXXXXXXXX |
| email | text | — |
| address | text | — |
| bank_name | text | — |
| bank_account | text | Solo dígitos 4-20 caracteres |
| account_type | text | CHECK ('savings','checking') |
| default_lead_time_days | integer | Días de entrega |
| payment_terms | text | Términos de pago |
| is_active | boolean | Default true |
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
| category | text | ⚠️ `'marketing'` se excluye del P&L |
| concept | text | — |
| tx_date | date | — |
| is_fixed | boolean | Default: false |

> ⚠️ **Regla crítica de P&L:** `ad_campaigns` es la fuente autoritativa de inversión publicitaria. No mezclar con `bank_transactions category='marketing'`.

---

### `bank_transaction_categories`
Catálogo de categorías de transacciones bancarias por empresa.

```sql
bank_transaction_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id),
  name        text NOT NULL,
  type        text NOT NULL DEFAULT 'both'  -- 'income' | 'expense' | 'both'
              CHECK (type IN ('income', 'expense', 'both')),
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,
  UNIQUE (company_id, name)
)
```

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
| roas | numeric | Calculado — ponderado (SUM/SUM) |
| effectiveness_rate | numeric | Calculado — ponderado |
| deleted_at | timestamp | Soft delete |

> ⚠️ **ROAS y effectiveness_rate:** Calcular con promedios ponderados (`SUM/SUM`), nunca `AVG()` simple.

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
> - Regeneración requiere aprobación de Pulse
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
| status | text | pending / approved / rejected / done |

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

> ⚠️ **Bug histórico resuelto:** Error `22P02` por reutilizar variables `numeric` para almacenar valores `date`. Corregido.

---

### `import_logs`
Registro de cada sesión de importación masiva de datos.
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| imported_by | uuid | FK → users |
| entity_type | text | suppliers / products / customers / sales / etc. |
| file_name | text | — |
| total_rows | integer | — |
| success_rows | integer | — |
| error_rows | integer | — |
| status | text | processing / success / partial / failed / rolled_back |
| errors | jsonb | Array de `{row: number, message: string}` |
| imported_ids | jsonb | Array de UUIDs para rollback |
| created_at | timestamp | — |
| completed_at | timestamp | NULL si aún procesando |

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
| `update_bank_balance()` | trigger | Actualiza `current_balance` en `bank_accounts` |
| `update_customer_on_sale()` | trigger | Actualiza métricas del cliente (LTV, etc.) al registrar una venta |
| `update_product_stock()` | trigger | Actualiza `current_stock` en `products` |
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

## Validaciones Ecuador — `src/lib/validations/index.ts`

| Documento | Regla |
|---|---|
| Cédula | 10 dígitos, algoritmo módulo-10 |
| RUC persona natural | 13 dígitos; primeros 10 = cédula válida |
| RUC empresa | 13 dígitos; tercer dígito 6–9 |
| Teléfono celular | `+5939XXXXXXXX` |
| Teléfono fijo | `+593[2-7]XXXXXXX` |
| Pasaporte | 6–20 caracteres alfanuméricos |

---

## Pendientes críticos antes del primer cliente

1. **`production_cost` y `discount_amount`** en `sales` — requeridos para P&L preciso
2. **Verificación de RLS** — confirmar que todas las tablas tienen RLS habilitado en Supabase
3. **Deployment en Vercel** — plataforma actualmente solo corre en local
4. **Continuidad de snapshots** — revisar lógica de rollover semanal
