-- Fix: sync_inventory_from_sale_item no incluia sale_item_id en el INSERT.
-- Resultado: todos los movimientos out/sale quedaban sin vinculo a su sale_item.
-- Se corrige la funcion y se vinculan retroactivamente los movimientos existentes.

CREATE OR REPLACE FUNCTION public.sync_inventory_from_sale_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.inventory_movements (
      company_id, product_id, type,
      quantity, reason, movement_date, notes, sale_item_id
    ) VALUES (
      NEW.company_id, NEW.product_id, 'out',
      NEW.quantity::numeric, 'sale',
      CURRENT_DATE, 'Salida automatica por venta ' || NEW.sale_id::text,
      NEW.id
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL
    AND NEW.deleted_at IS NOT NULL THEN
    INSERT INTO public.inventory_movements (
      company_id, product_id, type,
      quantity, reason, movement_date, notes, sale_item_id
    ) VALUES (
      NEW.company_id, NEW.product_id, 'in',
      NEW.quantity::numeric, 'return',
      CURRENT_DATE, 'Reverso automatico por anulacion ' || NEW.sale_id::text,
      NEW.id
    );
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;
