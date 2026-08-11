-- Contexto del negocio para análisis de IA
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS business_description      text,
  ADD COLUMN IF NOT EXISTS main_customer_type        text CHECK (main_customer_type IN ('b2c','b2b','mixed')),
  ADD COLUMN IF NOT EXISTS avg_monthly_revenue_range text CHECK (avg_monthly_revenue_range IN ('lt5k','5k_20k','20k_100k','gt100k'));

COMMENT ON COLUMN public.companies.business_description IS
  'Descripción libre del negocio usada para contextualizar análisis de IA';
COMMENT ON COLUMN public.companies.main_customer_type IS
  'Tipo de cliente principal: b2c (consumidor final), b2b (otras empresas), mixed';
COMMENT ON COLUMN public.companies.avg_monthly_revenue_range IS
  'Rango de facturación mensual aproximada para calibrar análisis de IA';
