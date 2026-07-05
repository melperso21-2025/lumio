CREATE OR REPLACE FUNCTION public.recalculate_all_snapshots(p_company_id uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
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
