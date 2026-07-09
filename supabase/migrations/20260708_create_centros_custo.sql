-- Migration: Centros de Custo (estrutura financeira)
-- Execute manualmente no Supabase SQL Editor

create table if not exists public.centros_custo (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  codigo text not null,
  nome text not null,
  descricao text,
  responsavel text,
  observacoes text,
  ativo boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_centros_custo_tenant_id on public.centros_custo (tenant_id);
create index if not exists idx_centros_custo_deleted_at on public.centros_custo (deleted_at);
create index if not exists idx_centros_custo_codigo on public.centros_custo (codigo);
create index if not exists idx_centros_custo_nome on public.centros_custo (nome);
create index if not exists idx_centros_custo_ativo on public.centros_custo (ativo);

create unique index if not exists centros_custo_tenant_codigo_unique
  on public.centros_custo (tenant_id, codigo)
  where deleted_at is null;

create or replace function public.set_centros_custo_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_centros_custo_updated_at on public.centros_custo;
create trigger trg_centros_custo_updated_at
  before update on public.centros_custo
  for each row execute function public.set_centros_custo_updated_at();

alter table public.centros_custo enable row level security;

drop policy if exists "Membros gerenciam centros de custo da empresa" on public.centros_custo;
create policy "Membros gerenciam centros de custo da empresa"
  on public.centros_custo for all
  using (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = centros_custo.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = centros_custo.tenant_id
        and tm.user_id = auth.uid()
    )
  );

comment on table public.centros_custo is 'Centros de custo operacionais por tenant';
