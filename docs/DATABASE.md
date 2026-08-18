# Base de datos — Lumio

> Referencia completa de tablas, triggers, funciones y relaciones del schema `public` de Supabase.
> Última actualización: 2026-08-10 (post-auditoría de seguridad + estandarización de schema).

---

## Convenciones globales

| Convención | Detalle |
|---|---|
| `id` | `UUID DEFAULT gen_random_uuid()` en toda tabla principal |
| `company_id` | Presente en **todas** las tablas de negocio — clave de aislamiento multi-tenant |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` — actualizado por trigger `tg_set_updated_at` |
| `deleted_at` | `TIMESTAMPTZ NULL` — soft-delete; `NULL` = activo |
| RLS | Habilitado en todas las tablas de negocio; helper `get_user_company_id()` |
| Soft-delete | Nunca se hace `DELETE` físico en datos de negocio; se usa `UPDATE deleted_at = NOW()` |

---

## Tablas

### 1. companies
Empresas cliente registradas en la plataforma. Raíz de toda la jerarquía multi-tenant.

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| name | TEXT | NO | — | Nombre legal |
| ruc | TEXT | SÍ | — | RUC o NIT del negocio |
| industry | TEXT | SÍ | — | Sector / giro de negocio |
| logo_url | TEXT | SÍ | — | URL en Supabase Storage |
| plan | TEXT | NO | 'trial' | trial / basic / standard / pro |
| max_users | INT | NO | 3 | Límite de usuarios por empresa |
| max_ai_insights | INT | NO | 0 | Cuota mensual de insights IA |
| ai_monthly_used | INT | NO | 0 | Consumo de IA en el mes actual |
| ai_monthly_reset | DATE | NO | CURRENT_DATE | Fecha del último reset de cuota |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |
| deleted_at | TIMESTAMPTZ | SÍ | NULL | Soft-delete |

**Índices:** `idx_companies_ruc`

---

### 2. users
Usuarios del sistema. Extiende `auth.users` de Supabase con datos de perfil y rol.

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | — | PK, FK → auth.users(id) |
| email | TEXT | NO | — | Email único |
| full_name | TEXT | SÍ | — | Nombre completo |
| company_id | UUID | SÍ | — | FK → companies(id) |
| role | TEXT | NO | 'operator' | admin / manager / operator / pulse_admin |
| session_token | TEXT | SÍ | — | Token de sesión única activa |
| avatar_url | TEXT | SÍ | — | URL de avatar |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |
| deleted_at | TIMESTAMPTZ | SÍ | NULL | |

**Notas:** `role = 'pulse_admin'` tiene acceso a todas las empresas. Un usuario puede tener `company_id = NULL` si pertenece a múltiples empresas (ver `user_company_memberships`).

---

### 3. user_company_memberships
Membresías de usuarios en múltiples empresas. Permite a Pulse Admin y futuros usuarios multi-empresa.

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| user_id | UUID | NO | — | FK → users(id) |
| company_id | UUID | NO | — | FK → companies(id) |
| role | TEXT | NO | 'operator' | Rol en esa empresa específica |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |
| deleted_at | TIMESTAMPTZ | SÍ | NULL | |

**Índices:** `idx_user_company_memberships_company`

---

### 4. customers
Clientes del negocio. Incluye validaciones de documentos de identidad de Ecuador.

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| company_id | UUID | NO | — | FK → companies(id) |
| full_name | TEXT | NO | — | |
| email | TEXT | SÍ | — | |
| phone | TEXT | SÍ | — | Celular `+5939XXXXXXXX` |
| phone_landline | TEXT | SÍ | — | Teléfono fijo |
| id_type | TEXT | SÍ | — | cedula / ruc / passport / ruc_extranjero |
| id_number | TEXT | SÍ | — | Número de documento |
| type_id | UUID | SÍ | — | FK → customer_types(id) |
| label_id | UUID | SÍ | — | FK → customer_labels(id) |
| address | TEXT | SÍ | — | |
| notes | TEXT | SÍ | — | |
| total_purchases | NUMERIC(12,4) | NO | 0 | LTV acumulado (calculado por trigger) |
| total_orders | INT | NO | 0 | Número de ventas (calculado por trigger) |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |
| deleted_at | TIMESTAMPTZ | SÍ | NULL | |

**Índices:** `idx_customers_company`, `idx_customers_company_name`

---

### 5. customer_types
Tipos de cliente configurables por empresa (ej: Mayorista, Minorista, VIP).

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| company_id | UUID | NO | — | FK → companies(id) |
| name | TEXT | NO | — | |
| color | TEXT | NO | '#6B7280' | Color hex para la UI |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |
| deleted_at | TIMESTAMPTZ | SÍ | NULL | |

---

### 6. customer_labels
Etiquetas de cliente configurables por empresa (ej: Frecuente, Nuevo, En riesgo).

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| company_id | UUID | NO | — | FK → companies(id) |
| name | TEXT | NO | — | |
| color | TEXT | NO | '#6B7280' | Color hex para la UI |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |
| deleted_at | TIMESTAMPTZ | SÍ | NULL | |

**Constraint:** `UNIQUE (company_id, name)` WHERE `deleted_at IS NULL`

---

### 7. products
Catálogo de productos con control de inventario.

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| company_id | UUID | NO | — | FK → companies(id) |
| name | TEXT | NO | — | |
| description | TEXT | SÍ | — | |
| sku | TEXT | SÍ | — | Código de producto |
| category | TEXT | SÍ | — | |
| price | NUMERIC(12,4) | NO | 0 | Precio de venta |
| cost | NUMERIC(12,4) | NO | 0 | Costo de adquisición |
| current_stock | NUMERIC(12,4) | NO | 0 | Actualizado por triggers de inventario |
| min_stock | NUMERIC(12,4) | NO | 0 | Umbral de alerta de stock bajo |
| is_active | BOOLEAN | NO | true | |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |
| deleted_at | TIMESTAMPTZ | SÍ | NULL | |

**Índices:** `idx_products_company`, `idx_products_company_active`

---

### 8. product_price_history
Historial de cambios de precio de productos.

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| company_id | UUID | NO | — | FK → companies(id) |
| product_id | UUID | NO | — | FK → products(id) ON DELETE CASCADE |
| old_price | NUMERIC(12,4) | SÍ | — | Precio anterior |
| new_price | NUMERIC(12,4) | NO | — | Precio nuevo |
| old_cost | NUMERIC(12,4) | SÍ | — | Costo anterior |
| new_cost | NUMERIC(12,4) | SÍ | — | Costo nuevo |
| changed_by | UUID | SÍ | — | FK → users(id) |
| changed_at | TIMESTAMPTZ | NO | now() | |
| notes | TEXT | SÍ | — | |

---

### 9. suppliers
Proveedores del negocio con datos fiscales.

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| company_id | UUID | NO | — | FK → companies(id) |
| name | TEXT | NO | — | |
| ruc | TEXT | SÍ | — | RUC / NIT del proveedor |
| id_type | TEXT | SÍ | — | cedula / ruc / passport / ruc_extranjero |
| id_number | TEXT | SÍ | — | |
| email | TEXT | SÍ | — | |
| phone | TEXT | SÍ | — | Celular |
| phone_landline | TEXT | SÍ | — | Teléfono fijo |
| address | TEXT | SÍ | — | |
| contact_name | TEXT | SÍ | — | Persona de contacto |
| payment_terms | INT | NO | 30 | Días de crédito habituales |
| notes | TEXT | SÍ | — | |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |
| deleted_at | TIMESTAMPTZ | SÍ | NULL | |

---

### 10. sales
Registro de ventas. Cabecera de cada transacción de venta.

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| company_id | UUID | NO | — | FK → companies(id) |
| customer_id | UUID | SÍ | — | FK → customers(id) ON DELETE SET NULL |
| sale_date | DATE | NO | CURRENT_DATE | |
| payment_method | TEXT | NO | 'cash' | cash / credit / transfer / card |
| credit_days | INT | NO | 30 | Días de plazo (solo si payment_method='credit') |
| gross_total | NUMERIC(12,4) | NO | 0 | Total bruto antes de descuento (calculado por trigger) |
| discount_amount | NUMERIC(12,4) | NO | 0 | Descuento total |
| net_total | NUMERIC(12,4) | NO | 0 | Total neto (calculado por trigger) |
| status | TEXT | NO | 'completed' | pending / completed / cancelled |
| notes | TEXT | SÍ | — | |
| external_ref | TEXT | SÍ | — | Referencia externa (factura, orden) |
| branch_id | UUID | SÍ | — | FK → branches(id) |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |
| deleted_at | TIMESTAMPTZ | SÍ | NULL | |

**Índices:** `idx_sales_company_date`, `idx_sales_company_customer`, `idx_sales_company_status`

---

### 11. sale_items
Líneas de producto dentro de cada venta.

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| company_id | UUID | NO | — | FK → companies(id) |
| sale_id | UUID | NO | — | FK → sales(id) ON DELETE CASCADE |
| product_id | UUID | NO | — | FK → products(id) |
| quantity | NUMERIC(12,4) | NO | — | |
| unit_price | NUMERIC(12,4) | NO | — | Precio al momento de la venta |
| unit_cost | NUMERIC(12,4) | NO | 0 | Costo al momento de la venta |
| discount_pct | NUMERIC(5,2) | NO | 0 | % de descuento en esta línea |
| subtotal | NUMERIC(12,4) | NO | — | `quantity * unit_price * (1 - discount_pct/100)` |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |
| deleted_at | TIMESTAMPTZ | SÍ | NULL | |

**Nota:** INSERT/UPDATE/DELETE en sale_items dispara `tg_sync_inventory_from_sale_item` y `tg_recalculate_sale_from_items`.

---

### 12. inventory_movements
Todos los movimientos de inventario (entradas, salidas, ajustes).

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| company_id | UUID | NO | — | FK → companies(id) |
| product_id | UUID | NO | — | FK → products(id) |
| type | TEXT | NO | — | in / out / adjustment |
| quantity | NUMERIC(12,4) | NO | — | |
| reason | TEXT | SÍ | — | sale / purchase / adjustment / initial / sale_reversal |
| movement_date | TIMESTAMPTZ | NO | now() | |
| notes | TEXT | SÍ | — | |
| sale_item_id | UUID | SÍ | — | FK → sale_items(id) ON DELETE SET NULL |
| purchase_item_id | UUID | SÍ | — | FK → purchase_items(id) ON DELETE SET NULL |
| created_at | TIMESTAMPTZ | NO | now() | |

**Índices:** `idx_inventory_movements_product`, `idx_inventory_movements_sale_item_id`, `idx_inv_mov_purchase_item`

---

### 13. purchases
Compras a proveedores (cabecera).

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| company_id | UUID | NO | — | FK → companies(id) |
| supplier_id | UUID | SÍ | — | FK → suppliers(id) ON DELETE SET NULL |
| purchase_date | DATE | NO | CURRENT_DATE | |
| invoice_ref | TEXT | SÍ | — | Número de factura del proveedor |
| subtotal | NUMERIC(12,4) | NO | 0 | Calculado por trigger desde purchase_items |
| tax_amount | NUMERIC(12,4) | NO | 0 | IVA u otro impuesto |
| total | NUMERIC(12,4) | NO | 0 | subtotal + tax_amount |
| payment_method | TEXT | NO | 'cash' | cash / credit / transfer / card |
| credit_days | INT | NO | 30 | Días de plazo (solo si payment_method='credit') |
| status | TEXT | NO | 'received' | received / cancelled |
| notes | TEXT | SÍ | — | |
| created_by | UUID | SÍ | — | FK → users(id) |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |
| deleted_at | TIMESTAMPTZ | SÍ | NULL | |

---

### 14. purchase_items
Líneas de producto dentro de cada compra.

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| company_id | UUID | NO | — | FK → companies(id) |
| purchase_id | UUID | NO | — | FK → purchases(id) ON DELETE CASCADE |
| product_id | UUID | SÍ | — | FK → products(id) ON DELETE SET NULL |
| description | TEXT | SÍ | — | Para ítems sin producto en catálogo |
| quantity | NUMERIC(12,4) | NO | 1 | CHECK (quantity > 0) |
| unit_cost | NUMERIC(12,4) | NO | 0 | |
| subtotal | NUMERIC(12,4) | GENERADA | — | `quantity * unit_cost` (GENERATED ALWAYS STORED) |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |
| deleted_at | TIMESTAMPTZ | SÍ | NULL | |

---

### 15. accounts_receivable
Cuentas por cobrar generadas automáticamente desde ventas a crédito.

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| company_id | UUID | NO | — | FK → companies(id) |
| sale_id | UUID | SÍ | — | FK → sales(id) ON DELETE SET NULL; UNIQUE |
| customer_id | UUID | SÍ | — | FK → customers(id) |
| amount | NUMERIC(12,4) | NO | — | Monto total a cobrar |
| amount_paid | NUMERIC(12,4) | NO | 0 | Suma de ar_payments |
| balance | NUMERIC(12,4) | GENERADA | — | `amount - amount_paid` (GENERATED ALWAYS STORED) |
| issue_date | DATE | NO | — | Fecha de emisión |
| due_date | DATE | NO | — | Fecha de vencimiento |
| paid_at | DATE | SÍ | — | Fecha de pago total |
| status | TEXT | NO | 'pending' | pending / partial / paid / overdue / cancelled |
| notes | TEXT | SÍ | — | |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |
| deleted_at | TIMESTAMPTZ | SÍ | NULL | |

**Índices:** `idx_ar_sale_id` (UNIQUE), `idx_ar_company_status`, `idx_ar_due_date`

---

### 16. ar_payments
Cobros parciales o totales sobre una CxC.

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| company_id | UUID | NO | — | FK → companies(id) |
| ar_id | UUID | NO | — | FK → accounts_receivable(id) ON DELETE CASCADE |
| payment_date | DATE | NO | CURRENT_DATE | |
| amount | NUMERIC(12,4) | NO | — | CHECK (amount > 0) |
| payment_method | TEXT | NO | 'transfer' | cash / transfer / card / check |
| notes | TEXT | SÍ | — | |
| created_by | UUID | SÍ | — | FK → users(id) |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |
| deleted_at | TIMESTAMPTZ | SÍ | NULL | |

---

### 17. accounts_payable
Cuentas por pagar generadas automáticamente desde compras a crédito.

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| company_id | UUID | NO | — | FK → companies(id) |
| supplier_id | UUID | SÍ | — | FK → suppliers(id) ON DELETE SET NULL |
| purchase_id | UUID | SÍ | — | FK → purchases(id) ON DELETE SET NULL; UNIQUE |
| amount | NUMERIC(12,4) | NO | — | |
| amount_paid | NUMERIC(12,4) | NO | 0 | |
| balance | NUMERIC(12,4) | GENERADA | — | `amount - amount_paid` (GENERATED ALWAYS STORED) |
| issue_date | DATE | NO | CURRENT_DATE | |
| due_date | DATE | NO | — | |
| status | TEXT | NO | 'pending' | pending / partial / paid / overdue |
| notes | TEXT | SÍ | — | |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |
| deleted_at | TIMESTAMPTZ | SÍ | NULL | |

---

### 18. ap_payments
Pagos parciales o totales sobre una CxP.

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| company_id | UUID | NO | — | FK → companies(id) |
| ap_id | UUID | NO | — | FK → accounts_payable(id) ON DELETE CASCADE |
| payment_date | DATE | NO | CURRENT_DATE | |
| amount | NUMERIC(12,4) | NO | — | CHECK (amount > 0) |
| payment_method | TEXT | NO | 'transfer' | cash / transfer / card / check |
| notes | TEXT | SÍ | — | |
| created_by | UUID | SÍ | — | FK → users(id) |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |
| deleted_at | TIMESTAMPTZ | SÍ | NULL | |

---

### 19. bank_accounts
Cuentas bancarias del negocio.

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| company_id | UUID | NO | — | FK → companies(id) |
| bank_name | TEXT | NO | — | |
| account_number | TEXT | SÍ | — | Últimos 4 dígitos u ofuscado |
| account_type | TEXT | SÍ | — | CHECK: `checking` \| `savings` \| `cash` \| `other` (verificado 18-ago-2026) |
| currency | TEXT | NO | 'USD' | |
| balance | NUMERIC(12,4) | NO | 0 | Actualizado por trigger desde bank_transactions |
| is_active | BOOLEAN | NO | true | |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |
| deleted_at | TIMESTAMPTZ | SÍ | NULL | |

---

### 20. bank_transactions
Movimientos de cuentas bancarias.

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| company_id | UUID | NO | — | FK → companies(id) |
| account_id | UUID | NO | — | FK → bank_accounts(id) |
| tx_date | DATE | NO | — | |
| description | TEXT | NO | — | |
| amount | NUMERIC(12,4) | NO | — | Positivo = ingreso, negativo = egreso |
| type | TEXT | NO | — | income / expense |
| category_id | UUID | SÍ | — | FK → bank_transaction_categories(id) |
| reference | TEXT | SÍ | — | Número de cheque, transferencia, etc. |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |
| deleted_at | TIMESTAMPTZ | SÍ | NULL | |

**Índices:** `idx_bank_transactions_company_active`

---

### 21. bank_transaction_categories
Categorías de movimientos bancarios configurables por empresa.

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| company_id | UUID | NO | — | FK → companies(id) |
| name | TEXT | NO | — | |
| type | TEXT | NO | — | income / expense |
| color | TEXT | SÍ | — | Color hex |
| is_default | BOOLEAN | NO | false | Categoría predeterminada del sistema |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |
| deleted_at | TIMESTAMPTZ | SÍ | NULL | |

**Regla de negocio:** categoría `marketing` se excluye de gastos operativos en el P&L (evita doble conteo con `ad_campaigns.spend`).

---

### 22. ad_campaigns
Campañas publicitarias. Módulo diferenciador clave de Lumio.

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| company_id | UUID | NO | — | FK → companies(id) |
| name | TEXT | NO | — | |
| platform | TEXT | SÍ | — | Meta / Google / TikTok / otro |
| start_date | DATE | SÍ | — | |
| end_date | DATE | SÍ | — | |
| spend | NUMERIC(12,4) | NO | 0 | **Única fuente de verdad de inversión publicitaria** |
| revenue | NUMERIC(12,4) | NO | 0 | Ingresos atribuidos a la campaña |
| leads | INT | NO | 0 | Cantidad de leads generados |
| conversions | INT | NO | 0 | Conversiones obtenidas |
| clicks | INT | NO | 0 | |
| impressions | INT | NO | 0 | |
| roas | NUMERIC(8,4) | SÍ | — | `revenue / spend` (calculado en app, no trigger) |
| effectiveness | NUMERIC(8,4) | SÍ | — | `conversions / leads * 100` |
| status | TEXT | NO | 'active' | active / paused / completed |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |
| deleted_at | TIMESTAMPTZ | SÍ | NULL | |

---

### 23. weekly_snapshots
Snapshots semanales de KPIs consolidados. Alimentan el Dashboard y los AI Insights.

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| company_id | UUID | NO | — | FK → companies(id) |
| week_number | INT | NO | — | Semana ISO (1–53) |
| year | INT | NO | — | Año ISO |
| total_revenue | NUMERIC(12,4) | NO | 0 | |
| total_cost | NUMERIC(12,4) | NO | 0 | |
| gross_profit | NUMERIC(12,4) | NO | 0 | |
| gross_margin | NUMERIC(8,4) | NO | 0 | % margen bruto |
| total_expenses | NUMERIC(12,4) | NO | 0 | Gastos operativos (excluye marketing) |
| net_profit | NUMERIC(12,4) | NO | 0 | |
| net_margin | NUMERIC(8,4) | NO | 0 | |
| total_ad_spend | NUMERIC(12,4) | NO | 0 | |
| total_ad_revenue | NUMERIC(12,4) | NO | 0 | |
| avg_roas | NUMERIC(8,4) | NO | 0 | ROAS ponderado (SUM revenue / SUM spend) |
| avg_effectiveness | NUMERIC(8,4) | NO | 0 | Efectividad ponderada de campañas |
| total_sales_count | INT | NO | 0 | Número de ventas |
| new_customers | INT | NO | 0 | Clientes nuevos en la semana |
| inventory_value | NUMERIC(12,4) | NO | 0 | Valor total del inventario |
| inventory_days | NUMERIC(8,2) | NO | 0 | Días de inventario estimados |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |

**Constraint:** `UNIQUE (company_id, week_number, year)`

---

### 24. ai_insights
Análisis semanales generados por Claude. Un insight por empresa por semana ISO.

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| company_id | UUID | NO | — | FK → companies(id) |
| week_number | INT | NO | — | 0 = análisis inicial histórico |
| year | INT | NO | — | |
| type | TEXT | NO | 'weekly' | weekly / initial |
| content | TEXT | NO | — | Texto completo del análisis (Markdown) |
| summary | TEXT | SÍ | — | Resumen ejecutivo |
| tokens_used | INT | SÍ | — | Tokens consumidos en la generación |
| model_used | TEXT | SÍ | — | Versión del modelo Claude |
| created_by | UUID | SÍ | — | FK → users(id) (Pulse Admin) |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |
| deleted_at | TIMESTAMPTZ | SÍ | NULL | |

---

### 25. insight_requests
Solicitudes de regeneración de insights. Flujo de aprobación controlado por Pulse Admin.

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| company_id | UUID | NO | — | FK → companies(id) |
| requested_by | UUID | SÍ | — | FK → users(id) |
| week_number | INT | NO | — | |
| year | INT | NO | — | |
| reason | TEXT | SÍ | — | Justificación de la solicitud |
| status | TEXT | NO | 'pending' | pending / approved / rejected / done |
| reviewed_by | UUID | SÍ | — | FK → users(id) (Pulse Admin) |
| reviewed_at | TIMESTAMPTZ | SÍ | — | |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |
| deleted_at | TIMESTAMPTZ | SÍ | NULL | |

---

### 26. ai_module_insights
Análisis inline por módulo (Ventas, Compras, CxC, CxP, Inventario).

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| company_id | UUID | NO | — | FK → companies(id) ON DELETE CASCADE |
| module | TEXT | NO | — | sales / purchases / receivables / payables / inventory |
| summary | TEXT | NO | — | |
| details | TEXT | NO | — | |
| playbook | JSONB | NO | '[]' | Array de acciones recomendadas |
| tokens_used | INT | SÍ | — | |
| created_by | UUID | SÍ | — | FK → auth.users(id) |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |
| deleted_at | TIMESTAMPTZ | SÍ | NULL | |

---

### 27. playbook_actions
Acciones del playbook derivadas de análisis IA. Permite seguimiento de implementación.

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| company_id | UUID | NO | — | FK → companies(id) ON DELETE CASCADE |
| source_id | UUID | SÍ | — | ID del insight que la originó |
| source_type | TEXT | NO | 'module' | module / weekly / initial |
| action | TEXT | NO | — | Descripción de la acción |
| reason | TEXT | NO | — | Justificación |
| priority | TEXT | NO | 'soon' | urgent / soon / later |
| timeframe | TEXT | NO | 'este mes' | |
| status | TEXT | NO | 'pending' | pending / in_progress / done / dismissed |
| module | TEXT | SÍ | — | Módulo relacionado |
| assigned_to | UUID | SÍ | — | FK → auth.users(id) |
| completed_at | TIMESTAMPTZ | SÍ | — | |
| created_by | UUID | SÍ | — | FK → auth.users(id) |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |
| deleted_at | TIMESTAMPTZ | SÍ | NULL | |

---

### 28. import_logs
Historial de importaciones masivas. Permite rollback por sesión.

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| company_id | UUID | NO | — | FK → companies(id) |
| entity_type | TEXT | NO | — | products / customers / sales / etc. |
| file_name | TEXT | NO | — | |
| total_rows | INT | NO | 0 | |
| success_rows | INT | NO | 0 | |
| error_rows | INT | NO | 0 | |
| status | TEXT | NO | 'processing' | processing / success / partial / failed / rolled_back |
| errors | JSONB | SÍ | — | Array `[{row, message}]` |
| imported_ids | TEXT[] | SÍ | — | Array de UUIDs de registros importados |
| imported_by | UUID | NO | — | FK → users(id) |
| created_at | TIMESTAMPTZ | NO | now() | |
| completed_at | TIMESTAMPTZ | SÍ | — | |
| updated_at | TIMESTAMPTZ | NO | now() | |
| deleted_at | TIMESTAMPTZ | SÍ | NULL | |

---

### 29. branches
Sucursales o puntos de venta por empresa.

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| company_id | UUID | NO | — | FK → companies(id) ON DELETE CASCADE |
| name | TEXT | NO | — | |
| type | TEXT | SÍ | — | principal / sucursal / bodega / punto_venta |
| address | TEXT | SÍ | — | |
| phone | TEXT | SÍ | — | |
| is_active | BOOLEAN | NO | true | |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |
| deleted_at | TIMESTAMPTZ | SÍ | NULL | |

---

### 30. sale_statuses
Estados de venta configurables por empresa (ej: En bodega, En despacho, Entregado).

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| company_id | UUID | NO | — | FK → companies(id) ON DELETE CASCADE |
| name | TEXT | NO | — | |
| color | TEXT | NO | '#6B7280' | Color hex para la UI |
| is_active | BOOLEAN | NO | true | |
| sort_order | INT | NO | 0 | Orden de aparición |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |
| deleted_at | TIMESTAMPTZ | SÍ | NULL | |

---

### 31. pulse_metrics
Métricas internas del sistema Pulse (uso, rendimiento, monitoreo operacional).

| Columna | Tipo | Nulable | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| company_id | UUID | SÍ | — | FK → companies(id); NULL = métrica global |
| metric_name | TEXT | NO | — | |
| metric_value | NUMERIC | SÍ | — | |
| metadata | JSONB | SÍ | — | Datos adicionales |
| recorded_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | |
| deleted_at | TIMESTAMPTZ | SÍ | NULL | |

---

## Triggers

| # | Trigger | Tabla | Evento | Función | Propósito |
|---|---|---|---|---|---|
| 1 | `tg_set_updated_at` | Todas las tablas con `updated_at` | BEFORE UPDATE | `fn_set_updated_at()` | Actualizar `updated_at = now()` automáticamente |
| 2 | `tg_sync_inventory_from_sale_item` | `sale_items` | AFTER INSERT/UPDATE/DELETE | `fn_sync_inventory_from_sale_item()` | Crear/ajustar/revertir movimiento de inventario al vender |
| 3 | `tg_sync_stock_from_movement` | `inventory_movements` | AFTER INSERT/UPDATE/DELETE | `fn_sync_stock_from_movement()` | Actualizar `products.current_stock` ante cualquier movimiento |
| 4 | `tg_recalculate_sale_from_items` | `sale_items` | AFTER INSERT/UPDATE/DELETE | `fn_recalculate_sale_from_items()` | Recalcular `gross_total` y `net_total` en `sales` |
| 5 | `tg_create_ar_from_sale` | `sales` | AFTER UPDATE | `fn_create_ar_from_sale()` | Crear/actualizar CxC cuando la venta es a crédito |
| 6 | `tg_update_ar_from_payment` | `ar_payments` | AFTER INSERT/UPDATE/DELETE | `fn_update_ar_from_payment()` | Actualizar `amount_paid` y `status` en `accounts_receivable` |
| 7 | `tg_create_ap_from_purchase` | `purchases` | AFTER INSERT/UPDATE | `fn_create_ap_from_purchase()` | Crear/actualizar CxP cuando la compra es a crédito |
| 8 | `tg_update_ap_from_payment` | `ap_payments` | AFTER INSERT/UPDATE/DELETE | `fn_update_ap_from_payment()` | Actualizar `amount_paid` y `status` en `accounts_payable` |
| 9 | `tg_sync_inventory_from_purchase_item` | `purchase_items` | AFTER INSERT/UPDATE/DELETE | `fn_sync_inventory_from_purchase_item()` | Crear movimiento de inventario (entrada) al registrar compra |
| 10 | `tg_recalculate_purchase_totals` | `purchase_items` | AFTER INSERT/UPDATE/DELETE | `fn_recalculate_purchase_totals()` | Recalcular `subtotal` y `total` en `purchases` |
| 11 | `tg_ltv_on_sale_insert` | `sales` | AFTER INSERT | `tg_recalculate_customer_ltv()` | Actualizar `customers.total_purchases` y `total_orders` |
| 12 | `tg_ltv_on_sale_update` | `sales` | AFTER UPDATE | `tg_recalculate_customer_ltv()` | Idem al actualizar una venta |
| 13 | `tg_ltv_on_sale_delete` | `sales` | AFTER DELETE | `tg_recalculate_customer_ltv()` | Idem al eliminar una venta |
| 14 | `tg_update_bank_balance` | `bank_transactions` | AFTER INSERT/UPDATE/DELETE | `fn_update_bank_balance()` | Actualizar `bank_accounts.balance` |

---

## Funciones de base de datos

| Función | Tipo | SECURITY DEFINER | Propósito |
|---|---|---|---|
| `fn_set_updated_at()` | TRIGGER | Sí | Trigger universal para `updated_at` |
| `fn_sync_inventory_from_sale_item()` | TRIGGER | Sí | Inventory ↔ sale_items |
| `fn_sync_stock_from_movement()` | TRIGGER | Sí | Stock ↔ inventory_movements |
| `fn_recalculate_sale_from_items()` | TRIGGER | Sí | Totales de ventas desde líneas |
| `fn_create_ar_from_sale()` | TRIGGER | Sí | Genera CxC desde ventas a crédito |
| `fn_update_ar_from_payment()` | TRIGGER | Sí | Actualiza estado de CxC con cobros |
| `fn_create_ap_from_purchase()` | TRIGGER | Sí | Genera CxP desde compras a crédito |
| `fn_update_ap_from_payment()` | TRIGGER | Sí | Actualiza estado de CxP con pagos |
| `fn_sync_inventory_from_purchase_item()` | TRIGGER | Sí | Movimientos de inventario desde compras |
| `fn_recalculate_purchase_totals()` | TRIGGER | Sí | Totales de compras desde líneas |
| `tg_recalculate_customer_ltv()` | TRIGGER | Sí | LTV y total_orders del cliente |
| `fn_update_bank_balance()` | TRIGGER | Sí | Saldo de cuenta bancaria |
| `calculate_weekly_snapshot(company_id, week, year)` | RPC | Sí | Calcula y upserta snapshot semanal de KPIs |
| `fn_recalculate_all_snapshots(company_id)` | RPC | Sí | Recalcula todos los snapshots históricos |
| `get_user_company_id()` | HELPER | Sí | Devuelve `company_id` del usuario autenticado (usado en RLS) |
| `get_user_role()` | HELPER | Sí | Devuelve `role` del usuario autenticado |
| `is_pulse_admin()` | HELPER | Sí | Devuelve true si el usuario es Pulse Admin |

---

## Relaciones principales (Foreign Keys)

```
companies
  ├── users.company_id
  ├── user_company_memberships.company_id
  ├── customers.company_id
  │     ├── customer_types.company_id (catálogo)
  │     └── customer_labels.company_id (catálogo)
  ├── products.company_id
  │     └── product_price_history.product_id
  ├── suppliers.company_id
  ├── sales.company_id
  │     ├── sales.customer_id → customers
  │     ├── sales.branch_id → branches
  │     ├── sale_items.sale_id
  │     │     └── inventory_movements.sale_item_id → sale_items
  │     └── accounts_receivable.sale_id → sales
  │           └── ar_payments.ar_id → accounts_receivable
  ├── purchases.company_id
  │     ├── purchases.supplier_id → suppliers
  │     ├── purchase_items.purchase_id
  │     │     └── inventory_movements.purchase_item_id → purchase_items
  │     └── accounts_payable.purchase_id → purchases
  │           └── ap_payments.ap_id → accounts_payable
  ├── bank_accounts.company_id
  │     ├── bank_transactions.account_id → bank_accounts
  │     └── bank_transaction_categories.company_id (catálogo)
  ├── ad_campaigns.company_id
  ├── weekly_snapshots.company_id
  ├── ai_insights.company_id
  ├── ai_module_insights.company_id
  ├── insight_requests.company_id
  ├── playbook_actions.company_id
  ├── import_logs.company_id
  ├── branches.company_id
  └── sale_statuses.company_id
