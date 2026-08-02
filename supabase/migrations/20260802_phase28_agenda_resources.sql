-- =============================================================================
-- Fase 28.5 — Agenda Enterprise (recursos + eventos unificados)
-- Compatível com cliente_agendamentos; eventos podem vincular cliente/OS
-- Idempotente · NÃO executar automaticamente
-- =============================================================================

create table if not exists public.agenda_recursos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  nome text not null,
  tipo text not null default 'profissional',
  -- profissional | equipe | sala | equipamento | box | elevador | veiculo | outro
  capacidade integer not null default 1,
  ativo boolean not null default true,
  empresa_id uuid,
  filial_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_agenda_recursos_tenant
  on public.agenda_recursos (tenant_id)
  where deleted_at is null;

create table if not exists public.agenda_eventos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  titulo text not null,
  tipo text not null default 'compromisso',
  status text not null default 'agendado',
  inicio timestamptz not null,
  fim timestamptz not null,
  dia_inteiro boolean not null default false,
  responsavel_id uuid,
  recurso_id uuid references public.agenda_recursos (id),
  cliente_id uuid,
  ordem_servico_id uuid,
  venda_id uuid,
  origem text,
  observacao text,
  endereco text,
  recorrencia_json jsonb,
  override_conflito boolean not null default false,
  override_justificativa text,
  empresa_id uuid,
  filial_id uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint agenda_eventos_intervalo check (fim > inicio)
);

create index if not exists idx_agenda_eventos_tenant_inicio
  on public.agenda_eventos (tenant_id, inicio)
  where deleted_at is null;

create index if not exists idx_agenda_eventos_recurso
  on public.agenda_eventos (recurso_id, inicio)
  where deleted_at is null;

alter table public.agenda_recursos enable row level security;
alter table public.agenda_eventos enable row level security;

drop policy if exists agenda_recursos_tenant_all on public.agenda_recursos;
create policy agenda_recursos_tenant_all on public.agenda_recursos
  for all using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = agenda_recursos.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = agenda_recursos.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists agenda_eventos_tenant_all on public.agenda_eventos;
create policy agenda_eventos_tenant_all on public.agenda_eventos
  for all using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = agenda_eventos.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = agenda_eventos.tenant_id and tm.user_id = auth.uid()
    )
  );

comment on table public.agenda_eventos is
  'Fase 28.5 — agenda operacional/comercial. Google/Outlook = aguardando integração.';
