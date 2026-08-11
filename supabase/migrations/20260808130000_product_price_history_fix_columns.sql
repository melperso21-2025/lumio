-- Los triggers insert_initial_price y track_price_change usan effective_from,
-- effective_to y changed_by_user_id, pero la tabla solo tenía changed_at y changed_by.
-- Agregamos las columnas faltantes para alinear tabla con triggers.

ALTER TABLE product_price_history
  ADD COLUMN IF NOT EXISTS effective_from     DATE,
  ADD COLUMN IF NOT EXISTS effective_to       DATE,
  ADD COLUMN IF NOT EXISTS changed_by_user_id UUID REFERENCES users(id);

-- Backfill effective_from para registros existentes
UPDATE product_price_history
SET effective_from = changed_at::date
WHERE effective_from IS NULL;