```

---

## Índices de rendimiento (migración 20260705140000)

| Índice | Tabla | Columnas | Filtro |
|---|---|---|---|
| `idx_sales_company_date` | sales | (company_id, sale_date DESC) | deleted_at IS NULL |
| `idx_sales_company_customer` | sales | (company_id, customer_id) | deleted_at IS NULL |
| `idx_sales_company_status` | sales | (company_id, status) | deleted_at IS NULL |
| `idx_sale_items_sale` | sale_items | (sale_id) | deleted_at IS NULL |
| `idx_sale_items_product` | sale_items | (company_id, product_id) | deleted_at IS NULL |
| `idx_products_company_active` | products | (company_id, is_active) | deleted_at IS NULL |
| `idx_inventory_movements_product` | inventory_movements | (product_id, movement_date DESC) | — |
| `idx_customers_company_name` | customers | (company_id, full_name) | deleted_at IS NULL |
| `idx_ar_company_status` | accounts_receivable | (company_id, status) | — |
| `idx_ar_due_date` | accounts_receivable | (due_date) | — |
| `idx_ap_company_status` | accounts_payable | (company_id, status) | — |
| `idx_ap_due_date` | accounts_payable | (due_date) | — |
| `idx_ami_company_module` | ai_module_insights | (company_id, module, created_at DESC) | — |
