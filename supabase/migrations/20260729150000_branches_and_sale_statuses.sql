-- ============================================================
-- branches: sucursales / puntos de venta por empresa
-- ============================================================
CREATE TABLE IF NOT EXISTS branches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT,           -- 'principal' | 'sucursal' | 'bodega' | 'punto_venta'
  address     TEXT,
  phone       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branches_company_access" ON branches
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
      UNION
      SELECT company_id FROM user_company_memberships WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_branches_company ON branches(company_id) WHERE deleted_at IS NULL;

-- ============================================================
-- sale_statuses: estados de venta configurables por empresa
-- ============================================================
CREATE TABLE IF NOT EXISTS sale_statuses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6B7280',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

ALTER TABLE sale_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sale_statuses_company_access" ON sale_statuses
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
      UNION
      SELECT company_id FROM user_company_memberships WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_sale_statuses_company ON sale_statuses(company_id) WHERE deleted_at IS NULL;
