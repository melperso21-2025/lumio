-- Renombrar phone → celular (datos existentes son todos móviles +593 9XXXXXXXX)
-- y agregar columna telefono para convencionales

ALTER TABLE suppliers RENAME COLUMN phone TO celular;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS telefono TEXT;
