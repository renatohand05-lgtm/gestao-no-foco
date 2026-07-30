-- Fase 24 / Sprint 24.1 — CRM Enterprise (corrigida, idempotente)
-- Aplicar MANUALMENTE no Supabase SQL Editor.
-- NÃO executar automaticamente pelo agente.
--
-- NÃO duplica: clientes, vendas, OS, contas, auditoria, anexos, users, empresas, filiais.
-- Extensões: contatos (filho), pipeline stages, oportunidades, histórico de etapas.

/* ─── 1. Colunas no cadastro ÚNICO de clientes ──────────────── */

alter table public.clientes
  add column if not exists empresa_id uuid,
  add column if not exists filial_id uuid,
  add column if not exists nome_fantasia text,
  add column if not exists ie_rg text,
  add column if not exists valor_estimado numeric(14, 2),
  add column if not exists probabilidade integer,
  add column if not exists data_prevista_fechamento date,
  add column if not exists data_fechamento date,
  add column if not exists motivo_perda text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'clientes_probabilidade_check'
  ) then
    alter table public.clientes
      add constraint clientes_probabilidade_check
      check (probabilidade is null or (probabilidade >= 0 and probabilidade <= 100));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'clientes_valor_estimado_check'
  ) then
    alter table public.clientes
      add constraint clientes_valor_estimado_check
      check (valor_estimado is null or valor_estimado >= 0);
  end if;
end $$;

comment on column public.clientes.empresa_id is 'Empresa responsável (UUID lógico multiempresa)';
comment on column public.clientes.filial_id is 'Filial responsável (UUID lógico multifilial)';
comment on column public.clientes.nome_fantasia is 'Nome fantasia (PJ)';
comment on column public.clientes.ie_rg is 'IE (PJ) ou RG (PF)';
comment on column public.clientes.valor_estimado is 'Valor estimado da oportunidade no funil (opcional)';
comment on column public.clientes.probabilidade is 'Probabilidade 0–100 da oportunidade (opcional)';
comment on column public.clientes.motivo_perda is 'Motivo quando estagio_funil = perdido';

create index if not exists idx_clientes_empresa
  on public.clientes (tenant_id, empresa_id)
  where deleted_at is null and empresa_id is not null;

create index if not exists idx_clientes_filial
  on public.clientes (tenant_id, filial_id)
  where deleted_at is null and filial_id is not null;

/* ─── 2. Contatos múltiplos (filho de clientes) ─────────────── */

create table if not exists public.cliente_contatos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  nome text not null,
  cargo text,
  email text,
  telefone text,
  whatsapp text,
  principal boolean not null default false,
  ativo boolean not null default true,
  observacoes text,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_cliente_contatos_cliente
  on public.cliente_contatos (tenant_id, cliente_id)
  where deleted_at is null;

create unique index if not exists idx_cliente_contatos_one_principal
  on public.cliente_contatos (tenant_id, cliente_id)
  where deleted_at is null and principal = true and ativo = true;

alter table public.cliente_contatos enable row level security;

drop policy if exists "Membros gerenciam contatos CRM" on public.cliente_contatos;
create policy "Membros gerenciam contatos CRM"
  on public.cliente_contatos for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = cliente_contatos.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = cliente_contatos.tenant_id and tm.user_id = auth.uid()
    )
  );

/* ─── 3. Pipeline configurável por tenant/empresa ──────────── */

create table if not exists public.crm_pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  empresa_id uuid,
  stage_key text not null
    check (stage_key ~ '^[a-z][a-z0-9_]{0,62}$'),
  label text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  color text,
  probabilidade_padrao integer
    check (probabilidade_padrao is null or (probabilidade_padrao >= 0 and probabilidade_padrao <= 100)),
  is_won boolean not null default false,
  is_lost boolean not null default false,
  is_default_pipeline boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_pipeline_stages_won_lost_distinct
    check (not (is_won and is_lost))
);

-- unique parcial: empresa_id null = pipeline padrão do tenant
create unique index if not exists idx_crm_pipeline_stages_unique_null_empresa
  on public.crm_pipeline_stages (tenant_id, stage_key)
  where empresa_id is null;

create unique index if not exists idx_crm_pipeline_stages_unique_empresa
  on public.crm_pipeline_stages (tenant_id, empresa_id, stage_key)
  where empresa_id is not null;

