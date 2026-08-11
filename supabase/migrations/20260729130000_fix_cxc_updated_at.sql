-- =============================================================================
-- FIX: accounts_receivable.updated_at faltante + trigger CxC en INSERT
--
-- Problema raíz: accounts_receivable no tenía columna updated_at.
-- fn_create_ar_from_sale hacía SET updated_at = NOW() → error de PostgreSQL
-- → rollback del INSERT en sale_items (que disparaba la cadena de triggers)
-- → la venta quedaba con gross_total = 0, sin items, sin CxC.
-- El error solo afectaba ventas a crédito porque las de contado/transferencia/tarjeta
-- salían antes de llegar al UPDATE de updated_at.
--
-- Fix:
--   1. Agregar updated_at a accounts_receivable.
--   2. Actualizar fn_create_ar_from_sale para manejar AFTER INSERT (evita crear
--      CxC con monto $0 antes de que el trigger de sale_items calcule el total).
--   3. Recrear trigger como AFTER INSERT OR UPDATE (más robusto).
-- =============================================================================

-- 1. Columna updated_at en accounts_receivable
ALTER TABLE accounts_receivable
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Función corregida
CREATE OR REPLACE FUNCTION fn_create_ar_from_sale()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  net_amount NUMERIC;
  due_d      DATE;
BEGIN
  -- Venta cancelada: marcar AR existente como cancelada
  IF NEW.status = 'cancelled' THEN
    UPDATE accounts_receivable
       SET status = 'cancelled', updated_at = NOW()
     WHERE sale_id = NEW.id AND status NOT IN ('paid', 'cancelled');
    RETURN NEW;
  END IF;

  -- No es crédito: si viene de UPDATE y antes era crédito, marcar AR como pagada
  IF NEW.payment_method <> 'credit' THEN
    IF TG_OP = 'UPDATE' AND OLD.payment_method = 'credit' THEN
      UPDATE accounts_receivable
         SET status = 'paid', updated_at = NOW()
       WHERE sale_id = NEW.id AND status NOT IN ('paid', 'cancelled');
    END IF;
    RETURN NEW;
  END IF;

  -- Venta a crédito con gross_total = 0: esperar a que el trigger de sale_items
  -- actualice el total antes de crear la CxC.
  IF COALESCE(NEW.gross_total, 0) = 0 THEN
    RETURN NEW;
  END IF;

  -- Upsert CxC con el monto correcto
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

-- 3. Recrear trigger: AFTER INSERT OR UPDATE (antes solo AFTER UPDATE)
DROP TRIGGER IF EXISTS tg_create_ar_from_sale ON sales;
CREATE TRIGGER tg_create_ar_from_sale
AFTER INSERT OR UPDATE ON sales
FOR EACH ROW
EXECUTE FUNCTION fn_create_ar_from_sale();
