-- Separar el campo phone de customers en mobile (celular) y phone (convencional).
-- El campo actual phone almacenaba únicamente números celulares Ecuador (+593XXXXXXXXX).
-- Siguiendo la nomenclatura inglés estándar de Lumio:
--   mobile = celular Ecuador (requerido en formularios, opcional en importación)
--   phone  = número convencional/fijo (opcional en todas partes)

ALTER TABLE customers RENAME COLUMN phone TO mobile;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
