-- ═══════════════════════════════════════════════════════════════════════════════
-- Estandarización de schema v2 — Lumio
-- Tablas restantes detectadas en auditoría post-migración 20260810130000
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── bank_transactions — agregar updated_at y deleted_at ──────────────────────
-- El trigger tg_update_bank_balance (AFTER INSERT/UPDATE/DELETE) sigue intacto.

ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz;

DROP TRIGGER IF EXISTS tg_set_updated_at ON public.bank_transactions;
CREATE TRIGGER tg_set_updated_at
  BEFORE UPDATE ON public.bank_transactions
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- Actualizar RLS para filtrar deleted_at en selects (ahora que existe la columna)
DROP POLICY IF EXISTS bank_transactions_select ON public.bank_transactions;
CREATE POLICY bank_transactions_select ON public.bank_transactions
  FOR SELECT USING (company_id = get_user_company_id() AND deleted_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_company_active
  ON public.bank_transactions (company_id, tx_date DESC)
  WHERE deleted_at IS NULL;


-- ── sale_items — agregar updated_at ──────────────────────────────────────────
-- Ya tiene deleted_at. El trigger tg_sync_inventory_from_sale_item sigue intacto.

ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS tg_set_updated_at ON public.sale_items;
CREATE TRIGGER tg_set_updated_at
  BEFORE UPDATE ON public.sale_items
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


-- ── customer_labels — agregar updated_at ─────────────────────────────────────
-- Ya tiene deleted_at.

ALTER TABLE public.customer_labels
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS tg_set_updated_at ON public.customer_labels;
CREATE TRIGGER tg_set_updated_at
  BEFORE UPDATE ON public.customer_labels
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


-- ── customer_types — agregar updated_at ──────────────────────────────────────
-- Ya tiene deleted_at.

ALTER TABLE public.customer_types
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS tg_set_updated_at ON public.customer_types;
CREATE TRIGGER tg_set_updated_at
  BEFORE UPDATE ON public.customer_types
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


-- ── import_logs — agregar updated_at y deleted_at ────────────────────────────
-- Tabla de auditoría de imports. Se marca como deleted en rollbacks
-- solo el log en sí, no los datos importados.

ALTER TABLE public.import_logs
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz;

DROP TRIGGER IF EXISTS tg_set_updated_at ON public.import_logs;
CREATE TRIGGER tg_set_updated_at
  BEFORE UPDATE ON public.import_logs
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


-- ── ai_insights — agregar deleted_at ─────────────────────────────────────────
-- Ya tiene updated_at.

ALTER TABLE public.ai_insights
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz;

DROP TRIGGER IF EXISTS tg_set_updated_at ON public.ai_insights;
CREATE TRIGGER tg_set_updated_at
  BEFORE UPDATE ON public.ai_insights
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


-- ── pulse_metrics — agregar deleted_at ───────────────────────────────────────
-- Ya tiene updated_at.

ALTER TABLE public.pulse_metrics
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz;

DROP TRIGGER IF EXISTS tg_set_updated_at ON public.pulse_metrics;
CREATE TRIGGER tg_set_updated_at
  BEFORE UPDATE ON public.pulse_metrics
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


-- ── Índices adicionales ───────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_customer_labels_company
  ON public.customer_labels (company_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customer_types_company
  ON public.customer_types (company_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ai_insights_company
  ON public.ai_insights (company_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_import_logs_company
  ON public.import_logs (company_id)
  WHERE deleted_at IS NULL;
