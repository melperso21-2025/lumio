-- Fix flujo 3: CxC — accounts_receivable
--
-- Notas importantes:
--   - accounts_receivable.balance es GENERATED ALWAYS AS (amount - amount_paid)
--     NO debe setearse en ningun UPDATE/INSERT — Postgres lo calcula solo.
--   - accounts_payable.balance tambien es GENERATED ALWAYS — mismo caso.
--
-- Bugs reales:
--   C1: fn_update_ar_from_payment tenia balance = ar_amount - total_paid
--       eso falla en runtime. Revertir a no tocar balance.
--   C2: fn_create_ar_from_sale ON CONFLICT no recalculaba status cuando cambia
--       el monto (ej: venta editada con cobros parciales → status queda mal).
--   M1: RLS receivables_select sin filtro deleted_at IS NULL.

-- ── C1. fn_update_ar_from_payment: remover la linea de balance (es GENERATED) ─

CREATE OR REPLACE FUNCTION public.fn_update_ar_from_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ar_id    uuid;
  total_paid numeric;
  ar_amount  numeric;
BEGIN
  v_ar_id := COALESCE(NEW.ar_id, OLD.ar_id);

  SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM ar_payments WHERE ar_id = v_ar_id;

  SELECT amount INTO ar_amount
    FROM accounts_receivable WHERE id = v_ar_id;

  -- balance es GENERATED ALWAYS AS (amount - amount_paid), no se actualiza aqui
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


-- ── C2. fn_create_ar_from_sale: ON CONFLICT recalcula status ─────────────────
-- balance no se toca (es GENERATED). status debe recalcularse cuando
-- amount cambia para que refleje si ya estaba parcialmente pagada.

CREATE OR REPLACE FUNCTION public.fn_create_ar_from_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  net_amount numeric;
  due_d      date;
BEGIN
  -- Venta cancelada: marcar AR como cancelada
  IF NEW.status = 'cancelled' THEN
    UPDATE accounts_receivable
       SET status = 'cancelled', updated_at = NOW()
     WHERE sale_id = NEW.id AND status NOT IN ('paid', 'cancelled');
    RETURN NEW;
  END IF;

  -- No es credito: si antes era credito (UPDATE), marcar AR como pagada
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

  -- Upsert CxC — ON CONFLICT especifica el predicado del indice parcial
  -- balance no se inserta/actualiza: es GENERATED ALWAYS AS (amount - amount_paid)
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
    -- Recalcular status cuando cambia el monto
    -- balance se recalcula solo (columna GENERATED)
    status      = CASE
      WHEN accounts_receivable.amount_paid >= EXCLUDED.amount THEN 'paid'
      WHEN accounts_receivable.amount_paid > 0                THEN 'partial'
      ELSE 'pending'
    END,
    updated_at  = NOW();

  RETURN NEW;
END;
$$;


-- ── Bonus: fn_create_ap_from_purchase: mismo fix de status en ON CONFLICT ─────
-- Cuando el total de una compra cambia, status en AP debe recalcularse.

CREATE OR REPLACE FUNCTION public.fn_create_ap_from_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  due_d date;
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

  -- balance es GENERATED ALWAYS AS (amount - amount_paid), no se inserta/actualiza
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
    -- Recalcular status cuando cambia el monto
    status      = CASE
      WHEN accounts_payable.amount_paid >= EXCLUDED.amount THEN 'paid'
      WHEN accounts_payable.amount_paid > 0                THEN 'partial'
      ELSE 'pending'
    END,
    updated_at  = NOW();

  RETURN NEW;
END;
$$;


-- ── M1. RLS receivables_select: agregar deleted_at IS NULL ───────────────────

DROP POLICY IF EXISTS receivables_select ON public.accounts_receivable;
CREATE POLICY receivables_select ON public.accounts_receivable
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      (company_id = get_user_company_id() AND get_user_role() = ANY (ARRAY['admin', 'manager']))
      OR is_pulse_admin()
    )
  );
