-- =============================================================================
-- FIX: Trigger para actualizar bank_accounts.current_balance
-- Problema: no existía trigger → el saldo de cuentas nunca se actualizaba
--           al registrar ingresos/egresos desde NewTransactionForm.
-- Solución: trigger AFTER INSERT/UPDATE/DELETE en bank_transactions que
--           recalcula current_balance = initial_balance + Σ(income) - Σ(expense).
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_update_bank_balance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  acct_id UUID;
BEGIN
  acct_id := COALESCE(NEW.account_id, OLD.account_id);

  UPDATE bank_accounts
     SET current_balance = initial_balance + COALESCE((
           SELECT SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END)
             FROM bank_transactions
            WHERE account_id = acct_id
         ), 0)
   WHERE id = acct_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tg_update_bank_balance ON bank_transactions;
CREATE TRIGGER tg_update_bank_balance
AFTER INSERT OR UPDATE OR DELETE ON bank_transactions
FOR EACH ROW
EXECUTE FUNCTION fn_update_bank_balance();

-- Resync inmediato: corregir saldos con transacciones ya existentes
UPDATE bank_accounts ba
   SET current_balance = ba.initial_balance + COALESCE((
         SELECT SUM(CASE WHEN bt.type = 'income' THEN bt.amount ELSE -bt.amount END)
           FROM bank_transactions bt
          WHERE bt.account_id = ba.id
       ), 0);
