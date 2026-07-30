-- Migration: Sprint 26.7 — Enterprise Tax Intelligence Platform
-- Idempotent. NÃO executada automaticamente — aplicar manualmente no Supabase.
-- Regras tributárias versionadas + entidades + bases + simulações + alertas.
-- Sem alíquotas seed hardcoded — parâmetros vêm de configuração por tenant.

-- 1) Versões de regras tributárias (fonte da verdade parametrizada)
create table if not exists public.tax_rule_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  regime_code text not null,
  version_label text not null,
  effective_from date not null,
  effective_to date null,
  status text not null default 'draft',
  parameters jsonb not null default '{}'::jsonb,
  jurisdiction text null,
  notes text null,
  created_by uuid null references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tax_rule_versions_regime_check check (
    regime_code in (
      'simples_nacional',
      'lucro_presumido',
      'lucro_real',
      'cbs',
      'ibs',
      'custom'
    )
  ),
  constraint tax_rule_versions_status_check check (
    status in ('draft', 'active', 'superseded', 'archived')
  )
);

create index if not exists idx_tax_rule_versions_tenant_regime_from
  on public.tax_rule_versions (tenant_id, regime_code, effective_from desc);
create index if not exists idx_tax_rule_versions_tenant_status
  on public.tax_rule_versions (tenant_id, status);

-- 2) Entidades fiscais (empresa / filial / centro)
create table if not exists public.tax_entities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  kind text not null,
  name text not null,
  document text null,
  parent_id uuid null references public.tax_entities (id) on delete set null,
  regime_code text not null,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint tax_entities_kind_check check (
    kind in ('company', 'branch', 'cost_center')
  ),
  constraint tax_entities_regime_check check (
    regime_code in (
      'simples_nacional',
      'lucro_presumido',
      'lucro_real',
      'cbs',
      'ibs',
      'custom'
    )
  )
);

create index if not exists idx_tax_entities_tenant_kind
  on public.tax_entities (tenant_id, kind);
create index if not exists idx_tax_entities_tenant_parent
  on public.tax_entities (tenant_id, parent_id);

-- 3) Bases tributáveis / operacionais
create table if not exists public.tax_base_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  entity_id uuid not null references public.tax_entities (id) on delete cascade,
  period text not null,
  kind text not null,
  amount numeric(18, 2) not null,
  product_mix_share numeric(8, 6) null,
  service_mix_share numeric(8, 6) null,
  region_code text null,
  cost_center_id uuid null,
  category_id uuid null,
  label text null,
  created_at timestamptz not null default now(),
  constraint tax_base_lines_kind_check check (
    kind in ('revenue', 'expense', 'credit', 'deduction', 'other')
  )
);

create index if not exists idx_tax_base_lines_tenant_entity_period
  on public.tax_base_lines (tenant_id, entity_id, period);

-- 4) Apurações (auditoria / cache de cálculo)
create table if not exists public.tax_assessments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  entity_id uuid not null references public.tax_entities (id) on delete cascade,
  rule_version_id uuid not null references public.tax_rule_versions (id) on delete restrict,
  period text not null,
  regime_code text not null,
  total_tax numeric(18, 2) not null default 0,
  taxable_base numeric(18, 2) not null default 0,
  effective_rate numeric(12, 8) null,
  components jsonb not null default '[]'::jsonb,
  methodology text null,
  confidence text not null default 'medium',
  created_at timestamptz not null default now(),
  constraint tax_assessments_confidence_check check (
    confidence in ('high', 'medium', 'low')
  )
);

create index if not exists idx_tax_assessments_tenant_period
  on public.tax_assessments (tenant_id, period desc);

-- 5) Simulações
create table if not exists public.tax_simulations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  kind text not null,
  label text not null,
  factors jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  created_by uuid null references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint tax_simulations_kind_check check (
    kind in (
      'regime_change',
      'revenue_growth',
      'new_branch',
      'product_mix',
      'service_mix',
      'regional_expansion',
      'acquisition'
    )
  )
);

create index if not exists idx_tax_simulations_tenant_created
  on public.tax_simulations (tenant_id, created_at desc);

