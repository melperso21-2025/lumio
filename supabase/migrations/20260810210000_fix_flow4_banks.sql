-- Fix flujo 4: Bancos — bank_transactions / bank_accounts
--
-- Bugs corregidos:
--   B1: fn_update_bank_balance no filtraba deleted_at IS NULL → saldo incorrecto
--       tras soft-delete de transacciones.
--   B2: Política bank_tx_select redundante (sin filtro deleted_at) convive con
--       bank_transactions_select (correcta). Se elimina la redundante.
--   B3: El DELETE en /api/bank-transactions/[id] era físico; ahora es soft-delete
--       (corregido en la capa API, no requiere cambio de DB).

-- ── B1. fn_update_bank_balance: agregar deleted_at IS NULL ───────────────────

CREATE OR REPLACE FUNCTION public.fn_update_bank_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  acct_id UUID;
BEGIN
  acct_id := COALESCE(NEW.account_id, OLD.account_id);

  UPDATE bank_accounts
     SET current_balance = initial_balance + COALESCE((
           SELECT SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END)
             FROM bank_transactions
            WHERE account_id = acct_id
              AND deleted_at IS NULL
         ), 0)
   WHERE id = acct_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ── B2. Eliminar política SELECT redundante e inconsistente ───────────────────
-- bank_tx_select no filtraba deleted_at IS NULL; bank_transactions_select ya
-- lo hace correctamente. Se mantiene solo la correcta.

DROP POLICY IF EXISTS bank_tx_select ON public.bank_transactions;
