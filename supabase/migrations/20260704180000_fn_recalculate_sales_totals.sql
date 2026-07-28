-- Recalcula gross_total en sales desde sale_items para una empresa.
-- El trigger tg_update_customer_stats se dispara en cada UPDATE
-- y actualiza lifetime_value + last_purchase_at en customers.
CREATE OR REPLACE FUNCTION public.recalculate_sales_totals(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.sales s
  SET gross_total = (
    SELECT COALESCE(SUM(si.unit_price * si.quantity - si.discount_amount), 0)
    FROM public.sale_items si
    WHERE si.sale_id = s.id
      AND si.deleted_at IS NULL
  )
  WHERE s.company_id = p_company_id
    AND s.deleted_at IS NULL;
END;
$$;

COMMENT ON FUNCTION public.recalculate_sales_totals(uuid) IS
  'Recalcula gross_total en sales desde sale_items. El trigger en sales actualiza lifetime_value y last_purchase_at en customers automáticamente.';
