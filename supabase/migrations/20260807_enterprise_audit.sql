-- Migration: Sprint 21.6 / RC1 — Enterprise Audit Events
-- Execute manualmente no Supabase SQL Editor
-- Append-only · actors tipados (user | system | service | integration)

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  -- profile humano apenas quando actor_type = 'user'
  user_id uuid null references public.profiles (id) on delete set null,
  actor_type text not null,
  system_actor_key text null,
  event text not null,
  category text not null,
  severity text not null,
  target_type text null,
  target_id text null,
  resource text null,
  module text null,
  description text null,
  metadata jsonb not null default '{}'::jsonb,
  origin text null,
  correlation_id text null,
  request_id text null,
  session_id text null,
  ip_address text null,
  device text null,
  created_at timestamptz not null default now(),
  constraint audit_events_actor_type_check check (
    actor_type in ('user', 'system', 'service', 'integration')
  ),
  constraint audit_events_actor_shape_check check (
    (
      actor_type = 'user'
      and user_id is not null
      and system_actor_key is null
    )
    or (
      actor_type in ('system', 'service', 'integration')
      and user_id is null
      and system_actor_key is not null
      and char_length(trim(system_actor_key)) > 0
    )
  )
);

create index if not exists idx_audit_events_tenant_id on public.audit_events (tenant_id);
create index if not exists idx_audit_events_created_at on public.audit_events (created_at desc);
create index if not exists idx_audit_events_event on public.audit_events (tenant_id, event);
create index if not exists idx_audit_events_category on public.audit_events (tenant_id, category);
create index if not exists idx_audit_events_severity on public.audit_events (tenant_id, severity);
create index if not exists idx_audit_events_user_id on public.audit_events (tenant_id, user_id);
create index if not exists idx_audit_events_system_actor on public.audit_events (tenant_id, system_actor_key);
create index if not exists idx_audit_events_correlation_id on public.audit_events (tenant_id, correlation_id);
create index if not exists idx_audit_events_request_id on public.audit_events (tenant_id, request_id);
create index if not exists idx_audit_events_target on public.audit_events (tenant_id, target_type, target_id);

comment on table public.audit_events is 'Sprint 21.6 RC1 — auditoria append-only · actors tipados sem profiles fictícios';
