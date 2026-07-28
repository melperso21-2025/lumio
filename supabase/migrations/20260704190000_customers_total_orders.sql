-- Agrega columna total_orders a customers para contar ventas por cliente.
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS total_orders integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.customers.total_orders IS
  'Número de ventas activas (no canceladas) del cliente. Calculado por recalculate_sales_totals.';
