-- Canal de WhatsApp próprio por tenant (Evolution API / não-oficial)
-- Aditivo · idempotente · RLS · tenant-safe · sem DELETE / DROP TABLE
-- Uso restrito: notificações transacionais (OS pronta, agendamento) — não é
-- disparo em massa/marketing. Fila com throttling reduz risco de bloqueio.

-- ---------------------------------------------------------------------------
-- 1) Canal (uma instância Evolution API por tenant)
-- ---------------------------------------------------------------------------
create table if not exists public.tenant_whatsapp_channels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  instance_name text not null,
  evolution_instance_id text,
  instance_token text,
  status text not null default 'pending'
    check (status in ('pending', 'qr_pending', 'connected', 'disconnected', 'banned', 'error')),
  phone_number text,
  last_error text,
  qr_generated_at timestamptz,
  connected_at timestamptz,
  disconnected_at timestamptz,
  first_send_at timestamptz,
  messages_sent_today integer not null default 0,
  daily_counter_date date,
  daily_send_limit integer not null default 40,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id),
  unique (instance_name)
);

create index if not exists idx_tenant_whatsapp_channels_tenant
  on public.tenant_whatsapp_channels (tenant_id);

comment on table public.tenant_whatsapp_channels is
  'Um canal WhatsApp (Evolution API) por tenant. instance_token nunca deve ser logado.';
comment on column public.tenant_whatsapp_channels.daily_send_limit is
  'Teto diário por instância — cresce gradualmente após conexão (warm-up) para reduzir risco de bloqueio.';

alter table public.tenant_whatsapp_channels enable row level security;

drop policy if exists tenant_whatsapp_channels_select on public.tenant_whatsapp_channels;
create policy tenant_whatsapp_channels_select
  on public.tenant_whatsapp_channels
  for select using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tenant_whatsapp_channels.tenant_id
        and tm.user_id = (select auth.uid())
    )
  );

drop policy if exists tenant_whatsapp_channels_insert on public.tenant_whatsapp_channels;
create policy tenant_whatsapp_channels_insert
  on public.tenant_whatsapp_channels
  for insert with check (public.is_tenant_admin(tenant_id));

drop policy if exists tenant_whatsapp_channels_update on public.tenant_whatsapp_channels;
create policy tenant_whatsapp_channels_update
  on public.tenant_whatsapp_channels
  for update using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

drop policy if exists tenant_whatsapp_channels_delete on public.tenant_whatsapp_channels;
create policy tenant_whatsapp_channels_delete
  on public.tenant_whatsapp_channels
  for delete using (public.is_tenant_admin(tenant_id));

-- Somente o backend (service role, que não passa por RLS) grava instance_token
-- e o lê para enviar mensagens; o app nunca deve selecionar essa coluna para o
-- client-side. Documentado aqui, aplicado em código (server actions/routes).

-- ---------------------------------------------------------------------------
-- 2) Fila de envio (throttling + warm-up) — desacopla "decidiu enviar" de
--    "enviou de fato", para controlar ritmo e evitar padrão de disparo em
--    massa que a Meta/WhatsApp detecta como spam.
-- ---------------------------------------------------------------------------
create table if not exists public.whatsapp_send_queue (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  channel_id uuid not null references public.tenant_whatsapp_channels (id) on delete cascade,
  outbox_id uuid references public.notification_outbox (id) on delete set null,
  to_address text not null,
  body text not null,
  status text not null default 'queued'
    check (status in ('queued', 'sending', 'sent', 'failed', 'cancelled')),
  scheduled_for timestamptz not null default now(),
  attempt_count integer not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_send_queue_dispatch
  on public.whatsapp_send_queue (status, scheduled_for)
  where status = 'queued';

create index if not exists idx_whatsapp_send_queue_tenant
  on public.whatsapp_send_queue (tenant_id, created_at desc);

comment on table public.whatsapp_send_queue is
  'Fila de despacho throttled do canal WhatsApp por tenant. Um worker processa em ritmo controlado (delay aleatório, respeita daily_send_limit e horário comercial).';

alter table public.whatsapp_send_queue enable row level security;

drop policy if exists whatsapp_send_queue_select on public.whatsapp_send_queue;
create policy whatsapp_send_queue_select
  on public.whatsapp_send_queue
  for select using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = whatsapp_send_queue.tenant_id
        and tm.user_id = (select auth.uid())
    )
  );

-- Sem policy de insert/update/delete para authenticated: a fila só é escrita
-- pelo backend com service role (server actions / rotas internas / worker).

drop trigger if exists trg_tenant_whatsapp_channels_updated_at on public.tenant_whatsapp_channels;
create trigger trg_tenant_whatsapp_channels_updated_at
  before update on public.tenant_whatsapp_channels
  for each row execute function public.set_updated_at();

drop trigger if exists trg_whatsapp_send_queue_updated_at on public.whatsapp_send_queue;
create trigger trg_whatsapp_send_queue_updated_at
  before update on public.whatsapp_send_queue
  for each row execute function public.set_updated_at();
