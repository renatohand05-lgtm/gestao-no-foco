-- Migration: Sprint 21.6 / RC1 — Enterprise Approval persistence
-- Actors tipados · unique parcial · decisions/history RESTRICT

create table if not exists public.approval_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid null references public.tenants (id) on delete cascade,
  approval_key text not null,
  version text not null,
  name text not null,
  description text null,
  definition jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint approval_definitions_key_not_blank check (char_length(trim(approval_key)) > 0),
  constraint approval_definitions_version_not_blank check (char_length(trim(version)) > 0)
);

create unique index if not exists approval_definitions_global_key_version_uidx
  on public.approval_definitions (approval_key, version)
  where tenant_id is null;

create unique index if not exists approval_definitions_tenant_key_version_uidx
  on public.approval_definitions (tenant_id, approval_key, version)
  where tenant_id is not null;

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  approval_definition_id uuid not null references public.approval_definitions (id) on delete restrict,
  approval_key text not null,
  approval_version text not null,
  requester_actor_type text not null default 'user',
  requester_id uuid null references public.profiles (id) on delete restrict,
  requester_system_key text null,
  target_type text null,
  target_id text null,
  amount numeric null,
  currency text null,
  current_level text null,
  status text not null,
  data jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  correlation_id text null,
  expires_at timestamptz null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint approval_requests_requester_type_check check (
    requester_actor_type in ('user', 'system', 'service', 'integration')
  ),
  constraint approval_requests_requester_shape_check check (
    (
      requester_actor_type = 'user'
      and requester_id is not null
      and requester_system_key is null
    )
    or (
      requester_actor_type in ('system', 'service', 'integration')
      and requester_id is null
      and requester_system_key is not null
      and char_length(trim(requester_system_key)) > 0
    )
  )
);

create table if not exists public.approval_decisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  approval_request_id uuid not null references public.approval_requests (id) on delete restrict,
  level_id text null,
  approver_actor_type text not null default 'user',
  approver_id uuid null references public.profiles (id) on delete restrict,
  approver_system_key text null,
  approver_role text null,
  decision text not null,
  reason text null,
  metadata jsonb not null default '{}'::jsonb,
  correlation_id text null,
  request_id text null,
  created_at timestamptz not null default now(),
  constraint approval_decisions_approver_type_check check (
    approver_actor_type in ('user', 'system', 'service', 'integration')
  ),
  constraint approval_decisions_approver_shape_check check (
    (
      approver_actor_type = 'user'
      and approver_id is not null
      and approver_system_key is null
    )
    or (
      approver_actor_type in ('system', 'service', 'integration')
      and approver_id is null
      and approver_system_key is not null
      and char_length(trim(approver_system_key)) > 0
    )
  )
);

create table if not exists public.approval_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  approval_request_id uuid not null references public.approval_requests (id) on delete restrict,
  previous_status text null,
  new_status text not null,
  event text not null,
  actor_type text not null default 'user',
  actor_id uuid null references public.profiles (id) on delete set null,
  system_actor_key text null,
  reason text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint approval_history_actor_type_check check (
    actor_type in ('user', 'system', 'service', 'integration')
  ),
  constraint approval_history_actor_shape_check check (
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

create table if not exists public.approval_pending_actions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  approval_request_id uuid not null references public.approval_requests (id) on delete cascade,
  action_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  attempts integer not null default 0,
  scheduled_at timestamptz null,
  processed_at timestamptz null,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_approval_requests_tenant on public.approval_requests (tenant_id);
create index if not exists idx_approval_requests_status on public.approval_requests (tenant_id, status);
create index if not exists idx_approval_requests_correlation on public.approval_requests (tenant_id, correlation_id);
create index if not exists idx_approval_requests_definition on public.approval_requests (approval_definition_id);
create index if not exists idx_approval_decisions_request on public.approval_decisions (tenant_id, approval_request_id);
create index if not exists idx_approval_history_request on public.approval_history (tenant_id, approval_request_id);
create index if not exists idx_approval_pending_status on public.approval_pending_actions (tenant_id, status);

-- FK/ON DELETE:
-- request→definition RESTRICT | decision/history→request RESTRICT (imutáveis)
-- pending→request CASCADE (operacional)
-- requester_id/approver_id → profiles RESTRICT quando user (nullable para system)
