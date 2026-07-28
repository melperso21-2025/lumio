-- ── bank_transaction_categories ────────────────────────────────────────────
-- Catálogo de categorías de transacciones bancarias por empresa.
-- type: 'income' | 'expense' | 'both'

CREATE TABLE IF NOT EXISTS bank_transaction_categories (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id  uuid        NOT NULL REFERENCES companies(id),
  name        text        NOT NULL,
  type        text        NOT NULL DEFAULT 'both'
                          CHECK (type IN ('income', 'expense', 'both')),
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,
  UNIQUE (company_id, name)
);

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE bank_transaction_categories ENABLE ROW LEVEL SECURITY;

-- Admin y manager pueden leer
CREATE POLICY "btc_select"
  ON bank_transaction_categories FOR SELECT
  USING (
    company_id = get_user_company_id()
    OR is_pulse_admin()
  );

-- Admin y manager pueden crear
CREATE POLICY "btc_insert"
  ON bank_transaction_categories FOR INSERT
  WITH CHECK (
    company_id = get_user_company_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- Solo admin puede soft-delete (UPDATE de deleted_at)
CREATE POLICY "btc_update"
  ON bank_transaction_categories FOR UPDATE
  USING (
    company_id = get_user_company_id()
    AND get_user_role() = 'admin'
  );
