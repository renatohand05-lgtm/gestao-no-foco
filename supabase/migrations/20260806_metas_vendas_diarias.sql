-- Metas diárias (override manual / escopos) sem apagar histórico.
-- Rateio automático da mensal continua no app quando não houver override vigente.

create table if not exists public.metas_vendas_diarias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  data date not null,
  valor_meta numeric(14, 2) not null check (valor_meta >= 0),
  centro_custo_id uuid null references public.centros_custo (id) on delete set null,
  vendedor_id uuid null references public.profiles (id) on delete set null,
  equipe_id uuid null,
  mecanico_id uuid null,
  origem text not null default 'manual'
    check (origem in ('manual', 'rateio')),
  observacao text null,
  created_by uuid null references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists idx_metas_vendas_diarias_tenant_data
  on public.metas_vendas_diarias (tenant_id, data desc);

create index if not exists idx_metas_vendas_diarias_deleted
  on public.metas_vendas_diarias (deleted_at);

-- Uma meta geral vigente por tenant+data (sem escopos).
create unique index if not exists metas_vendas_diarias_geral_unique
  on public.metas_vendas_diarias (tenant_id, data)
  where deleted_at is null
    and centro_custo_id is null
    and vendedor_id is null
    and equipe_id is null
    and mecanico_id is null;

-- Escopo por centro.
create unique index if not exists metas_vendas_diarias_centro_unique
  on public.metas_vendas_diarias (tenant_id, data, centro_custo_id)
  where deleted_at is null and centro_custo_id is not null
    and vendedor_id is null and equipe_id is null and mecanico_id is null;

-- Escopo por vendedor.
create unique index if not exists metas_vendas_diarias_vendedor_unique
  on public.metas_vendas_diarias (tenant_id, data, vendedor_id)
  where deleted_at is null and vendedor_id is not null
    and centro_custo_id is null and equipe_id is null and mecanico_id is null;

create or replace function public.set_metas_vendas_diarias_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_metas_vendas_diarias_updated_at on public.metas_vendas_diarias;
create trigger trg_metas_vendas_diarias_updated_at
  before update on public.metas_vendas_diarias
  for each row execute function public.set_metas_vendas_diarias_updated_at();

alter table public.metas_vendas_diarias enable row level security;

drop policy if exists metas_vendas_diarias_tenant_isolation on public.metas_vendas_diarias;
create policy metas_vendas_diarias_tenant_isolation
  on public.metas_vendas_diarias for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = metas_vendas_diarias.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = metas_vendas_diarias.tenant_id
        and tm.user_id = auth.uid()
    )
  );

comment on table public.metas_vendas_diarias is
  'Override de meta diária por data/escopo. Soft-delete preserva histórico. Sem override = rateio da meta mensal.';

-- Dias fechados / feriados do tenant (opcional; meta 0 no rateio).
create table if not exists public.tenant_dias_fechados (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  data date not null,
  motivo text null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz null,
  unique (tenant_id, data)
);

alter table public.tenant_dias_fechados enable row level security;

drop policy if exists tenant_dias_fechados_isolation on public.tenant_dias_fechados;
create policy tenant_dias_fechados_isolation
  on public.tenant_dias_fechados for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tenant_dias_fechados.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tenant_dias_fechados.tenant_id
        and tm.user_id = auth.uid()
    )
  );

comment on table public.tenant_dias_fechados is
  'Datas sem operação (feriado/fechamento). Rateio de meta diária usa 0 nesses dias, salvo override manual.';
