-- ── Extended fields for suppliers ──────────────────────────────────────────
-- Adds persona natural support, identification, and banking information.

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS first_name    text,
  ADD COLUMN IF NOT EXISTS last_name     text,
  ADD COLUMN IF NOT EXISTS is_company    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS id_type       text CHECK (id_type IN ('cedula', 'ruc', 'pasaporte')),
  ADD COLUMN IF NOT EXISTS tax_id        text,
  ADD COLUMN IF NOT EXISTS address       text,
  ADD COLUMN IF NOT EXISTS bank_name     text,
  ADD COLUMN IF NOT EXISTS bank_account  text,
  ADD COLUMN IF NOT EXISTS account_type  text CHECK (account_type IN ('savings', 'checking')),
  ADD COLUMN IF NOT EXISTS bank_tax_id   text;