create index if not exists idx_crm_pipeline_stages_tenant
  on public.crm_pipeline_stages (tenant_id, empresa_id, sort_order)
  where active = true;

alter table public.crm_pipeline_stages enable row level security;

drop policy if exists "Membros gerenciam pipeline CRM" on public.crm_pipeline_stages;
create policy "Membros gerenciam pipeline CRM"
  on public.crm_pipeline_stages for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = crm_pipeline_stages.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = crm_pipeline_stages.tenant_id and tm.user_id = auth.uid()
    )
  );

/* ─── 4. Oportunidades (vinculadas ao cliente — sem 2ª base) ── */

create table if not exists public.crm_oportunidades (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  empresa_id uuid,
  filial_id uuid,
  titulo text not null,
  stage_key text not null default 'lead',
  valor_estimado numeric(14, 2)
    check (valor_estimado is null or valor_estimado >= 0),
  probabilidade integer
    check (probabilidade is null or (probabilidade >= 0 and probabilidade <= 100)),
  data_prevista date,
  data_fechamento date,
  origem text,
  responsavel_id uuid references public.profiles (id) on delete set null,
  produto_servico text,
  status text not null default 'aberta'
    check (status in ('aberta', 'ganha', 'perdida', 'cancelada')),
  motivo_perda text,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint crm_oportunidades_ganha_tem_fechamento
    check (status <> 'ganha' or data_fechamento is not null)
);

create index if not exists idx_crm_oportunidades_tenant_cliente
  on public.crm_oportunidades (tenant_id, cliente_id)
  where deleted_at is null;

create index if not exists idx_crm_oportunidades_stage
  on public.crm_oportunidades (tenant_id, stage_key, status)
  where deleted_at is null;

alter table public.crm_oportunidades enable row level security;

drop policy if exists "Membros gerenciam oportunidades CRM" on public.crm_oportunidades;
create policy "Membros gerenciam oportunidades CRM"
  on public.crm_oportunidades for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = crm_oportunidades.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = crm_oportunidades.tenant_id and tm.user_id = auth.uid()
    )
  );

/* ─── 5. Histórico de movimentação de etapas ───────────────── */

create table if not exists public.crm_stage_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  cliente_id uuid references public.clientes (id) on delete cascade,
  oportunidade_id uuid references public.crm_oportunidades (id) on delete cascade,
  from_stage text,
  to_stage text not null,
  motivo text,
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint crm_stage_movements_target
    check (cliente_id is not null or oportunidade_id is not null)
);

create index if not exists idx_crm_stage_movements_cliente
  on public.crm_stage_movements (tenant_id, cliente_id, created_at desc);

create index if not exists idx_crm_stage_movements_opp
  on public.crm_stage_movements (tenant_id, oportunidade_id, created_at desc);

alter table public.crm_stage_movements enable row level security;

drop policy if exists "Membros leem movimentos CRM" on public.crm_stage_movements;
create policy "Membros leem movimentos CRM"
  on public.crm_stage_movements for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = crm_stage_movements.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Membros inserem movimentos CRM" on public.crm_stage_movements;
create policy "Membros inserem movimentos CRM"
  on public.crm_stage_movements for insert
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = crm_stage_movements.tenant_id and tm.user_id = auth.uid()
    )
  );

/* ─── 6. Ampliar tipos de agenda ───────────────────────────── */

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'cliente_agendamentos'
  ) then
    alter table public.cliente_agendamentos drop constraint if exists cliente_agendamentos_tipo_check;
    alter table public.cliente_agendamentos
      add constraint cliente_agendamentos_tipo_check
      check (tipo in (
        'visita', 'ligacao', 'reuniao', 'whatsapp', 'cobranca',
        'retorno', 'follow_up', 'lembrete', 'tarefa', 'outro'
      ));
  end if;
end $$;

comment on table public.crm_pipeline_stages is 'Sprint 24.1 — etapas configuráveis; seed/fallback no app';
comment on table public.cliente_contatos is 'Sprint 24.1 — contatos do cliente; não substitui public.clientes';
comment on table public.crm_oportunidades is 'Sprint 24.1 — oportunidades vinculadas a clientes';
comment on table public.crm_stage_movements is 'Sprint 24.1 — histórico de mudança de etapa';
