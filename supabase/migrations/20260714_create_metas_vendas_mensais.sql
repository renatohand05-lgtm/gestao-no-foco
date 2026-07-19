-- Migration: Metas mensais de vendas (Sprint 9.8.5)
-- Execute manualmente no Supabase SQL Editor

create table if not exists public.metas_vendas_mensais (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  competencia date not null,
  valor_meta numeric(14, 2) not null check (valor_meta >= 0),
  centro_custo_id uuid references public.centros_custo (id) on delete set null,
  observacao text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (competencia = date_trunc('month', competencia::timestamp)::date)
);

create index if not exists idx_metas_vendas_mensais_tenant_id
  on public.metas_vendas_mensais (tenant_id);

create index if not exists idx_metas_vendas_mensais_competencia
  on public.metas_vendas_mensais (competencia desc);

create index if not exists idx_metas_vendas_mensais_centro_custo_id
  on public.metas_vendas_mensais (centro_custo_id);

create index if not exists idx_metas_vendas_mensais_deleted_at
  on public.metas_vendas_mensais (deleted_at);

create unique index if not exists metas_vendas_mensais_tenant_comp_geral_unique
  on public.metas_vendas_mensais (tenant_id, competencia)
  where deleted_at is null and centro_custo_id is null;

create unique index if not exists metas_vendas_mensais_tenant_comp_centro_unique
  on public.metas_vendas_mensais (tenant_id, competencia, centro_custo_id)
  where deleted_at is null and centro_custo_id is not null;

create or replace function public.set_metas_vendas_mensais_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_metas_vendas_mensais_updated_at on public.metas_vendas_mensais;
create trigger trg_metas_vendas_mensais_updated_at
  before update on public.metas_vendas_mensais
  for each row execute function public.set_metas_vendas_mensais_updated_at();

alter table public.metas_vendas_mensais enable row level security;

drop policy if exists "Membros gerenciam metas de vendas da empresa"
  on public.metas_vendas_mensais;
create policy "Membros gerenciam metas de vendas da empresa"
  on public.metas_vendas_mensais for all
  using (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = metas_vendas_mensais.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = metas_vendas_mensais.tenant_id
        and tm.user_id = auth.uid()
    )
  );

comment on table public.metas_vendas_mensais is
  'Metas mensais de faturamento por tenant (opcionalmente por centro de custo)';
comment on column public.metas_vendas_mensais.competencia is
  'Primeiro dia do mês de competência (YYYY-MM-01)';
