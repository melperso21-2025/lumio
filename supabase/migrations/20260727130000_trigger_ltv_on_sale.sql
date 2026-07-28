-- Trigger que recalcula lifetime_value, last_purchase_at y total_orders
-- en customers cada vez que se inserta, actualiza o soft-elimina una venta.

CREATE OR REPLACE FUNCTION public.tg_recalculate_customer_ltv()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
BEGIN
  -- Determinar el customer_id afectado
  IF TG_OP = 'DELETE' THEN
    v_customer_id := OLD.customer_id;
  ELSE
    v_customer_id := NEW.customer_id;
    -- Si el customer_id cambió, actualizar también el anterior
    IF TG_OP = 'UPDATE' AND OLD.customer_id IS DISTINCT FROM NEW.customer_id AND OLD.customer_id IS NOT NULL THEN
      UPDATE public.customers c
      SET
        lifetime_value  = COALESCE((SELECT SUM(s.gross_total) FROM public.sales s WHERE s.customer_id = OLD.customer_id AND s.deleted_at IS NULL AND s.status IS DISTINCT FROM 'cancelled'), 0),
        last_purchase_at= (SELECT MAX(s.sale_date)           FROM public.sales s WHERE s.customer_id = OLD.customer_id AND s.deleted_at IS NULL AND s.status IS DISTINCT FROM 'cancelled'),
        total_orders    = (SELECT COUNT(*)                   FROM public.sales s WHERE s.customer_id = OLD.customer_id AND s.deleted_at IS NULL AND s.status IS DISTINCT FROM 'cancelled'),
        updated_at      = now()
      WHERE c.id = OLD.customer_id;
    END IF;
  END IF;

  IF v_customer_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.customers c
  SET
    lifetime_value  = COALESCE((SELECT SUM(s.gross_total) FROM public.sales s WHERE s.customer_id = v_customer_id AND s.deleted_at IS NULL AND s.status IS DISTINCT FROM 'cancelled'), 0),
    last_purchase_at= (SELECT MAX(s.sale_date)           FROM public.sales s WHERE s.customer_id = v_customer_id AND s.deleted_at IS NULL AND s.status IS DISTINCT FROM 'cancelled'),
    total_orders    = (SELECT COUNT(*)                   FROM public.sales s WHERE s.customer_id = v_customer_id AND s.deleted_at IS NULL AND s.status IS DISTINCT FROM 'cancelled'),
    updated_at      = now()
  WHERE c.id = v_customer_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Eliminar triggers anteriores si existen (idempotente)
DROP TRIGGER IF EXISTS tg_ltv_on_sale_insert  ON public.sales;
DROP TRIGGER IF EXISTS tg_ltv_on_sale_update  ON public.sales;
DROP TRIGGER IF EXISTS tg_ltv_on_sale_delete  ON public.sales;

-- Trigger en INSERT (venta nueva)
CREATE TRIGGER tg_ltv_on_sale_insert
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_recalculate_customer_ltv();

-- Trigger en UPDATE (edición, anulación, soft-delete)
CREATE TRIGGER tg_ltv_on_sale_update
  AFTER UPDATE OF gross_total, status, deleted_at, customer_id ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_recalculate_customer_ltv();

-- Trigger en DELETE (borrado físico, poco probable pero seguro)
CREATE TRIGGER tg_ltv_on_sale_delete
  AFTER DELETE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_recalculate_customer_ltv();
