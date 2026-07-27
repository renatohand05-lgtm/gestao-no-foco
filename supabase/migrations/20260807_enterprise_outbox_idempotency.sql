-- Migration: Sprint 21.6 / RC1 — Outbox + Idempotency
-- locked_by (processor identity) · sem UPDATE client · claim via DEFINER RPC

create table if not exists public.enterprise_outbox (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  event_type text not null,
  aggregate_type text not null,
  aggregate_id text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  correlation_id text null,
  request_id text null,
  available_at timestamptz not null default now(),
  locked_at timestamptz null,
  locked_by text null,
  processed_at timestamptz null,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enterprise_outbox_status_check check (
    status in ('pending', 'processing', 'completed', 'failed', 'dead')
  ),
  constraint enterprise_outbox_lock_shape_check check (
    (
      status = 'processing'
      and locked_at is not null
      and locked_by is not null
      and char_length(trim(locked_by)) > 0
    )
    or (
      status <> 'processing'
      and locked_by is null
    )
  )
);

create table if not exists public.enterprise_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  idempotency_key text not null,
  operation text not null,
  request_hash text not null,
  response_snapshot jsonb null,
  status text not null default 'pending',
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enterprise_idempotency_unique unique (tenant_id, idempotency_key, operation),
  constraint enterprise_idempotency_status_check check (
    status in ('pending', 'processing', 'completed', 'failed')
  )
);

create index if not exists idx_enterprise_outbox_claim
  on public.enterprise_outbox (tenant_id, status, available_at);
create index if not exists idx_enterprise_outbox_locked_by
  on public.enterprise_outbox (tenant_id, locked_by)
  where locked_by is not null;
create index if not exists idx_enterprise_outbox_correlation
  on public.enterprise_outbox (tenant_id, correlation_id);
create index if not exists idx_enterprise_idempotency_expires
  on public.enterprise_idempotency_keys (tenant_id, expires_at);

comment on table public.enterprise_outbox is
  'Sprint 21.6 RC1 — outbox server-only; mutações apenas via RPC DEFINER';
comment on column public.enterprise_outbox.locked_by is
  'Identidade do processor que possui o lock (obrigatório em processing)';
comment on table public.enterprise_idempotency_keys is
  'Sprint 21.6 RC1 — idempotência UNIQUE(tenant, key, operation); resolução via RPC';
