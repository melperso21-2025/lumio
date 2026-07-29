-- =============================================================================
-- FIX: ON CONFLICT con índice parcial en accounts_receivable y accounts_payable
--
-- El bug real de CxC/CxP:
--   Los índices únicos son PARCIALES (WHERE sale_id IS NOT NULL /
--   WHERE purchase_id IS NOT NULL). PostgreSQL NO puede inferir un índice
--   parcial a partir de `ON CONFLICT (columna)` solo — necesita que el
--   predicado esté explícito en la cláusula de conflicto.
--   Sin él, PostgreSQL lanza:
--     "there is no unique or exclusion constraint matching the ON CONFLICT spec"
--   Ese error propaga hacia arriba y revierte el INSERT en sale_items,
--   dejando la venta con gross_total = 0 y sin CxC.
-- =============================================================================

-- ── AR: agregar WHERE al ON CONFLICT ────────────────────────────────────────

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

  -- No es crédito: si antes era crédito (UPDATE), marcar AR como pagada
  IF NEW.payment_method <> 'credit' THEN
    IF TG_OP = 'UPDATE' AND OLD.payment_method = 'credit' THEN
      UPDATE accounts_receivable
         SET status = 'paid', updated_at = NOW()
       WHERE sale_id = NEW.id AND status NOT IN ('paid', 'cancelled');
    END IF;
    RETURN NEW;
  END IF;

  -- gross_total = 0 en INSERT inicial: esperar al trigger de sale_items
  IF COALESCE(NEW.gross_total, 0) = 0 THEN
    RETURN NEW;
  END IF;

  -- Upsert CxC — ON CONFLICT especifica el predicado del índice parcial
  net_amount := GREATEST(0, COALESCE(NEW.gross_total, 0) - COALESCE(NEW.discount_amount, 0));
  due_d      := NEW.sale_date + (COALESCE(NEW.credit_days, 30) || ' days')::INTERVAL;

  INSERT INTO accounts_receivable (
    company_id, sale_id, customer_id,
    amount, issue_date, due_date, status
  ) VALUES (
    NEW.company_id, NEW.id, NEW.customer_id,
    net_amount, NEW.sale_date, due_d, 'pending'
  )
  ON CONFLICT (sale_id) WHERE sale_id IS NOT NULL
  DO UPDATE SET
    amount      = EXCLUDED.amount,
    customer_id = EXCLUDED.customer_id,
    due_date    = EXCLUDED.due_date,
    updated_at  = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_create_ar_from_sale ON sales;
CREATE TRIGGER tg_create_ar_from_sale
AFTER INSERT OR UPDATE ON sales
FOR EACH ROW
EXECUTE FUNCTION fn_create_ar_from_sale();


-- ── AP: mismo fix para fn_create_ap_from_purchase ───────────────────────────

CREATE OR REPLACE FUNCTION fn_create_ap_from_purchase()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  due_d DATE;
BEGIN
  IF NEW.status = 'cancelled' THEN
    UPDATE accounts_payable
       SET status = 'paid', updated_at = NOW()
     WHERE purchase_id = NEW.id AND status NOT IN ('paid');
    RETURN NEW;
  END IF;

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
  ON CONFLICT (purchase_id) WHERE purchase_id IS NOT NULL
  DO UPDATE SET
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
