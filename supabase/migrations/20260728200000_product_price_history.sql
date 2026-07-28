-- Historial de precios por producto
-- Captura cada cambio de sale_price, unit_cost o supplier_price

CREATE TABLE IF NOT EXISTS product_price_history (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id      UUID        NOT NULL REFERENCES products(id),
  company_id      UUID        NOT NULL,
  sale_price      NUMERIC(12,4),
  unit_cost       NUMERIC(12,4),
  supplier_price  NUMERIC(12,4),
  changed_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  changed_by      UUID        REFERENCES users(id),
  notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_pph_product_date
  ON product_price_history (product_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_pph_company
  ON product_price_history (company_id);

-- RLS
ALTER TABLE product_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY pph_select ON product_price_history
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY pph_insert ON product_price_history
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
