-- Migration: Sprint 26.8 — Tax Configuration & Rule Versioning (+ 26.9/26.10 persistence)
-- Idempotent. NÃO executar automaticamente — aplicar manualmente no Supabase.
-- Não altera migrations anteriores (ex.: 20260811_enterprise_tax_intelligence.sql).
-- Não altera cálculos financeiros canônicos. Sem seeds de alíquotas legais.

-- 1) Regimes
create table if not exists public.tax_regimes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  code text not null,
  name text not null,
  description text null,
  jurisdiction text not null,
  active boolean not null default true,
  valid_from date not null,
  valid_to date null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  unique (tenant_id, code)
);

create index if not exists idx_tax_regimes_tenant on public.tax_regimes (tenant_id)
  where deleted_at is null;

-- 2) Tax types (catálogo estrutural — sem alíquotas)
create table if not exists public.tax_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  level text not null,
  calculation_type text not null default 'parametric',
  recoverable boolean not null default false,
  cumulative boolean not null default false,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tax_types_level_check check (
    level in (
      'federal', 'estadual', 'municipal', 'contribuicao',
      'retencao', 'credito', 'debito', 'obrigacao_acessoria'
    )
  )
);

-- 3) Rules
create table if not exists public.tax_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  company_id uuid null,
  branch_id uuid null,
  code text not null,
  name text not null,
  description text null,
  regime_id uuid not null references public.tax_regimes (id) on delete restrict,
  tax_type_id uuid not null references public.tax_types (id) on delete restrict,
  jurisdiction text not null,
  country text null,
  state text null,
  municipality text null,
  cnae text null,
  ncm text null,
  cest text null,
  cfop text null,
  service_code text null,
  customer_type text null,
  supplier_type text null,
  operation_type text null,
  origin text null,
  destination text null,
  conditions jsonb not null default '{}'::jsonb,
  calculation_base jsonb null,
  rate_definition jsonb null,
  reduction_definition jsonb null,
  credit_definition jsonb null,
  retention_definition jsonb null,
  exceptions jsonb null,
  priority integer not null default 100,
  valid_from date not null,
  valid_to date null,
  status text not null default 'draft',
  environment text not null default 'configuracao',
  source_reference text not null,
  legal_reference text null,
  version integer not null default 1,
  parent_version_id uuid null references public.tax_rules (id) on delete set null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  reviewed_by uuid null references public.profiles (id) on delete set null,
  approved_by uuid null references public.profiles (id) on delete set null,
  published_by uuid null references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz null,
  deleted_at timestamptz null,
  constraint tax_rules_status_check check (
    status in (
      'draft', 'under_review', 'approved', 'published',
      'superseded', 'suspended', 'archived'
    )
  ),
  constraint tax_rules_environment_check check (
    environment in ('configuracao', 'simulacao', 'producao')
  ),
  constraint tax_rules_validity_check check (
    valid_to is null or valid_to >= valid_from
  )
);

create index if not exists idx_tax_rules_tenant_status
  on public.tax_rules (tenant_id, status)
  where deleted_at is null;
create index if not exists idx_tax_rules_tenant_code_version
  on public.tax_rules (tenant_id, code, version desc);
create index if not exists idx_tax_rules_tenant_priority
  on public.tax_rules (tenant_id, priority desc)
  where deleted_at is null and status = 'published';
create index if not exists idx_tax_rules_validity
  on public.tax_rules (tenant_id, valid_from, valid_to)
  where deleted_at is null;

-- 4) Version snapshots (nome distinto de tax_rule_versions da Sprint 26.7)
create table if not exists public.tax_rule_version_snapshots (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.tax_rules (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  version integer not null,
  snapshot jsonb not null,
  change_reason text not null,
  change_summary text not null,
  effective_from date not null,
  effective_to date null,
  status text not null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  reviewed_by uuid null references public.profiles (id) on delete set null,
  approved_by uuid null references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (rule_id, version)
);

create index if not exists idx_tax_rule_version_snapshots_tenant
  on public.tax_rule_version_snapshots (tenant_id, created_at desc);

-- 5) Obligations
create table if not exists public.tax_obligation_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  code text not null,
  name text not null,
  jurisdiction text not null,
  regime text null,
  frequency text not null,
  due_date_rule jsonb not null default '{}'::jsonb,
  applicability jsonb not null default '{}'::jsonb,
  source text not null,
  valid_from date not null,
  valid_to date null,
  status text not null default 'draft',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  unique (tenant_id, code, version),
  constraint tax_obligation_status_check check (
    status in (
      'draft', 'under_review', 'approved', 'published',
      'superseded', 'suspended', 'archived'
    )
  )
);

