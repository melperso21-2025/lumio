-- ═══════════════════════════════════════════════════════════════════════════════
-- Estandarización de schema — Lumio
-- Referencia: docs/standards/DATABASE.md
--
-- Cambios:
--   1. Función universal fn_set_updated_at()
--   2. Agregar updated_at a tablas que lo faltan
--   3. Agregar deleted_at a tablas que lo faltan
--   4. Triggers tg_set_updated_at en todas las tablas con updated_at
--   5. Eliminar trigger redundante tg_update_customer_stats en sales
--   6. NOT NULL + DEFAULT en columnas de tiempo existentes sin restricción
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── 1. Función universal para updated_at ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_set_updated_at() IS
  'Trigger universal: actualiza updated_at = now() antes de cada UPDATE.';


-- ── 2. ar_payments — agregar updated_at y deleted_at ─────────────────────────

ALTER TABLE public.ar_payments
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz;

CREATE INDEX IF NOT EXISTS idx_ar_payments_company
  ON public.ar_payments (company_id)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS tg_set_updated_at ON public.ar_payments;
CREATE TRIGGER tg_set_updated_at
  BEFORE UPDATE ON public.ar_payments
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


-- ── 3. ap_payments — agregar updated_at y deleted_at ─────────────────────────

ALTER TABLE public.ap_payments
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz;

CREATE INDEX IF NOT EXISTS idx_ap_payments_company
  ON public.ap_payments (company_id)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS tg_set_updated_at ON public.ap_payments;
CREATE TRIGGER tg_set_updated_at
  BEFORE UPDATE ON public.ap_payments
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


-- ── 4. purchase_items — agregar updated_at y deleted_at ──────────────────────
-- Nota: subtotal es GENERATED ALWAYS — no afecta el trigger de updated_at

ALTER TABLE public.purchase_items
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz;

DROP TRIGGER IF EXISTS tg_set_updated_at ON public.purchase_items;
CREATE TRIGGER tg_set_updated_at
  BEFORE UPDATE ON public.purchase_items
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


-- ── 5. user_company_memberships — agregar updated_at y deleted_at ─────────────

ALTER TABLE public.user_company_memberships
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz;

DROP TRIGGER IF EXISTS tg_set_updated_at ON public.user_company_memberships;
CREATE TRIGGER tg_set_updated_at
  BEFORE UPDATE ON public.user_company_memberships
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


-- ── 6. bank_transaction_categories — agregar updated_at ──────────────────────
-- Ya tiene deleted_at

ALTER TABLE public.bank_transaction_categories
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS tg_set_updated_at ON public.bank_transaction_categories;
CREATE TRIGGER tg_set_updated_at
  BEFORE UPDATE ON public.bank_transaction_categories
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


-- ── 7. insight_requests — agregar deleted_at ─────────────────────────────────
-- Ya tiene updated_at

ALTER TABLE public.insight_requests
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz;

-- Agregar trigger de updated_at si no existe
DROP TRIGGER IF EXISTS tg_set_updated_at ON public.insight_requests;
CREATE TRIGGER tg_set_updated_at
  BEFORE UPDATE ON public.insight_requests
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


-- ── 8. ai_module_insights — agregar deleted_at ───────────────────────────────
-- No tiene ni updated_at ni deleted_at según migration 20260728220000

ALTER TABLE public.ai_module_insights
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz;

DROP TRIGGER IF EXISTS tg_set_updated_at ON public.ai_module_insights;
CREATE TRIGGER tg_set_updated_at
  BEFORE UPDATE ON public.ai_module_insights
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


-- ── 9. playbook_actions — agregar deleted_at ─────────────────────────────────
-- Ya tiene updated_at

ALTER TABLE public.playbook_actions
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz;

DROP TRIGGER IF EXISTS tg_set_updated_at ON public.playbook_actions;
CREATE TRIGGER tg_set_updated_at
  BEFORE UPDATE ON public.playbook_actions
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


-- ── 10. branches — agregar updated_at ────────────────────────────────────────
-- Ya tiene deleted_at

ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS tg_set_updated_at ON public.branches;
CREATE TRIGGER tg_set_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


-- ── 11. sale_statuses — agregar updated_at ───────────────────────────────────
-- Ya tiene deleted_at

ALTER TABLE public.sale_statuses
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS tg_set_updated_at ON public.sale_statuses;
CREATE TRIGGER tg_set_updated_at
  BEFORE UPDATE ON public.sale_statuses
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


-- ── 12. Triggers universales en tablas que YA tienen updated_at ──────────────
-- Reemplazar actualizaciones manuales de updated_at por el trigger universal.
-- Las funciones de trigger existentes seguirán funcionando; el trigger de
-- updated_at corre BEFORE UPDATE y no interfiere con los triggers AFTER.

DROP TRIGGER IF EXISTS tg_set_updated_at ON public.sales;
CREATE TRIGGER tg_set_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS tg_set_updated_at ON public.customers;
CREATE TRIGGER tg_set_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS tg_set_updated_at ON public.products;
CREATE TRIGGER tg_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS tg_set_updated_at ON public.suppliers;
CREATE TRIGGER tg_set_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS tg_set_updated_at ON public.purchases;
CREATE TRIGGER tg_set_updated_at
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS tg_set_updated_at ON public.accounts_receivable;
CREATE TRIGGER tg_set_updated_at
  BEFORE UPDATE ON public.accounts_receivable
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS tg_set_updated_at ON public.accounts_payable;
CREATE TRIGGER tg_set_updated_at
  BEFORE UPDATE ON public.accounts_payable
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS tg_set_updated_at ON public.weekly_snapshots;
CREATE TRIGGER tg_set_updated_at
  BEFORE UPDATE ON public.weekly_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


-- ── 13. Eliminar trigger redundante en sales ─────────────────────────────────
-- tg_update_customer_stats usa update_customer_stats() (vieja función sin total_orders).
-- Los triggers tg_ltv_on_sale_insert/update/delete (migration 20260727130000)
-- hacen lo mismo con tg_recalculate_customer_ltv() que SÍ incluye total_orders.

DROP TRIGGER IF EXISTS tg_update_customer_stats ON public.sales;


-- ── 14. Índice base en tablas sin índice por company_id ───────────────────────

CREATE INDEX IF NOT EXISTS idx_bank_transaction_categories_company
  ON public.bank_transaction_categories (company_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_insight_requests_company
  ON public.insight_requests (company_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_company_memberships_company
  ON public.user_company_memberships (company_id);

CREATE INDEX IF NOT EXISTS idx_ai_module_insights_company
  ON public.ai_module_insights (company_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_playbook_actions_company
  ON public.playbook_actions (company_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_items_company
  ON public.purchase_items (company_id)
  WHERE deleted_at IS NULL;
