-- =============================================================================
-- Fase 28.6 — Orçamento empresarial (orçado × realizado)
-- NÃO altera engines DRE/Fluxo · Idempotente · aplicação manual
-- =============================================================================

create table if not exists public.finance_budgets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  nome text not null,
  ano integer not null,
  versao integer not null default 1,
  status text not null default 'rascunho',
  -- rascunho | em_revisao | aprovado | encerrado
  empresa_id uuid,
  filial_id uuid,
  observacao text,
  aprovado_por uuid,
  aprovado_em timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, ano, versao)
);

create table if not exists public.finance_budget_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  budget_id uuid not null references public.finance_budgets (id) on delete cascade,
  mes integer not null check (mes between 1 and 12),
  natureza text not null default 'despesa',
  -- receita | custo | despesa | investimento | divida | caixa
  categoria_id uuid,
  centro_custo_id uuid,
  centro_resultado_id uuid,
  plano_conta_id uuid,
  valor_orcado numeric(14, 2) not null default 0,
  justificativa text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_finance_budgets_tenant_ano
  on public.finance_budgets (tenant_id, ano)
  where deleted_at is null;

create index if not exists idx_finance_budget_lines_budget
  on public.finance_budget_lines (budget_id, mes)
  where deleted_at is null;

-- Centros de resultado (consolidação P&L operacional)
create table if not exists public.centros_resultado (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  nome text not null,
  codigo text,
  responsavel_id uuid,
  filial_id uuid,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, nome)
);

alter table public.finance_budgets enable row level security;
alter table public.finance_budget_lines enable row level security;
alter table public.centros_resultado enable row level security;

drop policy if exists finance_budgets_tenant_all on public.finance_budgets;
create policy finance_budgets_tenant_all on public.finance_budgets
  for all using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = finance_budgets.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = finance_budgets.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists finance_budget_lines_tenant_all on public.finance_budget_lines;
create policy finance_budget_lines_tenant_all on public.finance_budget_lines
  for all using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = finance_budget_lines.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = finance_budget_lines.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists centros_resultado_tenant_all on public.centros_resultado;
create policy centros_resultado_tenant_all on public.centros_resultado
  for all using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = centros_resultado.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = centros_resultado.tenant_id and tm.user_id = auth.uid()
    )
  );

comment on table public.finance_budgets is
  'Fase 28.6 — orçamento empresarial. Realizado vem de DRE/Fluxo canônicos (leitura).';
