-- Fijar search_path en funciones SECURITY DEFINER para prevenir search_path hijacking.
-- Sin esto, un atacante con acceso de schema podría crear objetos con el mismo nombre
-- en otro schema y ejecutar código con privilegios elevados.

CREATE OR REPLACE FUNCTION public.recalculate_sales_totals(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

CREATE OR REPLACE FUNCTION public.recalculate_all_snapshots(p_company_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_week  RECORD;
  v_count int := 0;
BEGIN
  FOR v_week IN
    SELECT DISTINCT year, week_number
    FROM   public.sales
    WHERE  company_id  = p_company_id
      AND  deleted_at  IS NULL
      AND  week_number IS NOT NULL
      AND  year        IS NOT NULL
    ORDER BY year, week_number
  LOOP
    PERFORM calculate_weekly_snapshot(p_company_id, v_week.year, v_week.week_number);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
