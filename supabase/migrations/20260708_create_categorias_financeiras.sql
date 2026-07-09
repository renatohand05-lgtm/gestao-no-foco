-- Migration: Categorias Financeiras (estrutura financeira)
-- Execute manualmente no Supabase SQL Editor
-- Requer: plano_contas (opcional via FK)

create table if not exists public.categorias_financeiras (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  nome text not null,
  tipo text not null
    check (tipo in ('receita', 'despesa', 'ambos')),
  plano_conta_id uuid references public.plano_contas (id) on delete set null,
  cor text,
  observacoes text,
  ativo boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_categorias_financeiras_tenant_id on public.categorias_financeiras (tenant_id);
create index if not exists idx_categorias_financeiras_deleted_at on public.categorias_financeiras (deleted_at);
create index if not exists idx_categorias_financeiras_nome on public.categorias_financeiras (nome);
create index if not exists idx_categorias_financeiras_tipo on public.categorias_financeiras (tipo);
create index if not exists idx_categorias_financeiras_ativo on public.categorias_financeiras (ativo);
create index if not exists idx_categorias_financeiras_plano_conta_id on public.categorias_financeiras (plano_conta_id);

create unique index if not exists categorias_financeiras_tenant_nome_tipo_unique
  on public.categorias_financeiras (tenant_id, nome, tipo)
  where deleted_at is null;

create or replace function public.set_categorias_financeiras_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_categorias_financeiras_updated_at on public.categorias_financeiras;
create trigger trg_categorias_financeiras_updated_at
  before update on public.categorias_financeiras
  for each row execute function public.set_categorias_financeiras_updated_at();

alter table public.categorias_financeiras enable row level security;

drop policy if exists "Membros gerenciam categorias financeiras da empresa" on public.categorias_financeiras;
create policy "Membros gerenciam categorias financeiras da empresa"
  on public.categorias_financeiras for all
  using (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = categorias_financeiras.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = categorias_financeiras.tenant_id
        and tm.user_id = auth.uid()
    )
  );

comment on table public.categorias_financeiras is 'Categorias gerenciais de receita e despesa por tenant';
