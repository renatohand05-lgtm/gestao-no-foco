-- Sprint 13.15 / 13.15.1 — DRE Enterprise classification, rateio, recorrência
-- Execute MANUALMENTE no Supabase SQL Editor (não rodar automaticamente em produção)
--
-- Procedimento:
--   1) Abrir o projeto no Supabase → SQL Editor
--   2) Colar este arquivo completo
--   3) Run
--   4) Em Categorias Financeiras → “Aplicar sugestões DRE”
--   5) Revisar pendentes e validar o DRE de uma competência
--
-- Idempotente: IF NOT EXISTS / DROP CONSTRAINT IF EXISTS / DROP POLICY IF EXISTS
-- NÃO apaga dados existentes.

-- =============================================================================
-- 1) Linha do DRE no plano de contas
-- =============================================================================
alter table public.plano_contas
  add column if not exists dre_linha text;

alter table public.plano_contas
  drop constraint if exists plano_contas_dre_linha_check;

alter table public.plano_contas
  add constraint plano_contas_dre_linha_check
  check (
    dre_linha is null
    or dre_linha in (
      'receita_bruta',
      'deducoes',
      'cmv',
      'despesas_pessoal',
      'despesas_operacionais',
      'despesas_comerciais',
      'depreciacao_amortizacao',
      'receitas_financeiras',
      'despesas_financeiras',
      'impostos_lucro'
    )
  );

create index if not exists idx_plano_contas_dre_linha
  on public.plano_contas (tenant_id, dre_linha)
  where deleted_at is null and dre_linha is not null;

comment on column public.plano_contas.dre_linha is
  'Linha do DRE por competência. Pagamentos/caixa NÃO usam este campo.';

-- =============================================================================
-- 2) Override opcional na categoria
-- =============================================================================
alter table public.categorias_financeiras
  add column if not exists dre_linha text;

alter table public.categorias_financeiras
  drop constraint if exists categorias_financeiras_dre_linha_check;

alter table public.categorias_financeiras
  add constraint categorias_financeiras_dre_linha_check
  check (
    dre_linha is null
    or dre_linha in (
      'receita_bruta',
      'deducoes',
      'cmv',
      'despesas_pessoal',
      'despesas_operacionais',
      'despesas_comerciais',
      'depreciacao_amortizacao',
      'receitas_financeiras',
      'despesas_financeiras',
      'impostos_lucro'
    )
  );

create index if not exists idx_categorias_dre_linha
  on public.categorias_financeiras (tenant_id, dre_linha)
  where deleted_at is null and dre_linha is not null;

-- =============================================================================
-- 3) Rateio de contas a pagar
-- =============================================================================
create table if not exists public.contas_pagar_rateios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  conta_pagar_id uuid not null references public.contas_pagar (id) on delete cascade,
  centro_custo_id uuid not null references public.centros_custo (id),
  percentual numeric(8, 4) not null
    check (percentual > 0 and percentual <= 100),
  valor numeric(14, 2) not null
    check (valor >= 0),
  descricao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Coluna descricao (se tabela já existia sem ela)
alter table public.contas_pagar_rateios
  add column if not exists descricao text;

create index if not exists idx_cp_rateios_tenant
  on public.contas_pagar_rateios (tenant_id)
  where deleted_at is null;

create index if not exists idx_cp_rateios_conta
  on public.contas_pagar_rateios (conta_pagar_id)
  where deleted_at is null;

create unique index if not exists contas_pagar_rateios_unique_centro
  on public.contas_pagar_rateios (conta_pagar_id, centro_custo_id)
  where deleted_at is null;

create or replace function public.set_contas_pagar_rateios_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_contas_pagar_rateios_updated_at
  on public.contas_pagar_rateios;
create trigger trg_contas_pagar_rateios_updated_at
  before update on public.contas_pagar_rateios
  for each row execute function public.set_contas_pagar_rateios_updated_at();

alter table public.contas_pagar_rateios enable row level security;

drop policy if exists "Membros gerenciam rateios do tenant"
  on public.contas_pagar_rateios;
create policy "Membros gerenciam rateios do tenant"
  on public.contas_pagar_rateios for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = contas_pagar_rateios.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = contas_pagar_rateios.tenant_id
        and tm.user_id = auth.uid()
    )
  );

comment on table public.contas_pagar_rateios is
  'Rateio de AP por centro. Soma dos percentuais ativos de uma conta deve ser 100%.';

-- =============================================================================
-- 4) Templates de recorrência
-- =============================================================================
create table if not exists public.despesas_recorrentes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  descricao text not null,
  fornecedor_id uuid references public.fornecedores (id),
  fornecedor_nome text,
  categoria_financeira_id uuid references public.categorias_financeiras (id),
  plano_conta_id uuid references public.plano_contas (id),
  centro_custo_id uuid references public.centros_custo (id),
  forma_pagamento_id uuid,
  valor numeric(14, 2) not null check (valor > 0),
  dia_vencimento integer not null default 10
    check (dia_vencimento between 1 and 28),
  inicia_em date not null,
  termina_em date,
  max_ocorrencias integer
    check (max_ocorrencias is null or max_ocorrencias > 0),
  ocorrencias_geradas integer not null default 0
    check (ocorrencias_geradas >= 0),
  proxima_competencia date,
  pausada boolean not null default false,
  ativo boolean not null default true,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint despesas_recorrentes_termino_check
    check (termina_em is null or termina_em >= inicia_em)
);

alter table public.despesas_recorrentes
  add column if not exists forma_pagamento_id uuid;
alter table public.despesas_recorrentes
  add column if not exists max_ocorrencias integer;
alter table public.despesas_recorrentes
  add column if not exists ocorrencias_geradas integer not null default 0;
alter table public.despesas_recorrentes
  add column if not exists proxima_competencia date;
alter table public.despesas_recorrentes
  add column if not exists pausada boolean not null default false;

create index if not exists idx_despesas_recorrentes_tenant
  on public.despesas_recorrentes (tenant_id)
  where deleted_at is null;

create index if not exists idx_despesas_recorrentes_proxima
  on public.despesas_recorrentes (tenant_id, proxima_competencia)
  where deleted_at is null and ativo = true and pausada = false;

create or replace function public.set_despesas_recorrentes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_despesas_recorrentes_updated_at
  on public.despesas_recorrentes;
create trigger trg_despesas_recorrentes_updated_at
  before update on public.despesas_recorrentes
  for each row execute function public.set_despesas_recorrentes_updated_at();

alter table public.despesas_recorrentes enable row level security;

drop policy if exists "Membros gerenciam recorrencias do tenant"
  on public.despesas_recorrentes;
create policy "Membros gerenciam recorrencias do tenant"
  on public.despesas_recorrentes for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = despesas_recorrentes.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = despesas_recorrentes.tenant_id
        and tm.user_id = auth.uid()
    )
  );

comment on table public.despesas_recorrentes is
  'Série recorrente mensal. Gera Contas a Pagar por competência — NÃO gera movimentação bancária.';

-- =============================================================================
-- 5) Vínculo CP ← recorrência (rastreabilidade, sem duplicar motor de caixa)
-- =============================================================================
alter table public.contas_pagar
  add column if not exists despesa_recorrente_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'contas_pagar_despesa_recorrente_fkey'
  ) then
    alter table public.contas_pagar
      add constraint contas_pagar_despesa_recorrente_fkey
      foreign key (despesa_recorrente_id)
      references public.despesas_recorrentes (id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_contas_pagar_recorrente
  on public.contas_pagar (despesa_recorrente_id)
  where deleted_at is null and despesa_recorrente_id is not null;
