-- =============================================================================
-- MIGRACIÓN: Triggers de inventario
-- Fecha: 2026-07-27
--
-- Qué hace:
--   1. Trigger en inventory_movements → actualiza products.current_stock
--      - in         : current_stock += quantity
--      - out        : current_stock -= quantity
--      - adjustment : current_stock  = quantity (conteo físico absoluto)
--
--   2. Trigger en sale_items → crea inventory_movement automático al vender
--      - INSERT sale_item  → inventory_movement (out / sale)
--      - UPDATE quantity   → ajusta el movement existente
--      - DELETE sale_item  → revierte el movement (in / sale_reversal)
--
-- Todos los triggers son CREATE OR REPLACE — seguros de re-ejecutar.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. FUNCIÓN: actualizar current_stock cuando cambia inventory_movements
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_sync_stock_from_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delta NUMERIC := 0;
BEGIN

  -- Revertir el efecto del registro anterior (UPDATE / DELETE)
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    IF OLD.type = 'in' THEN
      delta := delta - OLD.quantity;
    ELSIF OLD.type = 'out' THEN
      delta := delta + OLD.quantity;
    -- adjustment no tiene reversa delta; se recalcula abajo
    END IF;
  END IF;

  -- Aplicar el efecto del registro nuevo (INSERT / UPDATE)
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.type = 'in' THEN
      delta := delta + NEW.quantity;
    ELSIF NEW.type = 'out' THEN
      delta := delta - NEW.quantity;
    ELSIF NEW.type = 'adjustment' THEN
      -- Ajuste absoluto: recalcular desde todos los movimientos no-adjustment
      -- más el valor del ajuste
      UPDATE products
      SET
        current_stock = NEW.quantity,
        updated_at    = NOW()
      WHERE id = NEW.product_id;
      RETURN NEW;
    END IF;
  END IF;

  -- Para DELETE de un adjustment: recalcular stock desde movimientos restantes
  IF TG_OP = 'DELETE' AND OLD.type = 'adjustment' THEN
    UPDATE products p
    SET current_stock = GREATEST(0, (
      SELECT COALESCE(SUM(
        CASE
          WHEN m.type = 'in'  THEN  m.quantity
          WHEN m.type = 'out' THEN -m.quantity
          ELSE 0
        END
      ), 0)
      FROM inventory_movements m
      WHERE m.product_id = OLD.product_id
        AND m.id <> OLD.id
        AND m.type <> 'adjustment'
    ) + (
      -- Último ajuste anterior si existe
      SELECT COALESCE(quantity, 0)
      FROM inventory_movements
      WHERE product_id = OLD.product_id
        AND type = 'adjustment'
        AND id <> OLD.id
      ORDER BY movement_date DESC, created_at DESC
      LIMIT 1
    )),
    updated_at = NOW()
    WHERE p.id = OLD.product_id;
    RETURN OLD;
  END IF;

  -- Aplicar delta (para in / out)
  IF delta <> 0 THEN
    UPDATE products
    SET
      current_stock = GREATEST(0, COALESCE(current_stock, 0) + delta),
      updated_at    = NOW()
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Crear trigger (DROP primero para evitar duplicados)
DROP TRIGGER IF EXISTS tg_sync_stock_from_movement ON inventory_movements;

CREATE TRIGGER tg_sync_stock_from_movement
AFTER INSERT OR UPDATE OR DELETE ON inventory_movements
FOR EACH ROW
EXECUTE FUNCTION fn_sync_stock_from_movement();


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. FUNCIÓN: crear/ajustar/revertir inventory_movement desde sale_items
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_sync_inventory_from_sale_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  -- INSERT: nueva línea de venta → salida de inventario
  IF TG_OP = 'INSERT' THEN
    INSERT INTO inventory_movements (
      company_id,
      product_id,
      type,
      quantity,
      reason,
      movement_date,
      notes,
      sale_item_id
    )
    VALUES (
      NEW.company_id,
      NEW.product_id,
      'out',
      NEW.quantity,
      'sale',
      NOW(),
      'Venta automática desde sale_item',
      NEW.id
    );
    RETURN NEW;
  END IF;

  -- UPDATE: cambió la cantidad → ajustar el movement existente
  IF TG_OP = 'UPDATE' AND NEW.quantity <> OLD.quantity THEN
    UPDATE inventory_movements
    SET
      quantity   = NEW.quantity,
      updated_at = NOW()
    WHERE sale_item_id = NEW.id
      AND type   = 'out'
      AND reason = 'sale';
    RETURN NEW;
  END IF;

  -- DELETE: línea eliminada → revertir salida (entrada de devolución)
  IF TG_OP = 'DELETE' THEN
    DELETE FROM inventory_movements
    WHERE sale_item_id = OLD.id
      AND type   = 'out'
      AND reason = 'sale';
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

-- Crear trigger (DROP primero para evitar duplicados)
DROP TRIGGER IF EXISTS tg_sync_inventory_from_sale_item ON sale_items;

CREATE TRIGGER tg_sync_inventory_from_sale_item
AFTER INSERT OR UPDATE OR DELETE ON sale_items
FOR EACH ROW
EXECUTE FUNCTION fn_sync_inventory_from_sale_item();


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. COLUMNA sale_item_id en inventory_movements (si no existe)
--    Permite ligar cada movimiento de venta a su línea de venta
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS sale_item_id UUID REFERENCES sale_items(id) ON DELETE SET NULL;

-- Índice para búsqueda inversa
CREATE INDEX IF NOT EXISTS idx_inventory_movements_sale_item_id
  ON inventory_movements(sale_item_id)
  WHERE sale_item_id IS NOT NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RECALCULAR current_stock de todos los productos desde cero
--    (para dejar la base consistente con los movimientos históricos)
--    Solo afecta productos con al menos 1 movimiento registrado.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE products p
SET
  current_stock = GREATEST(0, (
    SELECT COALESCE(
      -- Tomar el último adjustment como base (si existe)
      (
        SELECT quantity FROM inventory_movements
        WHERE product_id = p.id AND type = 'adjustment'
        ORDER BY movement_date DESC, created_at DESC
        LIMIT 1
      ), 0
    ) + COALESCE(
      -- Sumar in/out posteriores al último adjustment (o todos si no hay adjustment)
      SUM(
        CASE
          WHEN m.type = 'in'  THEN  m.quantity
          WHEN m.type = 'out' THEN -m.quantity
          ELSE 0
        END
      ), 0
    )
    FROM inventory_movements m
    WHERE m.product_id = p.id
      AND m.type <> 'adjustment'
      AND m.movement_date >= COALESCE(
        (
          SELECT movement_date FROM inventory_movements
          WHERE product_id = p.id AND type = 'adjustment'
          ORDER BY movement_date DESC, created_at DESC
          LIMIT 1
        ),
        '2000-01-01'::timestamptz
      )
  )),
  updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM inventory_movements WHERE product_id = p.id
);
