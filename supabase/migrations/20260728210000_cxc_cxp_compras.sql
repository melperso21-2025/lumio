-- =============================================================================
-- MIGRACIÓN: CxC, CxP y Módulo de Compras
-- Fecha: 2026-07-28
--
-- 1. Modificar sales: payment_method, credit_days
-- 2. Modificar accounts_receivable: sale_id, amount_paid, paid_at, balance
-- 3. Nueva tabla ar_payments (cobros parciales en CxC)
-- 4. Nueva tabla purchases (compras a proveedores)
-- 5. Nueva tabla purchase_items (líneas de compra)
-- 6. Nueva tabla accounts_payable (CxP)
-- 7. Nueva tabla ap_payments (pagos parciales en CxP)
-- 8. Triggers automáticos: AR desde ventas, AP desde compras,
--    stock desde purchase_items, totales de compra
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. VENTAS — método de pago y plazo de crédito
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS credit_days    INT  NOT NULL DEFAULT 30;

ALTER TABLE sales
  DROP CONSTRAINT IF EXISTS sales_payment_method_check;
ALTER TABLE sales
  ADD CONSTRAINT sales_payment_method_check
  CHECK (payment_method IN ('cash', 'credit', 'transfer', 'card'));


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ACCOUNTS_RECEIVABLE — extender para pagos parciales y vínculo a venta
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE accounts_receivable
  ADD COLUMN IF NOT EXISTS sale_id     UUID REFERENCES sales(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_at     DATE;

-- balance calculado automáticamente
ALTER TABLE accounts_receivable
  ADD COLUMN IF NOT EXISTS balance NUMERIC(12,4)
  GENERATED ALWAYS AS (amount - amount_paid) STORED;

-- índice único para el upsert sale→AR
CREATE UNIQUE INDEX IF NOT EXISTS idx_ar_sale_id
  ON accounts_receivable(sale_id)
  WHERE sale_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ar_company_status
  ON accounts_receivable(company_id, status);
CREATE INDEX IF NOT EXISTS idx_ar_due_date
  ON accounts_receivable(due_date);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. AR_PAYMENTS — historial de cobros
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ar_payments (
  id             UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id     UUID          NOT NULL REFERENCES companies(id),
  ar_id          UUID          NOT NULL REFERENCES accounts_receivable(id) ON DELETE CASCADE,
  payment_date   DATE          NOT NULL DEFAULT CURRENT_DATE,
  amount         NUMERIC(12,4) NOT NULL CHECK (amount > 0),
  payment_method TEXT          NOT NULL DEFAULT 'transfer'
                               CHECK (payment_method IN ('cash', 'transfer', 'card', 'check')),
  notes          TEXT,
  created_at     TIMESTAMPTZ   DEFAULT NOW(),
  created_by     UUID          REFERENCES users(id)
);

ALTER TABLE ar_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY ar_payments_select ON ar_payments FOR SELECT
  USING (company_id = get_user_company_id());
CREATE POLICY ar_payments_insert ON ar_payments FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE INDEX IF NOT EXISTS idx_ar_payments_ar ON ar_payments(ar_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. PURCHASES — compras a proveedores
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS purchases (
  id             UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id     UUID          NOT NULL REFERENCES companies(id),
  supplier_id    UUID          REFERENCES suppliers(id) ON DELETE SET NULL,
  purchase_date  DATE          NOT NULL DEFAULT CURRENT_DATE,
  invoice_ref    TEXT,
  subtotal       NUMERIC(12,4) NOT NULL DEFAULT 0,
  tax_amount     NUMERIC(12,4) NOT NULL DEFAULT 0,
  total          NUMERIC(12,4) NOT NULL DEFAULT 0,
  payment_method TEXT          NOT NULL DEFAULT 'cash'
                               CHECK (payment_method IN ('cash', 'credit', 'transfer', 'card')),
  credit_days    INT           NOT NULL DEFAULT 30,
  status         TEXT          NOT NULL DEFAULT 'received'
                               CHECK (status IN ('received', 'cancelled')),
  notes          TEXT,
  created_at     TIMESTAMPTZ   DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   DEFAULT NOW(),
  created_by     UUID          REFERENCES users(id),
  deleted_at     TIMESTAMPTZ
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY purchases_select ON purchases FOR SELECT
  USING (company_id = get_user_company_id());
CREATE POLICY purchases_insert ON purchases FOR INSERT
  WITH CHECK (company_id = get_user_company_id());
CREATE POLICY purchases_update ON purchases FOR UPDATE
  USING (company_id = get_user_company_id());

CREATE INDEX IF NOT EXISTS idx_purchases_company_date
  ON purchases(company_id, purchase_date DESC)
  WHERE deleted_at IS NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. PURCHASE_ITEMS — líneas de cada compra
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS purchase_items (
  id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id  UUID          NOT NULL REFERENCES companies(id),
  purchase_id UUID          NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id  UUID          REFERENCES products(id) ON DELETE SET NULL,
  description TEXT,
  quantity    NUMERIC(12,4) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_cost   NUMERIC(12,4) NOT NULL DEFAULT 0,
  subtotal    NUMERIC(12,4) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY purchase_items_select ON purchase_items FOR SELECT
  USING (company_id = get_user_company_id());
CREATE POLICY purchase_items_insert ON purchase_items FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase
  ON purchase_items(purchase_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ACCOUNTS_PAYABLE — CxP ligada a compra
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS accounts_payable (
  id           UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id   UUID          NOT NULL REFERENCES companies(id),
  supplier_id  UUID          REFERENCES suppliers(id) ON DELETE SET NULL,
  purchase_id  UUID          REFERENCES purchases(id) ON DELETE SET NULL,
  amount       NUMERIC(12,4) NOT NULL,
  amount_paid  NUMERIC(12,4) NOT NULL DEFAULT 0,
  balance      NUMERIC(12,4) GENERATED ALWAYS AS (amount - amount_paid) STORED,
  issue_date   DATE          NOT NULL DEFAULT CURRENT_DATE,
  due_date     DATE          NOT NULL,
  status       TEXT          NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'partial', 'paid', 'overdue')),
  notes        TEXT,
  created_at   TIMESTAMPTZ   DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

ALTER TABLE accounts_payable ENABLE ROW LEVEL SECURITY;

CREATE POLICY ap_select ON accounts_payable FOR SELECT
  USING (company_id = get_user_company_id());
CREATE POLICY ap_insert ON accounts_payable FOR INSERT
  WITH CHECK (company_id = get_user_company_id());
CREATE POLICY ap_update ON accounts_payable FOR UPDATE
  USING (company_id = get_user_company_id());

-- índice único para el upsert purchase→AP
CREATE UNIQUE INDEX IF NOT EXISTS idx_ap_purchase_id
  ON accounts_payable(purchase_id)
  WHERE purchase_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ap_company_status
  ON accounts_payable(company_id, status);
CREATE INDEX IF NOT EXISTS idx_ap_due_date
  ON accounts_payable(due_date);


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. AP_PAYMENTS — historial de pagos a proveedores
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ap_payments (
  id             UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id     UUID          NOT NULL REFERENCES companies(id),
  ap_id          UUID          NOT NULL REFERENCES accounts_payable(id) ON DELETE CASCADE,
  payment_date   DATE          NOT NULL DEFAULT CURRENT_DATE,
  amount         NUMERIC(12,4) NOT NULL CHECK (amount > 0),
  payment_method TEXT          NOT NULL DEFAULT 'transfer'
                               CHECK (payment_method IN ('cash', 'transfer', 'card', 'check')),
  notes          TEXT,
  created_at     TIMESTAMPTZ   DEFAULT NOW(),
  created_by     UUID          REFERENCES users(id)
);

ALTER TABLE ap_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY ap_payments_select ON ap_payments FOR SELECT
  USING (company_id = get_user_company_id());
CREATE POLICY ap_payments_insert ON ap_payments FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE INDEX IF NOT EXISTS idx_ap_payments_ap ON ap_payments(ap_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 8-A. TRIGGER: venta a crédito → crear/actualizar accounts_receivable
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_create_ar_from_sale()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  net_amount NUMERIC;
  due_d      DATE;
BEGIN
  -- Venta cancelada: marcar AR como cancelada
  IF NEW.status = 'cancelled' THEN
    UPDATE accounts_receivable
       SET status = 'cancelled', updated_at = NOW()
     WHERE sale_id = NEW.id AND status NOT IN ('paid', 'cancelled');
    RETURN NEW;
  END IF;

  -- No es crédito: si antes era crédito, marcar AR como pagada (contado)
  IF NEW.payment_method <> 'credit' THEN
    IF OLD.payment_method = 'credit' THEN
      UPDATE accounts_receivable
         SET status = 'paid', updated_at = NOW()
       WHERE sale_id = NEW.id AND status NOT IN ('paid', 'cancelled');
    END IF;
    RETURN NEW;
  END IF;

  -- Venta a crédito: upsert AR con el monto actualizado
  net_amount := GREATEST(0, COALESCE(NEW.gross_total, 0) - COALESCE(NEW.discount_amount, 0));
  due_d      := NEW.sale_date + (COALESCE(NEW.credit_days, 30) || ' days')::INTERVAL;

  INSERT INTO accounts_receivable (
    company_id, sale_id, customer_id,
    amount, issue_date, due_date, status
  ) VALUES (
    NEW.company_id, NEW.id, NEW.customer_id,
    net_amount, NEW.sale_date, due_d, 'pending'
  )
  ON CONFLICT (sale_id) DO UPDATE SET
    amount      = EXCLUDED.amount,
    customer_id = EXCLUDED.customer_id,
    due_date    = EXCLUDED.due_date,
    updated_at  = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_create_ar_from_sale ON sales;
CREATE TRIGGER tg_create_ar_from_sale
AFTER UPDATE ON sales
FOR EACH ROW
WHEN (
  NEW.gross_total      IS DISTINCT FROM OLD.gross_total      OR
  NEW.payment_method   IS DISTINCT FROM OLD.payment_method   OR
  NEW.credit_days      IS DISTINCT FROM OLD.credit_days      OR
  NEW.status           IS DISTINCT FROM OLD.status           OR
  NEW.customer_id      IS DISTINCT FROM OLD.customer_id
)
EXECUTE FUNCTION fn_create_ar_from_sale();


-- ─────────────────────────────────────────────────────────────────────────────
-- 8-B. TRIGGER: ar_payments → actualizar amount_paid y status en AR
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_update_ar_from_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ar_id    UUID;
  total_paid NUMERIC;
  ar_amount  NUMERIC;
BEGIN
  v_ar_id := COALESCE(NEW.ar_id, OLD.ar_id);

  SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM ar_payments WHERE ar_id = v_ar_id;

  SELECT amount INTO ar_amount
    FROM accounts_receivable WHERE id = v_ar_id;

  UPDATE accounts_receivable SET
    amount_paid = total_paid,
    status = CASE
      WHEN total_paid >= ar_amount THEN 'paid'
      WHEN total_paid > 0          THEN 'partial'
      ELSE                              'pending'
    END,
    paid_at    = CASE WHEN total_paid >= ar_amount THEN CURRENT_DATE ELSE NULL END,
    updated_at = NOW()
  WHERE id = v_ar_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tg_update_ar_from_payment ON ar_payments;
CREATE TRIGGER tg_update_ar_from_payment
AFTER INSERT OR UPDATE OR DELETE ON ar_payments
FOR EACH ROW
EXECUTE FUNCTION fn_update_ar_from_payment();


-- ─────────────────────────────────────────────────────────────────────────────
-- 8-C. TRIGGER: compra a crédito → crear/actualizar accounts_payable
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_create_ap_from_purchase()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  due_d DATE;
BEGIN
  -- Compra cancelada: marcar AP como pagada
  IF NEW.status = 'cancelled' THEN
    UPDATE accounts_payable
       SET status = 'paid', updated_at = NOW()
     WHERE purchase_id = NEW.id AND status NOT IN ('paid');
    RETURN NEW;
  END IF;

  -- No es crédito: ignorar
  IF NEW.payment_method <> 'credit' THEN
    RETURN NEW;
  END IF;

  due_d := NEW.purchase_date + (COALESCE(NEW.credit_days, 30) || ' days')::INTERVAL;

  INSERT INTO accounts_payable (
    company_id, supplier_id, purchase_id,
    amount, issue_date, due_date, status
  ) VALUES (
    NEW.company_id, NEW.supplier_id, NEW.id,
    NEW.total, NEW.purchase_date, due_d, 'pending'
  )
  ON CONFLICT (purchase_id) DO UPDATE SET
    amount      = EXCLUDED.amount,
    supplier_id = EXCLUDED.supplier_id,
    due_date    = EXCLUDED.due_date,
    updated_at  = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_create_ap_from_purchase ON purchases;
CREATE TRIGGER tg_create_ap_from_purchase
AFTER INSERT OR UPDATE ON purchases
FOR EACH ROW
EXECUTE FUNCTION fn_create_ap_from_purchase();


-- ─────────────────────────────────────────────────────────────────────────────
-- 8-D. TRIGGER: ap_payments → actualizar amount_paid y status en AP
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_update_ap_from_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ap_id    UUID;
  total_paid NUMERIC;
  ap_amount  NUMERIC;
BEGIN
  v_ap_id := COALESCE(NEW.ap_id, OLD.ap_id);

  SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM ap_payments WHERE ap_id = v_ap_id;

  SELECT amount INTO ap_amount
    FROM accounts_payable WHERE id = v_ap_id;

  UPDATE accounts_payable SET
    amount_paid = total_paid,
    status = CASE
      WHEN total_paid >= ap_amount THEN 'paid'
      WHEN total_paid > 0          THEN 'partial'
      ELSE                              'pending'
    END,
    updated_at = NOW()
  WHERE id = v_ap_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tg_update_ap_from_payment ON ap_payments;
CREATE TRIGGER tg_update_ap_from_payment
AFTER INSERT OR UPDATE OR DELETE ON ap_payments
FOR EACH ROW
EXECUTE FUNCTION fn_update_ap_from_payment();


-- ─────────────────────────────────────────────────────────────────────────────
-- 8-E. TRIGGER: purchase_items → inventory_movement (type = in / purchase)
-- ─────────────────────────────────────────────────────────────────────────────

-- Agregar columna purchase_item_id a inventory_movements
ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS purchase_item_id UUID
  REFERENCES purchase_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inv_mov_purchase_item
  ON inventory_movements(purchase_item_id)
  WHERE purchase_item_id IS NOT NULL;


CREATE OR REPLACE FUNCTION fn_sync_inventory_from_purchase_item()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.product_id IS NOT NULL THEN
    INSERT INTO inventory_movements (
      company_id, product_id, type, quantity,
      reason, movement_date, notes, purchase_item_id
    ) VALUES (
      NEW.company_id, NEW.product_id, 'in', NEW.quantity,
      'purchase', NOW(), 'Compra automática desde purchase_item', NEW.id
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' AND OLD.product_id IS NOT NULL THEN
    DELETE FROM inventory_movements
     WHERE purchase_item_id = OLD.id AND type = 'in' AND reason = 'purchase';
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.product_id IS NOT NULL
     AND NEW.quantity IS DISTINCT FROM OLD.quantity THEN
    UPDATE inventory_movements
       SET quantity = NEW.quantity, updated_at = NOW()
     WHERE purchase_item_id = NEW.id AND type = 'in' AND reason = 'purchase';
    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tg_sync_inventory_from_purchase_item ON purchase_items;
CREATE TRIGGER tg_sync_inventory_from_purchase_item
AFTER INSERT OR UPDATE OR DELETE ON purchase_items
FOR EACH ROW
EXECUTE FUNCTION fn_sync_inventory_from_purchase_item();


-- ─────────────────────────────────────────────────────────────────────────────
-- 8-F. TRIGGER: purchase_items → recalcular totales en purchases
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_recalculate_purchase_totals()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pid      UUID;
  sub_val  NUMERIC;
  tax_val  NUMERIC;
BEGIN
  pid := COALESCE(NEW.purchase_id, OLD.purchase_id);

  SELECT COALESCE(SUM(quantity * unit_cost), 0) INTO sub_val
    FROM purchase_items WHERE purchase_id = pid;

  SELECT COALESCE(tax_amount, 0) INTO tax_val
    FROM purchases WHERE id = pid;

  UPDATE purchases
     SET subtotal   = sub_val,
         total      = sub_val + tax_val,
         updated_at = NOW()
   WHERE id = pid;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tg_recalculate_purchase_totals ON purchase_items;
CREATE TRIGGER tg_recalculate_purchase_totals
AFTER INSERT OR UPDATE OR DELETE ON purchase_items
FOR EACH ROW
EXECUTE FUNCTION fn_recalculate_purchase_totals();
