-- Límite de usuarios e invitaciones por empresa (Panel Pulse)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS max_users integer NOT NULL DEFAULT 3
    CHECK (max_users >= 0);

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS allow_user_invites boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.companies.max_users IS
  'Máximo de usuarios activos permitidos. 0 = no puede añadir usuarios.';
COMMENT ON COLUMN public.companies.allow_user_invites IS
  'Si la empresa puede invitar usuarios (admins de empresa). Pulse Admin puede gestionar con excepción documentada en API.';
