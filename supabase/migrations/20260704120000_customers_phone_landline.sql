-- Ampliar el constraint de teléfono para aceptar fijos ecuatorianos.
-- Antes: solo móviles +5939XXXXXXXX
-- Ahora: móviles (+5939...) y fijos (+5932... a +5937...) — siempre 9 dígitos locales.
ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_phone_format_check;

ALTER TABLE public.customers
  ADD CONSTRAINT customers_phone_format_check
    CHECK (phone IS NULL OR phone ~ '^\+593[2-9][0-9]{8}$');