create index if not exists idx_tax_obligations_tenant
  on public.tax_obligation_definitions (tenant_id)
  where deleted_at is null;

-- 6) Calculation traces
create table if not exists public.tax_calculation_traces (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  company_id uuid null,
  branch_id uuid null,
  rule_version_id uuid not null references public.tax_rule_version_snapshots (id) on delete restrict,
  source_document text null,
  source_document_id text null,
  calculation_date date not null,
  period text not null,
  inputs jsonb not null default '{}'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  base_amount numeric null,
  rate numeric null,
  reduction numeric null,
  credit numeric null,
  debit numeric null,
  retention numeric null,
  result numeric null,
  currency text not null default 'BRL',
  warnings jsonb not null default '[]'::jsonb,
  limitations jsonb not null default '[]'::jsonb,
  correlation_id text not null,
  environment text not null default 'producao',
  created_at timestamptz not null default now(),
  constraint tax_traces_environment_check check (
    environment in ('configuracao', 'simulacao', 'producao')
  )
);

create index if not exists idx_tax_traces_tenant_period
  on public.tax_calculation_traces (tenant_id, period, created_at desc);
create index if not exists idx_tax_traces_correlation
  on public.tax_calculation_traces (tenant_id, correlation_id);

-- 7) Simulations v2 (isoladas)
create table if not exists public.tax_simulations_v2 (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  company_id uuid null,
  branch_id uuid null,
  name text not null,
  description text null,
  status text not null default 'draft',
  baseline_period text not null,
  target_period text not null,
  currency text not null default 'BRL',
  regimes jsonb not null default '[]'::jsonb,
  assumptions jsonb not null default '[]'::jsonb,
  variables jsonb not null default '{}'::jsonb,
  results jsonb null,
  confidence text not null default 'indisponivel',
  warnings jsonb not null default '[]'::jsonb,
  rule_versions jsonb not null default '[]'::jsonb,
  mutates_official boolean not null default false,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint tax_sim_v2_status_check check (
    status in ('draft', 'running', 'completed', 'archived', 'error')
  ),
  constraint tax_sim_v2_no_official check (mutates_official = false)
);

create index if not exists idx_tax_sim_v2_tenant
  on public.tax_simulations_v2 (tenant_id, created_at desc)
  where deleted_at is null;

create table if not exists public.tax_scenarios (
  id uuid primary key default gen_random_uuid(),
  simulation_id uuid not null references public.tax_simulations_v2 (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  type text not null,
  description text null,
  variables jsonb not null default '{}'::jsonb,
  assumptions jsonb not null default '[]'::jsonb,
  constraints jsonb not null default '{}'::jsonb,
  tax_rule_version_ids jsonb not null default '[]'::jsonb,
  result jsonb null,
  confidence text not null default 'indisponivel',
  limitations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint tax_scenarios_type_check check (
    type in ('baseline', 'pessimistic', 'expected', 'optimistic', 'custom')
  )
);

create index if not exists idx_tax_scenarios_sim
  on public.tax_scenarios (tenant_id, simulation_id);

-- 8) Audit
create table if not exists public.tax_audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete restrict,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  before jsonb null,
  after jsonb null,
  correlation_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_tax_audit_tenant
  on public.tax_audit_events (tenant_id, created_at desc);
create index if not exists idx_tax_audit_entity
  on public.tax_audit_events (tenant_id, entity_type, entity_id);

-- updated_at triggers
create or replace function public.tax_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_tax_regimes_updated on public.tax_regimes;
create trigger trg_tax_regimes_updated
  before update on public.tax_regimes
  for each row execute function public.tax_set_updated_at();

