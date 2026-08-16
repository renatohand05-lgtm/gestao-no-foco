-- Sprint 35.2 — Agenda (naturezas) + retornos previstos + comunicação
-- Aditivo · idempotente · RLS · tenant-safe · sem DELETE
-- NÃO executar automaticamente em production.

-- ---------------------------------------------------------------------------
-- 1) Agenda: colunas opcionais (natureza + serviço + duração)
-- ---------------------------------------------------------------------------
alter table public.agenda_eventos
  add column if not exists natureza text;

alter table public.agenda_eventos
  add column if not exists servico_id uuid;

alter table public.agenda_eventos
  add column if not exists duracao_minutos integer;

alter table public.agenda_eventos
  add column if not exists lembrete_minutos integer;

alter table public.agenda_eventos
  add column if not exists meeting_url text;

alter table public.agenda_eventos
  add column if not exists participantes_json jsonb;

alter table public.agenda_eventos
  add column if not exists return_id uuid;

comment on column public.agenda_eventos.natureza is
  'Sprint 35.2 — cliente | negocio | interno. Sem coluna: inferir de origem/tipo/cliente_id.';

create index if not exists idx_agenda_eventos_tenant_natureza
  on public.agenda_eventos (tenant_id, natureza, inicio)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- 2) Regras de retorno por serviço (não força todos os produtos)
-- ---------------------------------------------------------------------------
create table if not exists public.service_return_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  produto_id uuid not null,
  return_enabled boolean not null default false,
  return_type text not null default 'data',
  interval_days integer,
  interval_months integer,
  mileage_km integer,
  hide_procedure boolean not null default false,
  message_template text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, produto_id)
);

create index if not exists idx_service_return_rules_tenant
  on public.service_return_rules (tenant_id);

alter table public.service_return_rules enable row level security;

drop policy if exists service_return_rules_tenant_all on public.service_return_rules;
create policy service_return_rules_tenant_all on public.service_return_rules
  for all using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = service_return_rules.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = service_return_rules.tenant_id and tm.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 3) Retorno previsto (≠ agendamento; não reserva horário)
-- ---------------------------------------------------------------------------
create table if not exists public.customer_returns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  cliente_id uuid not null,
  produto_id uuid,
  origem_tipo text,
  origem_id uuid,
  profissional_id uuid,
  veiculo_id uuid,
  due_at date not null,
  motivo text,
  observacao text,
  status text not null default 'previsto',
  canal_preferido text,
  regra_origem text,
  last_km integer,
  next_km integer,
  placa text,
  veiculo_label text,
  last_service_label text,
  last_visit_at date,
  estimated_value numeric,
  hide_procedure boolean not null default false,
  preferred_channel text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  contacted_at timestamptz,
  responded_at timestamptz,
  appointment_id uuid
);

create index if not exists idx_customer_returns_tenant_due
  on public.customer_returns (tenant_id, due_at, status);

create index if not exists idx_customer_returns_tenant_cliente
  on public.customer_returns (tenant_id, cliente_id, due_at);

alter table public.customer_returns enable row level security;

drop policy if exists customer_returns_tenant_all on public.customer_returns;
create policy customer_returns_tenant_all on public.customer_returns
  for all using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = customer_returns.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = customer_returns.tenant_id and tm.user_id = auth.uid()
    )
  );

comment on table public.customer_returns is
  'Sprint 35.2 — retorno previsto operacional. Nunca cria slot de agenda automaticamente.';

-- ---------------------------------------------------------------------------
-- 4) Preferências de comunicação / opt-out
-- ---------------------------------------------------------------------------
create table if not exists public.communication_preferences (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  cliente_id uuid not null,
  whatsapp_enabled boolean not null default true,
  email_enabled boolean not null default true,
  opted_out_at timestamptz,
  opted_out_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, cliente_id)
);

create index if not exists idx_communication_preferences_tenant
  on public.communication_preferences (tenant_id);

alter table public.communication_preferences enable row level security;

drop policy if exists communication_preferences_tenant_all on public.communication_preferences;
create policy communication_preferences_tenant_all on public.communication_preferences
  for all using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = communication_preferences.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = communication_preferences.tenant_id and tm.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 5) Outbox persistente (sem setTimeout)
-- ---------------------------------------------------------------------------
create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  cliente_id uuid,
  channel text not null,
  template_code text not null,
  offset_key text,
  entity_type text not null,
  entity_id uuid,
  status text not null default 'pending',
  mode text not null default 'dry_run',
  idempotency_key text not null,
  payload_json jsonb,
  rendered_preview text,
  error_message text,
  created_by uuid,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (tenant_id, idempotency_key)
);

create index if not exists idx_notification_outbox_tenant_status
  on public.notification_outbox (tenant_id, status, created_at);

alter table public.notification_outbox enable row level security;

drop policy if exists notification_outbox_tenant_all on public.notification_outbox;
create policy notification_outbox_tenant_all on public.notification_outbox
  for all using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = notification_outbox.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = notification_outbox.tenant_id and tm.user_id = auth.uid()
    )
  );

comment on table public.notification_outbox is
  'Sprint 35.2 — fila de comunicação. Default DRY_RUN. Nunca fingir DELIVERED.';
