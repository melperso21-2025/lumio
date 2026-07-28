-- Recalcula lifetime_value y last_purchase_at en customers desde todas las ventas activas.
-- Idempotente: siempre suma desde cero (mismo patrón que stock / saldos bancarios).

CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_target uuid;
BEGIN
  -- DELETE: solo el cliente que tenía la venta (OLD)
  IF TG_OP = 'DELETE' THEN
    IF OLD.customer_id IS NOT NULL THEN
      UPDATE customers
      SET
        lifetime_value = COALESCE(
          (
            SELECT SUM(s.gross_total)
            FROM sales s
            WHERE s.customer_id = OLD.customer_id
              AND s.deleted_at IS NULL
              AND s.status IS DISTINCT FROM 'cancelled'
          ),
          0
        ),
        last_purchase_at = (
          SELECT MAX(s.sale_date)
          FROM sales s
          WHERE s.customer_id = OLD.customer_id
            AND s.deleted_at IS NULL
            AND s.status IS DISTINCT FROM 'cancelled'
        ),
        updated_at = now()
      WHERE id = OLD.customer_id;
    END IF;
    RETURN OLD;
  END IF;

  -- INSERT / UPDATE: si cambió el cliente, recalcular el anterior
  IF TG_OP = 'UPDATE' THEN
    IF OLD.customer_id IS NOT NULL
       AND OLD.customer_id IS DISTINCT FROM NEW.customer_id THEN
      v_target := OLD.customer_id;
      UPDATE customers
      SET
        lifetime_value = COALESCE(
          (
            SELECT SUM(s.gross_total)
            FROM sales s
            WHERE s.customer_id = v_target
              AND s.deleted_at IS NULL
              AND s.status IS DISTINCT FROM 'cancelled'
          ),
          0
        ),
        last_purchase_at = (
          SELECT MAX(s.sale_date)
          FROM sales s
          WHERE s.customer_id = v_target
            AND s.deleted_at IS NULL
            AND s.status IS DISTINCT FROM 'cancelled'
        ),
        updated_at = now()
      WHERE id = v_target;
    END IF;
  END IF;

  -- Cliente actual de la venta (INSERT o UPDATE)
  IF NEW.customer_id IS NOT NULL THEN
    v_target := NEW.customer_id;
    UPDATE customers
    SET
      lifetime_value = COALESCE(
        (
          SELECT SUM(s.gross_total)
          FROM sales s
          WHERE s.customer_id = v_target
            AND s.deleted_at IS NULL
            AND s.status IS DISTINCT FROM 'cancelled'
        ),
        0
      ),
      last_purchase_at = (
        SELECT MAX(s.sale_date)
        FROM sales s
        WHERE s.customer_id = v_target
          AND s.deleted_at IS NULL
          AND s.status IS DISTINCT FROM 'cancelled'
      ),
      updated_at = now()
    WHERE id = v_target;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_customer_stats() IS
  'Mantiene lifetime_value y last_purchase_at en customers recalculando desde sales (sin deltas).';

-- Se dispara en alta, baja lógica (deleted_at), cambio de importes/fecha/estado/cliente
DROP TRIGGER IF EXISTS tg_update_customer_stats ON sales;

CREATE TRIGGER tg_update_customer_stats
AFTER INSERT
   OR DELETE
   OR UPDATE OF gross_total, sale_date, status, deleted_at, customer_id
  ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_stats();

COMMENT ON TRIGGER tg_update_customer_stats ON sales IS
  'Recalcula agregados del cliente tras cambios en ventas (incl. soft delete).';
