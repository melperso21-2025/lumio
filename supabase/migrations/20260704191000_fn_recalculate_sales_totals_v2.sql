-- v2: actualiza gross_total en sales Y recalcula directamente customers
-- (sin depender del trigger, que puede no dispararse desde SQL Editor).
CREATE OR REPLACE FUNCTION public.recalculate_sales_totals(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Recalcula gross_total en sales desde sale_items
  UPDATE public.sales s
  SET gross_total = (
    SELECT COALESCE(SUM(si.unit_price * si.quantity - si.discount_amount), 0)
    FROM public.sale_items si
    WHERE si.sale_id = s.id
      AND si.deleted_at IS NULL
  )
  WHERE s.company_id = p_company_id
    AND s.deleted_at IS NULL;

  -- 2. Recalcula lifetime_value, last_purchase_at y total_orders en customers
  UPDATE public.customers c
  SET
    lifetime_value = (
      SELECT COALESCE(SUM(s.gross_total), 0)
      FROM public.sales s
      WHERE s.customer_id = c.id
        AND s.deleted_at IS NULL
        AND s.status IS DISTINCT FROM 'cancelled'
    ),
    last_purchase_at = (
      SELECT MAX(s.sale_date)
      FROM public.sales s
      WHERE s.customer_id = c.id
        AND s.deleted_at IS NULL
        AND s.status IS DISTINCT FROM 'cancelled'
    ),
    total_orders = (
      SELECT COUNT(*)
      FROM public.sales s
      WHERE s.customer_id = c.id
        AND s.deleted_at IS NULL
        AND s.status IS DISTINCT FROM 'cancelled'
    ),
    updated_at = now()
  WHERE c.company_id = p_company_id
    AND c.deleted_at IS NULL;
END;
$$;
