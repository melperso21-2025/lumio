-- Campo para preservar el ID de origen al importar ventas desde sistemas externos.
-- Permite que sale_items haga match por referencia en lugar del par frágil fecha|email.
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS external_ref text;

COMMENT ON COLUMN public.sales.external_ref IS
  'ID o referencia del sistema externo de origen (ej: V0002-0520). Usado para importación y match de líneas de venta.';

CREATE INDEX IF NOT EXISTS idx_sales_external_ref
  ON public.sales (company_id, external_ref)
  WHERE external_ref IS NOT NULL;
