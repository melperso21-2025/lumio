-- ── Feature #11: IA Inline por módulo ────────────────────────────────────────

-- 1. Cuota de uso mensual de IA en companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS ai_monthly_used   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_monthly_reset  date    NOT NULL DEFAULT CURRENT_DATE;

-- 2. Tabla de análisis por módulo
CREATE TABLE IF NOT EXISTS public.ai_module_insights (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module       text        NOT NULL CHECK (module IN ('sales','purchases','receivables','payables','inventory')),
  summary      text        NOT NULL,
  details      text        NOT NULL,
  playbook     jsonb       NOT NULL DEFAULT '[]',
  tokens_used  integer,
  created_by   uuid        REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ami_company_module
  ON public.ai_module_insights(company_id, module, created_at DESC);

-- 3. Tabla de seguimiento de acciones del playbook
CREATE TABLE IF NOT EXISTS public.playbook_actions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_id      uuid,                        -- id del ai_module_insights o ai_insights que la originó
  source_type    text        NOT NULL DEFAULT 'module' CHECK (source_type IN ('module','weekly','initial')),
  action         text        NOT NULL,
  reason         text        NOT NULL,
  priority       text        NOT NULL DEFAULT 'soon' CHECK (priority IN ('urgent','soon','later')),
  timeframe      text        NOT NULL DEFAULT 'este mes',
  status         text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done','dismissed')),
  module         text,
  assigned_to    uuid        REFERENCES auth.users(id),
  completed_at   timestamptz,
  created_by     uuid        REFERENCES auth.users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pa_company_status
  ON public.playbook_actions(company_id, status, created_at DESC);

-- 4. RLS
ALTER TABLE public.ai_module_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbook_actions    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_members_ami" ON public.ai_module_insights
  FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "company_members_pa" ON public.playbook_actions
  FOR ALL USING (company_id = get_user_company_id());

-- 5. Cuotas por plan (consultadas en la API vía JS)
-- trial: 0, basic: 5, standard: 20, pro: 999
