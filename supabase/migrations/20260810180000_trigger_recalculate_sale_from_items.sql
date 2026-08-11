-- Trigger: sale_items INSERT/UPDATE/DELETE recalcula automaticamente en sales:
--   gross_total      = SUM(unit_price * quantity - discount_amount)
--   production_cost  = SUM(unit_cost * quantity)
--   lines_per_order  = COUNT(*) de items activos
--
-- Esto activa en cascada:
--   tg_create_ar_from_sale   -> CxC se crea/actualiza cuando gross_total > 0
--   tg_ltv_on_sale_update    -> LTV de cliente se actualiza
--   tg_set_updated_at        -> updated_at de sales se mantiene

CREATE OR REPLACE FUNCTION public.fn_recalculate_sale_from_items()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id uuid;
BEGIN
  v_sale_id := COALESCE(NEW.sale_id, OLD.sale_id);

  UPDATE public.sales
  SET
    gross_total     = (
      SELECT COALESCE(SUM(unit_price * quantity - COALESCE(discount_amount, 0)), 0)
      FROM public.sale_items
      WHERE sale_id = v_sale_id AND deleted_at IS NULL
    ),
    production_cost = (
      SELECT COALESCE(SUM(COALESCE(unit_cost, 0) * quantity), 0)
      FROM public.sale_items
      WHERE sale_id = v_sale_id AND deleted_at IS NULL
    ),
    lines_per_order = (
      SELECT COUNT(*)
      FROM public.sale_items
      WHERE sale_id = v_sale_id AND deleted_at IS NULL
    )
  WHERE id = v_sale_id AND deleted_at IS NULL;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tg_recalculate_sale_from_items ON public.sale_items;
CREATE TRIGGER tg_recalculate_sale_from_items
  AFTER INSERT OR UPDATE OR DELETE ON public.sale_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_recalculate_sale_from_items();
