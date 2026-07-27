-- Migration: Sprint 21.6 / RC3 — Enterprise Workflow persistence
-- Unique parcial global/tenant · history RESTRICT · actors tipados
-- Pré-requisito obrigatório de 20260807_enterprise_rpc.sql (save_workflow_definition).

create table if not exists public.workflow_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid null references public.tenants (id) on delete cascade,
  workflow_key text not null,
  version text not null,
  name text not null,
  description text null,
  definition jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workflow_definitions_key_not_blank check (char_length(trim(workflow_key)) > 0),
  constraint workflow_definitions_version_not_blank check (char_length(trim(version)) > 0)
);

create unique index if not exists workflow_definitions_global_key_version_uidx
  on public.workflow_definitions (workflow_key, version)
  where tenant_id is null;

create unique index if not exists workflow_definitions_tenant_key_version_uidx
  on public.workflow_definitions (tenant_id, workflow_key, version)
  where tenant_id is not null;

create table if not exists public.workflow_instances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  workflow_definition_id uuid not null references public.workflow_definitions (id) on delete restrict,
  workflow_key text not null,
  workflow_version text not null,
  current_state text not null,
  status text not null,
  target_type text null,
  target_id text null,
  data jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  correlation_id text null,
  transition_count integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  workflow_instance_id uuid not null references public.workflow_instances (id) on delete restrict,
  transition_id text null,
  event text not null,
  from_state text null,
  to_state text null,
  actor_type text not null default 'user',
  actor_id uuid null references public.profiles (id) on delete set null,
  system_actor_key text null,
  reason text null,
  metadata jsonb not null default '{}'::jsonb,
  correlation_id text null,
  request_id text null,
  created_at timestamptz not null default now(),
  constraint workflow_history_actor_type_check check (
    actor_type in ('user', 'system', 'service', 'integration')
  ),
  constraint workflow_history_actor_shape_check check (
    (
      actor_type = 'user'
      and actor_id is not null
      and system_actor_key is null
    )
    or (
      actor_type in ('system', 'service', 'integration')
      and actor_id is null
      and system_actor_key is not null
      and char_length(trim(system_actor_key)) > 0
    )
  )
);

create table if not exists public.workflow_pending_actions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  workflow_instance_id uuid not null references public.workflow_instances (id) on delete cascade,
  action_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  attempts integer not null default 0,
  last_error text null,
  scheduled_at timestamptz null,
  processed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workflow_definitions_tenant on public.workflow_definitions (tenant_id);
create index if not exists idx_workflow_instances_tenant on public.workflow_instances (tenant_id);
create index if not exists idx_workflow_instances_status on public.workflow_instances (tenant_id, status);
create index if not exists idx_workflow_instances_correlation on public.workflow_instances (tenant_id, correlation_id);
create index if not exists idx_workflow_instances_definition on public.workflow_instances (workflow_definition_id);
create index if not exists idx_workflow_history_instance on public.workflow_history (tenant_id, workflow_instance_id);
create index if not exists idx_workflow_pending_status on public.workflow_pending_actions (tenant_id, status);

-- FK/ON DELETE (documentado):
-- instance→definition RESTRICT: não apaga definição com instances
-- history→instance RESTRICT: não apaga instance com histórico
-- pending→instance CASCADE: ações operacionais seguem a instance