drop trigger if exists trg_tax_types_updated on public.tax_types;
create trigger trg_tax_types_updated
  before update on public.tax_types
  for each row execute function public.tax_set_updated_at();

drop trigger if exists trg_tax_rules_updated on public.tax_rules;
create trigger trg_tax_rules_updated
  before update on public.tax_rules
  for each row execute function public.tax_set_updated_at();

drop trigger if exists trg_tax_obligations_updated on public.tax_obligation_definitions;
create trigger trg_tax_obligations_updated
  before update on public.tax_obligation_definitions
  for each row execute function public.tax_set_updated_at();

drop trigger if exists trg_tax_sim_v2_updated on public.tax_simulations_v2;
create trigger trg_tax_sim_v2_updated
  before update on public.tax_simulations_v2
  for each row execute function public.tax_set_updated_at();

-- RLS
alter table public.tax_regimes enable row level security;
alter table public.tax_types enable row level security;
alter table public.tax_rules enable row level security;
alter table public.tax_rule_version_snapshots enable row level security;
alter table public.tax_obligation_definitions enable row level security;
alter table public.tax_calculation_traces enable row level security;
alter table public.tax_simulations_v2 enable row level security;
alter table public.tax_scenarios enable row level security;
alter table public.tax_audit_events enable row level security;

-- tax_types: readable by authenticated (catálogo estrutural)
drop policy if exists tax_types_select on public.tax_types;
create policy tax_types_select on public.tax_types
  for select to authenticated
  using (true);

drop policy if exists tax_types_insert on public.tax_types;
create policy tax_types_insert on public.tax_types
  for insert to authenticated
  with check (true);

-- Helper pattern: membership via tenant_members
drop policy if exists tax_regimes_select on public.tax_regimes;
create policy tax_regimes_select on public.tax_regimes
  for select to authenticated
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_regimes.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists tax_regimes_write on public.tax_regimes;
create policy tax_regimes_write on public.tax_regimes
  for all to authenticated
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_regimes.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_regimes.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists tax_rules_select on public.tax_rules;
create policy tax_rules_select on public.tax_rules
  for select to authenticated
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_rules.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists tax_rules_write on public.tax_rules;
create policy tax_rules_write on public.tax_rules
  for all to authenticated
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_rules.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_rules.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists tax_rule_version_snapshots_select on public.tax_rule_version_snapshots;
create policy tax_rule_version_snapshots_select on public.tax_rule_version_snapshots
  for select to authenticated
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_rule_version_snapshots.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists tax_rule_version_snapshots_insert on public.tax_rule_version_snapshots;
create policy tax_rule_version_snapshots_insert on public.tax_rule_version_snapshots
  for insert to authenticated
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_rule_version_snapshots.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists tax_obligations_all on public.tax_obligation_definitions;
create policy tax_obligations_all on public.tax_obligation_definitions
  for all to authenticated
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_obligation_definitions.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_obligation_definitions.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists tax_traces_all on public.tax_calculation_traces;
create policy tax_traces_all on public.tax_calculation_traces
  for all to authenticated
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_calculation_traces.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_calculation_traces.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists tax_sim_v2_all on public.tax_simulations_v2;
create policy tax_sim_v2_all on public.tax_simulations_v2
  for all to authenticated
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_simulations_v2.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_simulations_v2.tenant_id and tm.user_id = auth.uid()
    )
    and mutates_official = false
  );

drop policy if exists tax_scenarios_all on public.tax_scenarios;
create policy tax_scenarios_all on public.tax_scenarios
  for all to authenticated
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_scenarios.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_scenarios.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists tax_audit_select on public.tax_audit_events;
create policy tax_audit_select on public.tax_audit_events
  for select to authenticated
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_audit_events.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists tax_audit_insert on public.tax_audit_events;
create policy tax_audit_insert on public.tax_audit_events
  for insert to authenticated
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tax_audit_events.tenant_id and tm.user_id = auth.uid()
    )
  );
