-- Ampliar constraint de longitud de tax_id en suppliers para soportar ruc_extranjero (5-30 chars)
ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS suppliers_tax_id_length_check;
ALTER TABLE suppliers ADD CONSTRAINT suppliers_tax_id_length_check
  CHECK (char_length(tax_id) BETWEEN 5 AND 30);
