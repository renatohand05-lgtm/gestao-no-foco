-- Migration: Plano de Contas (estrutura financeira)
-- Execute manualmente no Supabase SQL Editor

create table if not exists public.plano_contas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  codigo text not null,
  nome text not null,
  tipo text not null
    check (tipo in ('receita', 'despesa', 'ativo', 'passivo', 'patrimonio')),
  natureza text not null default 'analitica'
    check (natureza in ('sintetica', 'analitica')),
  conta_pai_id uuid references public.plano_contas (id) on delete set null,
  aceita_lancamento boolean not null default true,
  ordem integer not null default 0,
  observacoes text,
  ativo boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_plano_contas_tenant_id on public.plano_contas (tenant_id);
create index if not exists idx_plano_contas_deleted_at on public.plano_contas (deleted_at);
create index if not exists idx_plano_contas_codigo on public.plano_contas (codigo);
create index if not exists idx_plano_contas_tipo on public.plano_contas (tipo);
create index if not exists idx_plano_contas_ativo on public.plano_contas (ativo);
create index if not exists idx_plano_contas_conta_pai_id on public.plano_contas (conta_pai_id);

create unique index if not exists plano_contas_tenant_codigo_unique
  on public.plano_contas (tenant_id, codigo)
  where deleted_at is null;

create or replace function public.set_plano_contas_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_plano_contas_updated_at on public.plano_contas;
create trigger trg_plano_contas_updated_at
  before update on public.plano_contas
  for each row execute function public.set_plano_contas_updated_at();

alter table public.plano_contas enable row level security;

drop policy if exists "Membros gerenciam plano de contas da empresa" on public.plano_contas;
create policy "Membros gerenciam plano de contas da empresa"
  on public.plano_contas for all
  using (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = plano_contas.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = plano_contas.tenant_id
        and tm.user_id = auth.uid()
    )
  );

comment on table public.plano_contas is 'Plano de contas contábil por tenant';
