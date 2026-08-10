-- Separar el campo phone de customers en mobile (celular) y phone (convencional).
-- El campo actual phone almacenaba únicamente números celulares Ecuador (+593XXXXXXXXX).
-- Siguiendo la nomenclatura inglés estándar de Lumio:
--   mobile = celular Ecuador (requerido en formularios, opcional en importación)
--   phone  = número convencional/fijo (opcional en todas partes)

-- 1. Eliminar el constraint de formato que apunta a phone (lo movemos a mobile)
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_phone_format_check;

-- 2. Renombrar la columna existente
ALTER TABLE customers RENAME COLUMN phone TO mobile;

-- 3. Re-agregar el constraint de formato en la columna correcta
ALTER TABLE customers
  ADD CONSTRAINT customers_mobile_format_check
    CHECK (mobile IS NULL OR mobile ~ '^\+593[2-9][0-9]{8}$');

-- 4. Agregar la nueva columna para teléfono convencional (opcional, sin formato rígido)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
