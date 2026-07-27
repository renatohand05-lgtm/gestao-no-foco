-- Migration: Sprint 21.6 — Enterprise Notifications persistence
-- Execute manualmente no Supabase SQL Editor
-- Revisado: unique parcial templates · delivery attempts RESTRICT · dedupe parcial

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  event text not null,
  category text not null,
  priority text not null default 'normal',
  title text not null,
  message text not null,
  status text not null,
  template_id text null,
  source text null,
  metadata jsonb not null default '{}'::jsonb,
  correlation_id text null,
  request_id text null,
  scheduled_at timestamptz null,
  expires_at timestamptz null,
  deduplication_key text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists notifications_tenant_dedupe_uidx
  on public.notifications (tenant_id, deduplication_key)
  where deduplication_key is not null;

create table if not exists public.notification_recipients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  notification_id uuid not null references public.notifications (id) on delete cascade,
  recipient_type text not null,
  recipient_id text not null,
  channel text not null,
  status text not null,
  read_at timestamptz null,
  delivered_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tentativas append-only: RESTRICT impede apagar notification com attempts
create table if not exists public.notification_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  notification_id uuid not null references public.notifications (id) on delete restrict,
  notification_recipient_id uuid null references public.notification_recipients (id) on delete set null,
  channel text not null,
  attempt_number integer not null default 1,
  status text not null,
  error_code text null,
  error_message text null,
  response_metadata jsonb not null default '{}'::jsonb,
  next_attempt_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  enabled_channels jsonb not null default '[]'::jsonb,
  allowed_categories jsonb not null default '[]'::jsonb,
  minimum_priority text not null default 'low',
  quiet_hours jsonb not null default '{}'::jsonb,
  digest_mode text null,
  language text null,
  timezone text null,
  opt_out boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_preferences_user_unique unique (tenant_id, user_id)
);

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid null references public.tenants (id) on delete cascade,
  template_key text not null,
  version text not null,
  event text not null,
  category text not null,
  supported_channels jsonb not null default '[]'::jsonb,
  title_template text not null,
  message_template text not null,
  variables_schema jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_templates_key_not_blank check (char_length(trim(template_key)) > 0),
  constraint notification_templates_version_not_blank check (char_length(trim(version)) > 0)
);

create unique index if not exists notification_templates_global_key_version_uidx
  on public.notification_templates (template_key, version)
  where tenant_id is null;

create unique index if not exists notification_templates_tenant_key_version_uidx
  on public.notification_templates (tenant_id, template_key, version)
  where tenant_id is not null;

create index if not exists idx_notifications_tenant on public.notifications (tenant_id);
create index if not exists idx_notifications_dedupe on public.notifications (tenant_id, deduplication_key);
create index if not exists idx_notifications_correlation on public.notifications (tenant_id, correlation_id);
create index if not exists idx_notification_recipients_user on public.notification_recipients (tenant_id, recipient_id);
create index if not exists idx_notification_recipients_unread on public.notification_recipients (tenant_id, recipient_id) where read_at is null;
create index if not exists idx_notification_attempts_notif on public.notification_delivery_attempts (tenant_id, notification_id);
