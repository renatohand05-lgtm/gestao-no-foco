-- Migration: Sprint 22.6 — Enterprise Import Intelligence Foundation
-- Persistência tenant-scoped da Import Engine (histórico, perfis, aprendizado, rollback)
-- Execute no Supabase SQL Editor / CLI. Não altera DRE, Fluxo, Vendas ou OS.

-- 1) Runs (histórico de importações)
create table if not exists public.import_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete restrict,
  user_label text not null default '',
  module text not null,
  target_entity text not null default '',
  file_name text not null,
  format text not null,
  origin text not null default 'upload',
  status text not null,
  total_rows integer not null default 0,
  imported_rows integer not null default 0,
  rejected_rows integer not null default 0,
  error_count integer not null default 0,
  duration_ms integer null,
  mapping_snapshot jsonb not null default '{}'::jsonb,
  errors_sample jsonb not null default '[]'::jsonb,
  profile_id uuid null,
  profile_name text null,
  engine_version text not null default '22.6',
  correlation_id text null,
  session_id text null,
  rolled_back_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint import_runs_status_check check (
    status in ('preview', 'completed', 'failed', 'partial', 'rolled_back')
  ),
  constraint import_runs_origin_check check (
    origin in ('upload', 'api', 'paste', 'webhook')
  )
);

create index if not exists idx_import_runs_tenant_created
  on public.import_runs (tenant_id, created_at desc);
create index if not exists idx_import_runs_tenant_module
  on public.import_runs (tenant_id, module, created_at desc);
create index if not exists idx_import_runs_tenant_user
  on public.import_runs (tenant_id, user_id);

-- 2) Perfis de importação
create table if not exists public.import_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  module text not null,
  target_entity text not null,
  name text not null,
  description text null,
  format text null,
  is_default boolean not null default false,
  mapping jsonb not null default '{}'::jsonb,
  transformations jsonb not null default '{}'::jsonb,
  normalizations jsonb not null default '{}'::jsonb,
  rules jsonb not null default '{}'::jsonb,
  import_count integer not null default 0,
  last_used_at timestamptz null,
  created_by uuid null references public.profiles (id) on delete set null,
  updated_by uuid null references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, module, target_entity, name)
);

create index if not exists idx_import_profiles_tenant_module
  on public.import_profiles (tenant_id, module);

-- 3) Versões de mapeamento (histórico de alterações do perfil)
create table if not exists public.import_column_mappings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  profile_id uuid not null references public.import_profiles (id) on delete cascade,
  mapping jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  created_by uuid null references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (profile_id, version)
);

create index if not exists idx_import_column_mappings_profile
  on public.import_column_mappings (tenant_id, profile_id, version desc);

-- 4) Aprendizado por tenant (regras confirmadas pelo utilizador)
create table if not exists public.import_learning_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  module text not null,
  rule_key text not null,
  patterns jsonb not null default '[]'::jsonb,
  category_suggested text null,
  subcategory_suggested text null,
  cost_center_suggested text null,
  dre_group_suggested text null,
  supplier_suggested text null,
  confidence numeric(4, 3) not null default 0.900,
  reason text not null default '',
  source text not null default 'user_confirm',
  hit_count integer not null default 0,
  is_active boolean not null default true,
  created_by uuid null references public.profiles (id) on delete set null,
  updated_by uuid null references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, module, rule_key),
  constraint import_learning_source_check check (
    source in ('seed', 'user_confirm', 'user_edit', 'auto_learned')
  )
);

create index if not exists idx_import_learning_tenant_module
  on public.import_learning_rules (tenant_id, module, is_active);

-- 5) Itens criados por run (âncora de rollback)
create table if not exists public.import_run_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  run_id uuid not null references public.import_runs (id) on delete cascade,
  row_number integer not null,
  target_type text not null,
  target_id text not null,
  operation text not null default 'create',
  payload_snapshot jsonb null,
  rollback_status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique (run_id, row_number),
  constraint import_run_items_rollback_check check (
    rollback_status in ('pending', 'reverted', 'skipped', 'failed')
  )
);

create index if not exists idx_import_run_items_run
  on public.import_run_items (tenant_id, run_id);
create index if not exists idx_import_run_items_target
  on public.import_run_items (tenant_id, target_type, target_id);

-- 6) Eventos de rollback (append-only)
create table if not exists public.import_rollback_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  run_id uuid not null references public.import_runs (id) on delete cascade,
  status text not null,
  affected_rows integer not null default 0,
  reason text null,
  requested_by uuid not null references public.profiles (id) on delete restrict,
  completed_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint import_rollback_status_check check (
    status in ('eligible', 'in_progress', 'done', 'failed', 'not_supported')
  )
);

create index if not exists idx_import_rollback_run
  on public.import_rollback_events (tenant_id, run_id, created_at desc);

-- FK opcional perfil → runs (após create profiles)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'import_runs_profile_id_fkey'
  ) then
    alter table public.import_runs
      add constraint import_runs_profile_id_fkey
      foreign key (profile_id) references public.import_profiles (id) on delete set null;
  end if;
end $$;

-- RLS
alter table public.import_runs enable row level security;
alter table public.import_profiles enable row level security;
alter table public.import_column_mappings enable row level security;
alter table public.import_learning_rules enable row level security;
alter table public.import_run_items enable row level security;
alter table public.import_rollback_events enable row level security;

-- Members: full access scoped by tenant_members
drop policy if exists import_runs_tenant_all on public.import_runs;
create policy import_runs_tenant_all on public.import_runs
  for all using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = import_runs.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = import_runs.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists import_profiles_tenant_all on public.import_profiles;
create policy import_profiles_tenant_all on public.import_profiles
  for all using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = import_profiles.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = import_profiles.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists import_column_mappings_tenant_all on public.import_column_mappings;
create policy import_column_mappings_tenant_all on public.import_column_mappings
  for all using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = import_column_mappings.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = import_column_mappings.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists import_learning_rules_tenant_all on public.import_learning_rules;
create policy import_learning_rules_tenant_all on public.import_learning_rules
  for all using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = import_learning_rules.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = import_learning_rules.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists import_run_items_tenant_all on public.import_run_items;
create policy import_run_items_tenant_all on public.import_run_items
  for all using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = import_run_items.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = import_run_items.tenant_id and tm.user_id = auth.uid()
    )
  );

-- Rollback events: append-only (select + insert)
drop policy if exists import_rollback_events_select on public.import_rollback_events;
create policy import_rollback_events_select on public.import_rollback_events
  for select using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = import_rollback_events.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists import_rollback_events_insert on public.import_rollback_events;
create policy import_rollback_events_insert on public.import_rollback_events
  for insert with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = import_rollback_events.tenant_id and tm.user_id = auth.uid()
    )
  );

comment on table public.import_runs is 'Sprint 22.6 — histórico de importações da Enterprise Import Engine';
comment on table public.import_profiles is 'Sprint 22.6 — perfis reutilizáveis de mapeamento por tenant/módulo';
comment on table public.import_learning_rules is 'Sprint 22.6 — aprendizado por confirmação do utilizador (sem IA generativa)';
comment on table public.import_run_items is 'Sprint 22.6 — registos criados por run (base de rollback)';
comment on table public.import_rollback_events is 'Sprint 22.6 — auditoria append-only de rollbacks';
