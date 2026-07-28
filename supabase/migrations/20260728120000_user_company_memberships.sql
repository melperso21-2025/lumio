-- ── user_company_memberships ──────────────────────────────────────────────────
-- Relación many-to-many entre usuarios y empresas.
-- users.company_id sigue siendo la empresa ACTIVA (la que usa RLS/get_user_company_id).
-- Esta tabla es el catálogo de a cuáles empresas pertenece un usuario.

CREATE TABLE IF NOT EXISTS user_company_memberships (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  company_id  uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role        text        NOT NULL DEFAULT 'operator'
                          CHECK (role IN ('admin', 'manager', 'operator', 'seller')),
  is_default  boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE user_company_memberships ENABLE ROW LEVEL SECURITY;

-- El usuario ve sus propias membresías; pulse_admin ve todas
CREATE POLICY "ucm_select"
  ON user_company_memberships FOR SELECT
  USING (user_id = auth.uid() OR is_pulse_admin());

-- Solo admins de empresa o pulse_admin pueden crear membresías
CREATE POLICY "ucm_insert"
  ON user_company_memberships FOR INSERT
  WITH CHECK (is_pulse_admin() OR get_user_role() = 'admin');

-- Solo admins de empresa o pulse_admin pueden modificar membresías
CREATE POLICY "ucm_update"
  ON user_company_memberships FOR UPDATE
  USING (is_pulse_admin() OR get_user_role() = 'admin');

-- Solo pulse_admin puede eliminar membresías
CREATE POLICY "ucm_delete"
  ON user_company_memberships FOR DELETE
  USING (is_pulse_admin());

-- ── Migrar datos existentes ──────────────────────────────────────────────────
-- Convierte cada fila actual de users en una membresía (la única/default por ahora).

INSERT INTO user_company_memberships (user_id, company_id, role, is_default)
SELECT
  u.id,
  u.company_id,
  u.role,
  true
FROM users u
WHERE u.company_id IS NOT NULL
  AND u.deleted_at  IS NULL
ON CONFLICT (user_id, company_id) DO NOTHING;

-- ── Índices ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ucm_user_id    ON user_company_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_ucm_company_id ON user_company_memberships (company_id);