-- 6) Alertas
create table if not exists public.tax_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  kind text not null,
  severity text not null,
  title text not null,
  message text not null,
  amount numeric(18, 2) null,
  origin text not null,
  confidence text not null default 'medium',
  requires_human_review boolean not null default true,
  auto_applied boolean not null default false,
  acknowledged_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint tax_alerts_severity_check check (
    severity in ('info', 'warning', 'critical')
  ),
  constraint tax_alerts_confidence_check check (
    confidence in ('high', 'medium', 'low')
  )
);

create index if not exists idx_tax_alerts_tenant_created
  on public.tax_alerts (tenant_id, created_at desc);

-- 7) Recomendações IA (revisão humana)
create table if not exists public.tax_ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  title text not null,
  explanation text not null,
  origin text not null,
  confidence text not null default 'medium',
  requires_human_review boolean not null default true,
  auto_executed boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  reviewed_by uuid null references public.profiles (id) on delete set null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint tax_ai_recommendations_confidence_check check (
    confidence in ('high', 'medium', 'low')
  )
);

create index if not exists idx_tax_ai_recs_tenant_created
  on public.tax_ai_recommendations (tenant_id, created_at desc);

-- RLS
alter table public.tax_rule_versions enable row level security;
alter table public.tax_entities enable row level security;
alter table public.tax_base_lines enable row level security;
alter table public.tax_assessments enable row level security;
alter table public.tax_simulations enable row level security;
alter table public.tax_alerts enable row level security;
alter table public.tax_ai_recommendations enable row level security;

drop policy if exists tax_rule_versions_tenant_isolation on public.tax_rule_versions;
create policy tax_rule_versions_tenant_isolation on public.tax_rule_versions
  for all using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_rule_versions.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_rule_versions.tenant_id
        and tm.user_id = auth.uid()
    )
  );

drop policy if exists tax_entities_tenant_isolation on public.tax_entities;
create policy tax_entities_tenant_isolation on public.tax_entities
  for all using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_entities.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_entities.tenant_id
        and tm.user_id = auth.uid()
    )
  );

drop policy if exists tax_base_lines_tenant_isolation on public.tax_base_lines;
create policy tax_base_lines_tenant_isolation on public.tax_base_lines
  for all using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_base_lines.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_base_lines.tenant_id
        and tm.user_id = auth.uid()
    )
  );

drop policy if exists tax_assessments_tenant_isolation on public.tax_assessments;
create policy tax_assessments_tenant_isolation on public.tax_assessments
  for all using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_assessments.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_assessments.tenant_id
        and tm.user_id = auth.uid()
    )
  );

drop policy if exists tax_simulations_tenant_isolation on public.tax_simulations;
create policy tax_simulations_tenant_isolation on public.tax_simulations
  for all using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_simulations.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_simulations.tenant_id
        and tm.user_id = auth.uid()
    )
  );

drop policy if exists tax_alerts_tenant_isolation on public.tax_alerts;
create policy tax_alerts_tenant_isolation on public.tax_alerts
  for all using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_alerts.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_alerts.tenant_id
        and tm.user_id = auth.uid()
    )
  );

drop policy if exists tax_ai_recommendations_tenant_isolation on public.tax_ai_recommendations;
create policy tax_ai_recommendations_tenant_isolation on public.tax_ai_recommendations
  for all using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_ai_recommendations.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_ai_recommendations.tenant_id
        and tm.user_id = auth.uid()
    )
  );

comment on table public.tax_rule_versions is
  'Sprint 26.7 — Regras tributárias versionadas/parametrizadas (sem hardcode).';
comment on table public.tax_entities is
  'Sprint 26.7 — Empresas/filiais/centros para apuração multiempresa.';
comment on table public.tax_base_lines is
  'Sprint 26.7 — Bases operacionais injetadas no Tax Engine.';
comment on table public.tax_assessments is
  'Sprint 26.7 — Apurações auditáveis geradas pelo motor.';
comment on table public.tax_simulations is
  'Sprint 26.7 — Simulações tributárias com revisão humana.';
comment on table public.tax_alerts is
  'Sprint 26.7 — Alertas tributários (nunca auto-aplicados).';
comment on table public.tax_ai_recommendations is
  'Sprint 26.7 — Recomendações de IA Tributária (revisão humana obrigatória).';
