-- weekly_snapshots: función de cálculo y UPSERT por empresa / año / semana
-- Comentarios en español; identificadores en inglés.

-- Índice único requerido para ON CONFLICT (company_id, week_number, year)
CREATE UNIQUE INDEX IF NOT EXISTS weekly_snapshots_company_week_year_uidx
  ON public.weekly_snapshots (company_id, week_number, year);

-- Reemplaza firma previa si existía (p_week → p_week_number)
DROP FUNCTION IF EXISTS public.calculate_weekly_snapshot(uuid, int, int);

-- Orden de parámetros: PostgREST resuelve RPC por nombre; el mensaje de error usa orden alfabético (p_company_id, p_week_number, p_year).
CREATE OR REPLACE FUNCTION public.calculate_weekly_snapshot(
  p_company_id uuid,
  p_week_number int,
  p_year int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start date;
  v_week_end date;
  v_total_sales numeric := 0;
  v_total_transactions bigint := 0;
  v_avg_lpp numeric;
  v_total_discounts numeric := 0;
  v_gross_margin_pct numeric;
  v_total_ad_spend numeric := 0;
  v_avg_roas numeric;
  v_total_leads numeric := 0;
  v_avg_effectiveness numeric;
  v_avg_ctr numeric;
  v_inventory_days numeric;
  v_cash_days numeric;
  v_net_margin_pct numeric;
  v_fixed_vs_total_pct numeric;
  v_overdue_receivables numeric := 0;
  v_avg_ticket numeric;
  v_frozen_capital numeric := 0;
  v_stock_total_value numeric := 0;
  v_avg_daily_cogs numeric;
  v_total_balance numeric := 0;
  v_sum_exp_7d numeric := 0;
  v_income_w numeric := 0;
  v_expense_w numeric := 0;
  v_fixed_exp_w numeric := 0;
  v_total_exp_w numeric := 0;
BEGIN
  IF p_company_id IS NULL OR p_year IS NULL OR p_week_number IS NULL THEN
    RAISE EXCEPTION 'Invalid arguments';
  END IF;

  -- Rango de fechas de la semana: primero desde datos (ventas/pautas), si no ISO
  SELECT
    sub.d_min,
    sub.d_max
  INTO v_week_start, v_week_end
  FROM (
    SELECT
      (SELECT MIN(x) FROM (
        SELECT sale_date::date AS x
        FROM public.sales
        WHERE company_id = p_company_id
          AND year = p_year
          AND week_number = p_week_number
          AND deleted_at IS NULL
        UNION ALL
        SELECT campaign_date::date AS x
        FROM public.ad_campaigns
        WHERE company_id = p_company_id
          AND year = p_year
          AND week_number = p_week_number
          AND deleted_at IS NULL
      ) u) AS d_min,
      (SELECT MAX(x) FROM (
        SELECT sale_date::date AS x
        FROM public.sales
        WHERE company_id = p_company_id
          AND year = p_year
          AND week_number = p_week_number
          AND deleted_at IS NULL
        UNION ALL
        SELECT campaign_date::date AS x
        FROM public.ad_campaigns
        WHERE company_id = p_company_id
          AND year = p_year
          AND week_number = p_week_number
          AND deleted_at IS NULL
      ) u2) AS d_max
  ) sub;

  IF v_week_start IS NULL OR v_week_end IS NULL THEN
    SELECT MIN(d::date), MAX(d::date)
    INTO v_week_start, v_week_end
    FROM (
      SELECT gs.d::date
      FROM generate_series(
        (make_date(p_year, 1, 1) - 20),
        (make_date(p_year, 12, 31) + 20),
        '1 day'::interval
      ) AS gs(d)
      WHERE EXTRACT(isoyear FROM gs.d::date) = p_year::double precision
        AND EXTRACT(week FROM gs.d::date) = p_week_number::double precision
    ) iso_days;
  END IF;

  IF v_week_start IS NULL OR v_week_end IS NULL THEN
    v_week_start := make_date(p_year, 1, 1) + ((p_week_number - 1) * 7);
    v_week_end := v_week_start + 6;
  END IF;

  -- Ventas
  SELECT
    COALESCE(SUM(s.gross_total), 0),
    COUNT(*)::bigint,
    AVG(s.lines_per_order)::numeric,
    COALESCE(SUM(s.discount_amount), 0),
    CASE
      WHEN COALESCE(SUM(s.gross_total), 0) = 0 THEN NULL
      ELSE (
        SUM(s.gross_total - COALESCE(s.production_cost, 0))::numeric
        / NULLIF(SUM(s.gross_total), 0)
      ) * 100
    END
  INTO v_total_sales, v_total_transactions, v_avg_lpp, v_total_discounts, v_gross_margin_pct
  FROM public.sales s
  WHERE s.company_id = p_company_id
    AND s.year = p_year
    AND s.week_number = p_week_number
    AND s.deleted_at IS NULL
    AND COALESCE(s.status, '') <> 'cancelled';

  IF v_total_transactions > 0 THEN
    v_avg_ticket := v_total_sales / v_total_transactions::numeric;
  ELSE
    v_avg_ticket := NULL;
  END IF;

  -- Pautas
  SELECT
    COALESCE(SUM(a.spend), 0),
    AVG(a.roas)::numeric,
    COALESCE(SUM(a.leads_count), 0),
    AVG(a.effectiveness_rate)::numeric,
    AVG(a.ctr)::numeric
  INTO v_total_ad_spend, v_avg_roas, v_total_leads, v_avg_effectiveness, v_avg_ctr
  FROM public.ad_campaigns a
  WHERE a.company_id = p_company_id
    AND a.year = p_year
    AND a.week_number = p_week_number
    AND a.deleted_at IS NULL;

  -- Inventario: valor stock y COGS últimos 30 días hasta fin de semana
  SELECT COALESCE(SUM(
    COALESCE(p.current_stock, 0)::numeric * COALESCE(p.unit_cost, 0)::numeric
  ), 0)
  INTO v_stock_total_value
  FROM public.products p
  WHERE p.company_id = p_company_id
    AND p.deleted_at IS NULL;

  v_frozen_capital := v_stock_total_value;

  SELECT COALESCE(SUM(COALESCE(s.production_cost, 0)), 0) / 30.0
  INTO v_avg_daily_cogs
  FROM public.sales s
  WHERE s.company_id = p_company_id
    AND s.deleted_at IS NULL
    AND COALESCE(s.status, '') <> 'cancelled'
    AND s.sale_date::date >= (v_week_end - interval '30 days')::date
    AND s.sale_date::date <= v_week_end;

  IF v_avg_daily_cogs IS NOT NULL AND v_avg_daily_cogs > 0 THEN
    v_inventory_days := v_stock_total_value / v_avg_daily_cogs;
  ELSE
    v_inventory_days := NULL;
  END IF;

  -- Finanzas: saldos actuales
  SELECT COALESCE(SUM(ba.current_balance), 0)
  INTO v_total_balance
  FROM public.bank_accounts ba
  WHERE ba.company_id = p_company_id
    AND ba.deleted_at IS NULL
    AND COALESCE(ba.is_active, true) = true;

  SELECT COALESCE(SUM(CASE WHEN bt.type = 'expense' THEN bt.amount ELSE 0 END), 0)
  INTO v_sum_exp_7d
  FROM public.bank_transactions bt
  WHERE bt.company_id = p_company_id
    AND bt.tx_date::date >= (v_week_end - interval '6 days')::date
    AND bt.tx_date::date <= v_week_end;

  IF v_sum_exp_7d > 0 THEN
    v_cash_days := v_total_balance / (v_sum_exp_7d / 7.0);
  ELSE
    v_cash_days := NULL;
  END IF;

  -- Semana seleccionada: ingresos / egresos / fijos
  SELECT
    COALESCE(SUM(CASE WHEN bt.type = 'income' THEN bt.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN bt.type = 'expense' THEN bt.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN bt.type = 'expense' AND COALESCE(bt.is_fixed, false) THEN bt.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN bt.type = 'expense' THEN bt.amount ELSE 0 END), 0)
  INTO v_income_w, v_expense_w, v_fixed_exp_w, v_total_exp_w
  FROM public.bank_transactions bt
  WHERE bt.company_id = p_company_id
    AND bt.tx_date::date >= v_week_start
    AND bt.tx_date::date <= v_week_end;

  IF v_income_w > 0 THEN
    v_net_margin_pct := ((v_income_w - v_expense_w) / v_income_w) * 100;
  ELSE
    v_net_margin_pct := NULL;
  END IF;

  IF v_total_exp_w > 0 THEN
    v_fixed_vs_total_pct := (v_fixed_exp_w / v_total_exp_w) * 100;
  ELSE
    v_fixed_vs_total_pct := NULL;
  END IF;

  -- CxC vencido
  SELECT COALESCE(SUM(ar.amount), 0)
  INTO v_overdue_receivables
  FROM public.accounts_receivable ar
  WHERE ar.company_id = p_company_id
    AND ar.deleted_at IS NULL
    AND (
      ar.status = 'overdue'
      OR ar.due_date::date < CURRENT_DATE
    );

  INSERT INTO public.weekly_snapshots (
    id,
    company_id,
    year,
    week_number,
    total_sales,
    total_transactions,
    avg_lpp,
    total_discounts,
    gross_margin_pct,
    total_ad_spend,
    avg_roas,
    total_leads,
    avg_effectiveness,
    avg_ctr,
    inventory_days,
    cash_days,
    net_margin_pct,
    fixed_vs_total_pct,
    overdue_receivables,
    avg_ticket,
    frozen_capital,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    p_company_id,
    p_year,
    p_week_number,
    v_total_sales,
    v_total_transactions,
    v_avg_lpp,
    v_total_discounts,
    v_gross_margin_pct,
    v_total_ad_spend,
    v_avg_roas,
    v_total_leads,
    v_avg_effectiveness,
    v_avg_ctr,
    v_inventory_days,
    v_cash_days,
    v_net_margin_pct,
    v_fixed_vs_total_pct,
    v_overdue_receivables,
    v_avg_ticket,
    v_frozen_capital,
    now(),
    now()
  )
  ON CONFLICT (company_id, week_number, year) DO UPDATE SET
    total_sales = EXCLUDED.total_sales,
    total_transactions = EXCLUDED.total_transactions,
    avg_lpp = EXCLUDED.avg_lpp,
    total_discounts = EXCLUDED.total_discounts,
    gross_margin_pct = EXCLUDED.gross_margin_pct,
    total_ad_spend = EXCLUDED.total_ad_spend,
    avg_roas = EXCLUDED.avg_roas,
    total_leads = EXCLUDED.total_leads,
    avg_effectiveness = EXCLUDED.avg_effectiveness,
    avg_ctr = EXCLUDED.avg_ctr,
    inventory_days = EXCLUDED.inventory_days,
    cash_days = EXCLUDED.cash_days,
    net_margin_pct = EXCLUDED.net_margin_pct,
    fixed_vs_total_pct = EXCLUDED.fixed_vs_total_pct,
    overdue_receivables = EXCLUDED.overdue_receivables,
    avg_ticket = EXCLUDED.avg_ticket,
    frozen_capital = EXCLUDED.frozen_capital,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_weekly_snapshot(uuid, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_weekly_snapshot(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_weekly_snapshot(uuid, int, int) TO service_role;
