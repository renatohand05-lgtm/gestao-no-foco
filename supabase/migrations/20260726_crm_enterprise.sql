-- Sprint 14 — CRM Enterprise
-- Execute manualmente no Supabase SQL Editor após migrations de clientes/tags.

/* ─── Clientes: campos CRM ─────────────────────────────────── */

alter table public.clientes
  add column if not exists classificacao text,
  add column if not exists score numeric(5, 2) not null default 0
    check (score >= 0 and score <= 100),
  add column if not exists consultor_id uuid references public.profiles (id) on delete set null,
  add column if not exists estagio_funil text not null default 'lead'
    check (estagio_funil in (
      'lead', 'contato', 'proposta', 'negociacao', 'fechado', 'perdido'
    ));

create index if not exists idx_clientes_estagio_funil
  on public.clientes (tenant_id, estagio_funil)
  where deleted_at is null;

create index if not exists idx_clientes_consultor
  on public.clientes (tenant_id, consultor_id)
  where deleted_at is null and consultor_id is not null;

create index if not exists idx_clientes_score
  on public.clientes (tenant_id, score desc)
  where deleted_at is null;

comment on column public.clientes.classificacao is 'Classificação comercial (A/B/C ou custom)';
comment on column public.clientes.score is 'Score de relacionamento 0–100';
comment on column public.clientes.consultor_id is 'Consultor/vendedor responsável (profiles.id)';
comment on column public.clientes.estagio_funil is 'Estágio no funil comercial Kanban';

/* ─── Timeline de atividades ───────────────────────────────── */

create table if not exists public.cliente_eventos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  tipo text not null,
  titulo text not null,
  descricao text,
  referencia_tipo text,
  referencia_id uuid,
  payload jsonb not null default '{}'::jsonb,
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_cliente_eventos_cliente
  on public.cliente_eventos (tenant_id, cliente_id, created_at desc);

alter table public.cliente_eventos enable row level security;

drop policy if exists "Membros gerenciam eventos CRM" on public.cliente_eventos;
create policy "Membros gerenciam eventos CRM"
  on public.cliente_eventos for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = cliente_eventos.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = cliente_eventos.tenant_id and tm.user_id = auth.uid()
    )
  );

/* ─── Tarefas CRM ──────────────────────────────────────────── */

create table if not exists public.cliente_tarefas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  tipo text not null default 'ligar'
    check (tipo in ('ligar', 'proposta', 'cobranca', 'revisao', 'whatsapp', 'outro')),
  titulo text not null,
  descricao text,
  status text not null default 'pendente'
    check (status in ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  prioridade text not null default 'normal'
    check (prioridade in ('baixa', 'normal', 'alta', 'urgente')),
  data_vencimento timestamptz,
  responsavel_id uuid references public.profiles (id) on delete set null,
  concluida_em timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cliente_tarefas_cliente
  on public.cliente_tarefas (tenant_id, cliente_id, status)
  where deleted_at is null;

create index if not exists idx_cliente_tarefas_vencimento
  on public.cliente_tarefas (tenant_id, data_vencimento)
  where deleted_at is null and status in ('pendente', 'em_andamento');

alter table public.cliente_tarefas enable row level security;

drop policy if exists "Membros gerenciam tarefas CRM" on public.cliente_tarefas;
create policy "Membros gerenciam tarefas CRM"
  on public.cliente_tarefas for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = cliente_tarefas.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = cliente_tarefas.tenant_id and tm.user_id = auth.uid()
    )
  );

create or replace function public.set_cliente_tarefas_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_cliente_tarefas_updated_at on public.cliente_tarefas;
create trigger trg_cliente_tarefas_updated_at
  before update on public.cliente_tarefas
  for each row execute function public.set_cliente_tarefas_updated_at();

/* ─── Agenda de relacionamento ─────────────────────────────── */

create table if not exists public.cliente_agendamentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  titulo text not null,
  descricao text,
  tipo text not null default 'visita'
    check (tipo in ('visita', 'ligacao', 'reuniao', 'whatsapp', 'cobranca', 'outro')),
  inicio timestamptz not null,
  fim timestamptz,
  local text,
  responsavel_id uuid references public.profiles (id) on delete set null,
  status text not null default 'agendado'
    check (status in ('agendado', 'realizado', 'cancelado', 'reagendado')),
  lembrete_minutos integer,
  created_by uuid references public.profiles (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cliente_agendamentos_fim_after_inicio
    check (fim is null or fim >= inicio)
);

create index if not exists idx_cliente_agendamentos_cliente
  on public.cliente_agendamentos (tenant_id, cliente_id, inicio)
  where deleted_at is null;

create index if not exists idx_cliente_agendamentos_calendario
  on public.cliente_agendamentos (tenant_id, inicio, fim)
  where deleted_at is null and status = 'agendado';

alter table public.cliente_agendamentos enable row level security;

drop policy if exists "Membros gerenciam agenda CRM" on public.cliente_agendamentos;
create policy "Membros gerenciam agenda CRM"
  on public.cliente_agendamentos for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = cliente_agendamentos.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = cliente_agendamentos.tenant_id and tm.user_id = auth.uid()
    )
  );

create or replace function public.set_cliente_agendamentos_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_cliente_agendamentos_updated_at on public.cliente_agendamentos;
create trigger trg_cliente_agendamentos_updated_at
  before update on public.cliente_agendamentos
  for each row execute function public.set_cliente_agendamentos_updated_at();

comment on table public.cliente_eventos is 'Timeline CRM do cliente';
comment on table public.cliente_tarefas is 'Tarefas comerciais vinculadas ao cliente';
comment on table public.cliente_agendamentos is 'Agenda de relacionamento com clientes';

notify pgrst, 'reload schema';
