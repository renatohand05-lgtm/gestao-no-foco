-- Sprint 35.2.3 — Production readiness (retry, origin, prefs audit)
-- Aditivo · idempotente · RLS · tenant-safe · sem DELETE / DROP TABLE
-- NÃO executar automaticamente em production.

alter table public.notification_outbox
  add column if not exists next_retry_at timestamptz;

alter table public.notification_outbox
  add column if not exists correlation_id text;

alter table public.notification_outbox
  add column if not exists origin_kind text;

alter table public.notification_outbox
  add column if not exists failure_kind text;

alter table public.notification_outbox
  add column if not exists resend_count integer not null default 0;

create index if not exists idx_notification_outbox_tenant_cliente
  on public.notification_outbox (tenant_id, cliente_id, created_at desc);

create index if not exists idx_notification_outbox_next_retry
  on public.notification_outbox (tenant_id, next_retry_at)
  where next_retry_at is not null;

comment on column public.notification_outbox.correlation_id is
  'Sprint 35.2.3 — id de correlação. Sem tokens.';

alter table public.communication_preferences
  add column if not exists opted_out_origin text;

alter table public.communication_preferences
  add column if not exists opted_out_by uuid;

alter table public.communication_preferences
  add column if not exists channel_updated_at timestamptz;

alter table public.communication_preferences
  add column if not exists channel_updated_by uuid;

comment on column public.communication_preferences.opted_out_origin is
  'Sprint 35.2.3 — origem da alteração (manual/sistema). Sem consentimento fictício.';
