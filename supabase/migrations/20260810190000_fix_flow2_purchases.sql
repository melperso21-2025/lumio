-- Fix flujo 2: compras, purchase_items, inventario, AP
-- Cambios:
--   1. fn_sync_inventory_from_purchase_item: maneja soft-delete (deleted_at)
--      y elimina el intento de actualizar updated_at en inventory_movements
--      (tabla inmutable sin esa columna por diseno).
--   2. RLS: agrega politicas UPDATE y DELETE a purchase_items.
--   3. RLS: agrega deleted_at IS NULL a purchases_select.
--   4. RLS: agrega deleted_at IS NULL a accounts_payable_select.
--   5. Trigger de total en purchases cuando cambia tax_amount (sin items).

-- ── 1. Funcion de inventario corregida ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_sync_inventory_from_purchase_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- INSERT: entrada de stock por compra
  IF TG_OP = 'INSERT' AND NEW.product_id IS NOT NULL THEN
    INSERT INTO inventory_movements (
      company_id, product_id, type, quantity,
      reason, movement_date, notes, purchase_item_id
    ) VALUES (
      NEW.company_id, NEW.product_id, 'in', NEW.quantity,
      'purchase', CURRENT_DATE, 'Entrada por compra', NEW.id
    );
    RETURN NEW;
  END IF;

  -- UPDATE: soft-delete (deleted_at seteado) → eliminar el movimiento asociado
  IF TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    IF NEW.product_id IS NOT NULL THEN
      DELETE FROM inventory_movements
      WHERE purchase_item_id = NEW.id AND type = 'in' AND reason = 'purchase';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: cambio de cantidad → actualizar el movimiento existente
  IF TG_OP = 'UPDATE' AND NEW.deleted_at IS NULL
     AND NEW.product_id IS NOT NULL
     AND NEW.quantity IS DISTINCT FROM OLD.quantity THEN
    UPDATE inventory_movements
    SET quantity = NEW.quantity
    WHERE purchase_item_id = NEW.id AND type = 'in' AND reason = 'purchase';
    RETURN NEW;
  END IF;

  -- DELETE fisico (rollback de importacion): eliminar el movimiento
  IF TG_OP = 'DELETE' AND OLD.product_id IS NOT NULL THEN
    DELETE FROM inventory_movements
    WHERE purchase_item_id = OLD.id AND type = 'in' AND reason = 'purchase';
    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;


-- ── 2. RLS purchase_items: agregar UPDATE y DELETE ───────────────────────────

DROP POLICY IF EXISTS purchase_items_update ON public.purchase_items;
CREATE POLICY purchase_items_update ON public.purchase_items
  FOR UPDATE
  USING (company_id = get_user_company_id());

DROP POLICY IF EXISTS purchase_items_delete ON public.purchase_items;
CREATE POLICY purchase_items_delete ON public.purchase_items
  FOR DELETE
  USING (company_id = get_user_company_id());


-- ── 3. RLS purchases: filtrar deleted_at IS NULL en select ───────────────────

DROP POLICY IF EXISTS purchases_select ON public.purchases;
CREATE POLICY purchases_select ON public.purchases
  FOR SELECT
  USING (company_id = get_user_company_id() AND deleted_at IS NULL);


-- ── 4. RLS accounts_payable: filtrar deleted_at IS NULL en select ────────────

DROP POLICY IF EXISTS accounts_payable_select ON public.accounts_payable;
CREATE POLICY accounts_payable_select ON public.accounts_payable
  FOR SELECT
  USING (company_id = get_user_company_id() AND deleted_at IS NULL);


-- ── 5. fn_recalculate_purchase_totals: agregar filtro deleted_at IS NULL ──────
-- El original suma TODOS los items incluidos los soft-deleted.

CREATE OR REPLACE FUNCTION public.fn_recalculate_purchase_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid     uuid;
  sub_val numeric;
  tax_val numeric;
BEGIN
  pid := COALESCE(NEW.purchase_id, OLD.purchase_id);

  SELECT COALESCE(SUM(quantity * unit_cost), 0) INTO sub_val
    FROM purchase_items WHERE purchase_id = pid AND deleted_at IS NULL;

  SELECT COALESCE(tax_amount, 0) INTO tax_val
    FROM purchases WHERE id = pid;

  UPDATE purchases
     SET subtotal   = sub_val,
         total      = sub_val + tax_val,
         updated_at = NOW()
   WHERE id = pid;

  RETURN COALESCE(NEW, OLD);
END;
$$;


-- ── 6. Trigger en purchases: recalcular total cuando cambia tax_amount ────────
-- Necesario porque fn_recalculate_purchase_totals solo dispara desde purchase_items.
-- Si el usuario edita solo tax_amount en el PATCH, el total quedaria desactualizado.

CREATE OR REPLACE FUNCTION public.fn_recalculate_purchase_total_on_tax()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tax_amount IS DISTINCT FROM OLD.tax_amount THEN
    UPDATE public.purchases
    SET total = subtotal + COALESCE(NEW.tax_amount, 0)
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_recalculate_total_on_tax ON public.purchases;
CREATE TRIGGER tg_recalculate_total_on_tax
  AFTER UPDATE OF tax_amount ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_recalculate_purchase_total_on_tax();
