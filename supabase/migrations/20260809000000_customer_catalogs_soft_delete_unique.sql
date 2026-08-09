-- Reemplazar unique constraints por índices parciales para soportar soft-delete.
-- Permite eliminar y volver a crear un tipo/etiqueta con el mismo nombre.

-- customer_types
ALTER TABLE customer_types DROP CONSTRAINT IF EXISTS customer_types_company_id_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS customer_types_company_id_name_key
  ON customer_types (company_id, name)
  WHERE deleted_at IS NULL;

-- customer_labels
ALTER TABLE customer_labels DROP CONSTRAINT IF EXISTS customer_labels_company_id_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS customer_labels_company_id_name_key
  ON customer_labels (company_id, name)
  WHERE deleted_at IS NULL;
