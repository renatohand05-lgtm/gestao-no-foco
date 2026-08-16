-- Sprint 35.2.2 — Provider integration (outbox extra fields + settings + webhook dedupe)
-- Aditivo · idempotente · RLS · tenant-safe · sem DELETE / DROP TABLE
-- NÃO executar automaticamente em production.

-- ---------------------------------------------------------------------------
-- 1) Outbox: rastreio de provider, retries e timestamps (status continua text)
-- ---------------------------------------------------------------------------
alter table public.notification_outbox
  add column if not exists provider text;

alter table public.notification_outbox
  add column if not exists provider_message_id text;

alter table public.notification_outbox
  add column if not exists to_address text;

alter table public.notification_outbox
  add column if not exists queued_at timestamptz;

alter table public.notification_outbox
  add column if not exists sent_at timestamptz;

alter table public.notification_outbox
  add column if not exists delivered_at timestamptz;

alter table public.notification_outbox
  add column if not exists read_at timestamptz;

alter table public.notification_outbox
  add column if not exists failed_at timestamptz;

alter table public.notification_outbox
  add column if not exists attempt_count integer not null default 0;

alter table public.notification_outbox
  add column if not exists last_attempt_at timestamptz;

alter table public.notification_outbox
  add column if not exists error_code text;

create index if not exists idx_notification_outbox_provider_message
  on public.notification_outbox (tenant_id, provider_message_id)
  where provider_message_id is not null;

create index if not exists idx_notification_outbox_to_address
  on public.notification_outbox (tenant_id, to_address, created_at desc)
  where to_address is not null;

comment on column public.notification_outbox.provider_message_id is
  'Sprint 35.2.2 — id sanitizado do provider. Nunca guardar token.';

-- ---------------------------------------------------------------------------
-- 2) Configuração de comunicação por tenant (sem secrets)
-- ---------------------------------------------------------------------------
create table if not exists public.communication_tenant_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  whatsapp_mode text not null default 'disabled',
  email_mode text not null default 'disabled',
  send_appointment_created boolean not null default false,
  send_appointment_reminder boolean not null default false,
  send_appointment_cancelled boolean not null default false,
  send_appointment_rescheduled boolean not null default false,
  send_return boolean not null default false,
  send_service_ready boolean not null default false,
  send_delivery boolean not null default false,
  notify_ready_auto boolean not null default false,
  preferred_channel text not null default 'whatsapp',
  fallback_email boolean not null default false,
  window_start_hour integer not null default 8,
  window_end_hour integer not null default 19,
  reminder_offsets jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id)
);

create index if not exists idx_communication_tenant_settings_tenant
  on public.communication_tenant_settings (tenant_id);

alter table public.communication_tenant_settings enable row level security;

drop policy if exists communication_tenant_settings_tenant_all
  on public.communication_tenant_settings;
create policy communication_tenant_settings_tenant_all
  on public.communication_tenant_settings
  for all using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = communication_tenant_settings.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = communication_tenant_settings.tenant_id
        and tm.user_id = auth.uid()
    )
  );

comment on table public.communication_tenant_settings is
  'Sprint 35.2.2 — preferências de comunicação do tenant. Sem API keys.';

-- ---------------------------------------------------------------------------
-- 3) Dedupe de webhook do provider
-- ---------------------------------------------------------------------------
create table if not exists public.notification_webhook_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants (id) on delete cascade,
  provider text not null,
  event_id text not null,
  event_type text,
  payload_summary jsonb,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

create index if not exists idx_notification_webhook_events_tenant
  on public.notification_webhook_events (tenant_id, created_at desc);

alter table public.notification_webhook_events enable row level security;

drop policy if exists notification_webhook_events_tenant_all
  on public.notification_webhook_events;
create policy notification_webhook_events_tenant_all
  on public.notification_webhook_events
  for all using (
    tenant_id is null
    or exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = notification_webhook_events.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    tenant_id is null
    or exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = notification_webhook_events.tenant_id
        and tm.user_id = auth.uid()
    )
  );

comment on table public.notification_webhook_events is
  'Sprint 35.2.2 — idempotência de webhook. Sem secrets.';
