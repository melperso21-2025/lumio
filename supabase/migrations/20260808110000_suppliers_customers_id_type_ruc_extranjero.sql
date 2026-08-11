-- Ampliar check constraints de id_type para permitir ruc_extranjero

-- Suppliers
ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS suppliers_id_type_check;
ALTER TABLE suppliers ADD CONSTRAINT suppliers_id_type_check
  CHECK (id_type IN ('cedula', 'ruc', 'pasaporte', 'ruc_extranjero'));

-- Customers (por si tiene el mismo constraint)
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_id_type_check;
ALTER TABLE customers ADD CONSTRAINT customers_id_type_check
  CHECK (id_type IN ('cedula', 'ruc', 'pasaporte', 'ruc_extranjero'));
