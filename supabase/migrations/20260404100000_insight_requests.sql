-- Tabla para solicitudes de corrección de análisis IA
-- El cliente solicita a Pulse que regenere un insight ya generado

create table if not exists public.insight_requests (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  week_number   int  not null,
  year          int  not null,
  requested_by  uuid not null references public.users(id) on delete cascade,
  reviewed_by   uuid references public.users(id) on delete set null,
  reason        text,
  status        text not null default 'pending'
                  check (status in ('pending', 'approved', 'rejected', 'done')),
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Índices para las consultas más frecuentes
create index if not exists insight_requests_company_week
  on public.insight_requests (company_id, week_number, year);

create index if not exists insight_requests_status
  on public.insight_requests (status)
  where status in ('pending', 'approved');

-- RLS: solo admins de la empresa y pulse_admin pueden ver sus solicitudes
alter table public.insight_requests enable row level security;

create policy "empresa puede ver sus solicitudes"
  on public.insight_requests for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and (u.company_id = insight_requests.company_id or u.is_pulse_admin = true)
    )
  );

create policy "empresa puede crear solicitudes"
  on public.insight_requests for insert
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.company_id = insight_requests.company_id
    )
  );

create policy "pulse_admin puede actualizar solicitudes"
  on public.insight_requests for update
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.is_pulse_admin = true
    )
  );
