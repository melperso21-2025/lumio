# Estándares de Base de Datos — Lumio

> Documento de referencia obligatorio. Toda nueva tabla, columna, índice, función o trigger debe cumplir estas reglas antes de llegar a producción.

---

## 1. Nomenclatura

### Tablas
- **Idioma:** inglés
- **Formato:** `snake_case`, plural
- **Ejemplos correctos:** `sales`, `sale_items`, `bank_transactions`, `product_categories`
- **Ejemplos incorrectos:** `Venta`, `lineaVenta`, `transaccion_bancaria`

### Columnas
- **Idioma:** inglés
- **Formato:** `snake_case`
- **FKs:** `{tabla_singular}_id` — ej: `sale_id`, `company_id`, `product_id`
- **Booleanos:** prefijo `is_` o `has_` — ej: `is_active`, `is_default`
- **Fechas de evento:** sufijo `_at` (timestamptz) o `_date` (date) — ej: `created_at`, `sale_date`, `due_date`

### Índices
- **Formato:** `idx_{tabla}_{columnas}` — ej: `idx_sales_company_date`
- **Únicos:** `uq_{tabla}_{columnas}` — ej: `uq_branches_company_name`
- **Únicos parciales:** misma convención + describir la condición en comentario

### Funciones y triggers
- **Funciones de trigger:** prefijo `fn_` — ej: `fn_sync_stock_from_movement`
- **Triggers:** prefijo `tg_` — ej: `tg_sync_stock_from_movement`
- **Funciones de negocio:** verbo descriptivo — ej: `recalculate_sales_totals`, `calculate_weekly_snapshot`

---

## 2. Columnas obligatorias en toda tabla

Toda tabla de datos debe tener estas columnas. Sin excepción.

```sql
id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
company_id  uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
created_at  timestamptz NOT NULL DEFAULT now(),
updated_at  timestamptz NOT NULL DEFAULT now(),
deleted_at  timestamptz          DEFAULT NULL
```

### Excepciones documentadas

| Tabla | Excepción | Razón |
|---|---|---|
| `companies` | Sin `company_id` | Es la tabla raíz |
| `users` | Sin `company_id` propio | Usa `company_id` como empresa activa; relación via `user_company_memberships` |
| `inventory_movements` | Sin `deleted_at` | Registro contable inmutable; se revierte con un movimiento opuesto, nunca borrando |
| `product_price_history` | Sin `deleted_at` | Registro histórico inmutable |
| `weekly_snapshots` | Sin `deleted_at` | Se recalcula completo; no se elimina individualmente |

### Tablas de catálogo sin `company_id`
Las tablas de sistema globales (roles, tipos fijos) no llevan `company_id`. Deben documentarse explícitamente si se crean.

---

## 3. Soft delete (eliminación lógica)

### Regla general
**Nunca se borra físicamente un registro**, salvo en los casos explícitamente permitidos abajo.

```sql
-- Eliminar (siempre así)
UPDATE {tabla} SET deleted_at = now() WHERE id = '{id}';

-- Consultar activos (siempre filtrar)
SELECT * FROM {tabla} WHERE deleted_at IS NULL;
```

### Casos donde se permite eliminación física
1. **Rollback de importación:** se revierten los IDs exactos de la sesión de import
2. **Tablas sin `deleted_at`** (ver excepciones en sección 2): `inventory_movements`, `product_price_history`

### RLS con soft delete
Toda política RLS sobre tablas con `deleted_at` debe incluir el filtro:
```sql
USING (company_id = get_user_company_id() AND deleted_at IS NULL)
```

---

## 4. Índices obligatorios

### Por tabla con `company_id`
```sql
-- Índice base por empresa (filtro más común)
CREATE INDEX idx_{tabla}_company
  ON {tabla} (company_id)
  WHERE deleted_at IS NULL;
```

### Adicionales según uso
```sql
-- Búsquedas por fecha
CREATE INDEX idx_{tabla}_company_date
  ON {tabla} (company_id, {fecha_col} DESC)
  WHERE deleted_at IS NULL;

-- FKs que se usan en JOINs frecuentes
CREATE INDEX idx_{tabla}_{fk_col}
  ON {tabla} ({fk_col})
  WHERE deleted_at IS NULL;
```

### Regla de unicidad con soft delete
Los UNIQUE deben ser parciales para permitir que exista el mismo valor en registros eliminados:
```sql
CREATE UNIQUE INDEX uq_{tabla}_company_name
  ON {tabla} (company_id, name)
  WHERE deleted_at IS NULL;
```

---

## 5. Trigger automático de `updated_at`

Toda tabla con `updated_at` debe tener este trigger. Se usa una función compartida.

```sql
-- Función compartida (ya existe en DB)
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger por tabla
CREATE TRIGGER tg_set_updated_at
  BEFORE UPDATE ON {tabla}
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
```

**Nunca** actualizar `updated_at` manualmente en código de aplicación. El trigger es la única fuente de verdad.

---

## 6. Seguridad de funciones

Toda función `SECURITY DEFINER` debe declarar `SET search_path = public` para evitar search_path hijacking:

```sql
CREATE OR REPLACE FUNCTION fn_ejemplo(...)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ...
END;
$$;
```

---

## 7. RLS (Row Level Security)

- Toda tabla de datos debe tener RLS habilitado
- La función `get_user_company_id()` es el helper estándar para identificar la empresa del usuario
- La función `is_pulse_admin()` es el helper para acceso de superadmin
- Toda política debe filtrar por `company_id = get_user_company_id()`
- Nunca exponer datos de otra empresa bajo ninguna circunstancia

```sql
ALTER TABLE {tabla} ENABLE ROW LEVEL SECURITY;

CREATE POLICY "{tabla}_select"
  ON {tabla} FOR SELECT
  USING (company_id = get_user_company_id() AND deleted_at IS NULL);

CREATE POLICY "{tabla}_insert"
  ON {tabla} FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "{tabla}_update"
  ON {tabla} FOR UPDATE
  USING (company_id = get_user_company_id() AND deleted_at IS NULL);
```

---

## 8. Migraciones

- Cada migración tiene un archivo propio en `supabase/migrations/`
- Nombre: `YYYYMMDDHHMMSS_{descripcion_corta}.sql`
- Una migración es **irrevocable** — no usar `DROP TABLE` ni `DROP COLUMN` salvo autorización explícita
- Usar `IF NOT EXISTS` / `IF EXISTS` para hacer las migraciones idempotentes cuando sea posible
- Los cambios destructivos requieren migración de datos antes de eliminar la columna/tabla

---

## 9. Resumen rápido — checklist para nueva tabla

```
[ ] Nombre en inglés, snake_case, plural
[ ] id uuid PK con gen_random_uuid()
[ ] company_id FK a companies (salvo excepción documentada)
[ ] created_at timestamptz NOT NULL DEFAULT now()
[ ] updated_at timestamptz NOT NULL DEFAULT now()
[ ] deleted_at timestamptz DEFAULT NULL (salvo excepción documentada)
[ ] RLS habilitado con políticas select/insert/update
[ ] Índice base: idx_{tabla}_company WHERE deleted_at IS NULL
[ ] Índices adicionales en columnas de búsqueda frecuente
[ ] Trigger tg_set_updated_at BEFORE UPDATE
[ ] UNIQUE parciales (WHERE deleted_at IS NULL) cuando aplique
```
