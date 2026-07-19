-- Sprint hotfix — Compatibilidade schema Clientes + Financeiro/Rateio
-- Execute MANUALMENTE no Supabase SQL Editor
-- Idempotente (IF NOT EXISTS). NÃO apaga dados. NÃO altera migrations antigas.
--
-- Causa: código das Sprints 13.15.x / 13.16 / 13.16.1 espera colunas
-- que podem não ter sido aplicadas no remoto (schema cache / migrations manuais).
--
-- Após Run:
--   1) Settings → API → Reload schema (ou execute: NOTIFY pgrst, 'reload schema';)
--   2) Reinicie `npm run dev` se necessário
--   3) Teste criar cliente e estornar conta paga

-- =============================================================================
-- 1) CLIENTES — campos Master Data (origem e segmentação)
-- =============================================================================
alter table public.clientes add column if not exists razao_social text;
alter table public.clientes add column if not exists segmento text;
alter table public.clientes add column if not exists porte text;
alter table public.clientes add column if not exists origem text;

comment on column public.clientes.origem is
  'Origem comercial do cliente (indicação, Google, franquia…). Sprint 13.16.';

-- =============================================================================
-- 2) CONTAS_PAGAR_RATEIOS — descrição opcional (bloqueava estorno/getById)
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

alter table public.contas_pagar_rateios
  add column if not exists descricao text;

alter table public.contas_pagar_rateios
  add column if not exists deleted_at timestamptz;

alter table public.contas_pagar_rateios
  add column if not exists updated_at timestamptz default now();

create index if not exists idx_cp_rateios_tenant
  on public.contas_pagar_rateios (tenant_id)
  where deleted_at is null;

create index if not exists idx_cp_rateios_conta
  on public.contas_pagar_rateios (conta_pagar_id)
  where deleted_at is null;

create unique index if not exists contas_pagar_rateios_unique_centro
  on public.contas_pagar_rateios (conta_pagar_id, centro_custo_id)
  where deleted_at is null;

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

comment on column public.contas_pagar_rateios.descricao is
  'Nota opcional da linha de rateio. Nullable. Sprint 13.15.1 / hotfix 13.16.x.';

-- =============================================================================
-- 3) FORNECEDORES — enrichment Master Data (se 20260719 não rodou)
-- =============================================================================
alter table public.fornecedores add column if not exists nome_fantasia text;
alter table public.fornecedores add column if not exists tipo_pessoa text;
alter table public.fornecedores add column if not exists cep text;
alter table public.fornecedores add column if not exists rua text;
alter table public.fornecedores add column if not exists numero text;
alter table public.fornecedores add column if not exists complemento text;
alter table public.fornecedores add column if not exists bairro text;
alter table public.fornecedores add column if not exists cidade text;
alter table public.fornecedores add column if not exists estado text;
alter table public.fornecedores
  add column if not exists categoria_financeira_id uuid
  references public.categorias_financeiras (id) on delete set null;
alter table public.fornecedores
  add column if not exists plano_conta_id uuid
  references public.plano_contas (id) on delete set null;
alter table public.fornecedores
  add column if not exists centro_custo_id uuid
  references public.centros_custo (id) on delete set null;
alter table public.fornecedores
  add column if not exists forma_pagamento_id uuid
  references public.formas_pagamento (id) on delete set null;
alter table public.fornecedores
  add column if not exists conta_bancaria_id uuid
  references public.contas_bancarias (id) on delete set null;
alter table public.fornecedores add column if not exists prazo_medio_dias integer;
alter table public.fornecedores
  add column if not exists recorrente boolean not null default false;
alter table public.fornecedores add column if not exists frequencia text;
alter table public.fornecedores add column if not exists observacoes text;

-- =============================================================================
-- 4) CENTROS DE CUSTO — campos leves
-- =============================================================================
alter table public.centros_custo add column if not exists tipo text;
alter table public.centros_custo add column if not exists departamento text;
alter table public.centros_custo add column if not exists unidade text;
alter table public.centros_custo add column if not exists filial text;

-- =============================================================================
-- 5) EVENTOS FINANCEIROS (histórico 13.16.1)
-- =============================================================================
create table if not exists public.financeiro_lancamento_eventos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  entity_type text not null
    check (entity_type in ('conta_pagar', 'conta_receber')),
  entity_id uuid not null,
  action text not null,
  motivo text,
  payload_antes jsonb,
  payload_depois jsonb,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_fin_lanc_eventos_entity
  on public.financeiro_lancamento_eventos (tenant_id, entity_type, entity_id, created_at desc);

alter table public.financeiro_lancamento_eventos enable row level security;

drop policy if exists "Membros leem eventos do tenant"
  on public.financeiro_lancamento_eventos;
create policy "Membros leem eventos do tenant"
  on public.financeiro_lancamento_eventos for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = financeiro_lancamento_eventos.tenant_id
        and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Membros inserem eventos do tenant"
  on public.financeiro_lancamento_eventos;
create policy "Membros inserem eventos do tenant"
  on public.financeiro_lancamento_eventos for insert
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = financeiro_lancamento_eventos.tenant_id
        and tm.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 6) TAGS (Master Data) — se ausentes
-- =============================================================================
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  nome text not null,
  slug text not null,
  cor text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists tags_tenant_slug_unique
  on public.tags (tenant_id, slug)
  where deleted_at is null;

alter table public.tags enable row level security;

drop policy if exists "Membros gerenciam tags do tenant" on public.tags;
create policy "Membros gerenciam tags do tenant"
  on public.tags for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tags.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tags.tenant_id and tm.user_id = auth.uid()
    )
  );

create table if not exists public.entity_tags (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  created_at timestamptz not null default now()
);

create unique index if not exists entity_tags_unique
  on public.entity_tags (tenant_id, tag_id, entity_type, entity_id);

alter table public.entity_tags enable row level security;

drop policy if exists "Membros gerenciam entity_tags do tenant"
  on public.entity_tags;
create policy "Membros gerenciam entity_tags do tenant"
  on public.entity_tags for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = entity_tags.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = entity_tags.tenant_id and tm.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 7) Refresh do schema cache do PostgREST (Supabase API)
-- =============================================================================
notify pgrst, 'reload schema';
