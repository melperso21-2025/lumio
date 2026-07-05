-- Índices de performance para queries frecuentes del dashboard.
-- Sin estos, cada carga de página hace full table scan filtrado por RLS,
-- lo que se vuelve inaceptable con 10k+ filas por empresa.

-- Sales: filtro por empresa + rango de fechas (query más frecuente del sistema)
CREATE INDEX IF NOT EXISTS idx_sales_company_date
  ON public.sales (company_id, sale_date DESC)
  WHERE deleted_at IS NULL;

-- Sales: filtro por empresa + semana ISO (usado por calculate_weekly_snapshot)
CREATE INDEX IF NOT EXISTS idx_sales_company_week_year
  ON public.sales (company_id, year, week_number)
  WHERE deleted_at IS NULL;

-- Sales: filtro por customer_id (usado en recalculate_sales_totals y detalle de cliente)
CREATE INDEX IF NOT EXISTS idx_sales_customer
  ON public.sales (customer_id)
  WHERE deleted_at IS NULL;

-- Sale items: filtro por sale_id (usado en recalculate y detalle de venta)
CREATE INDEX IF NOT EXISTS idx_sale_items_sale
  ON public.sale_items (sale_id)
  WHERE deleted_at IS NULL;

-- Customers: ordenar por lifetime_value (tabla de clientes)
CREATE INDEX IF NOT EXISTS idx_customers_company_ltv
  ON public.customers (company_id, lifetime_value DESC)
  WHERE deleted_at IS NULL;

-- Customers: búsqueda por nombre/email
CREATE INDEX IF NOT EXISTS idx_customers_company_name
  ON public.customers (company_id, full_name)
  WHERE deleted_at IS NULL;

-- Products: filtro por empresa + activos (inventario y snapshots)
CREATE INDEX IF NOT EXISTS idx_products_company_active
  ON public.products (company_id, is_active)
  WHERE deleted_at IS NULL;

-- Ad campaigns: filtro por empresa + rango de fechas
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_company_date
  ON public.ad_campaigns (company_id, campaign_date DESC)
  WHERE deleted_at IS NULL;

-- Ad campaigns: filtro por empresa + semana ISO (usado por snapshot)
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_company_week_year
  ON public.ad_campaigns (company_id, year, week_number)
  WHERE deleted_at IS NULL;

-- Bank transactions: filtro por empresa + fecha (finanzas y snapshot)
CREATE INDEX IF NOT EXISTS idx_bank_transactions_company_date
  ON public.bank_transactions (company_id, tx_date DESC);

-- Inventory movements: filtro por empresa + fecha
CREATE INDEX IF NOT EXISTS idx_inventory_movements_company_date
  ON public.inventory_movements (company_id, movement_date DESC);

-- Weekly snapshots: lookup por empresa + año + semana (ya existe UNIQUE, pero lo cubrimos)
CREATE INDEX IF NOT EXISTS idx_weekly_snapshots_company_year_week
  ON public.weekly_snapshots (company_id, year DESC, week_number DESC);

-- AI Insights: lookup por empresa + semana + año (página de insights)
CREATE INDEX IF NOT EXISTS idx_ai_insights_company_week_year
  ON public.ai_insights (company_id, year DESC, week_number DESC);
