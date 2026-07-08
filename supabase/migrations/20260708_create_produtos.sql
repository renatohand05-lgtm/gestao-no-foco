-- Migration: módulo Produtos & Serviços
-- Execute manualmente no Supabase SQL Editor

create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  nome text not null,
  tipo text not null default 'produto'
    check (tipo in ('produto', 'servico', 'kit', 'combo', 'materia_prima')),
  codigo_interno text,
  sku text,
  codigo_barras text,
  categoria text,
  subcategoria text,
  marca text,
  unidade_medida text not null default 'UN',
  custo numeric(15, 2),
  preco_venda numeric(15, 2),
  margem_percent numeric(8, 2),
  estoque_atual numeric(15, 3) not null default 0,
  estoque_minimo numeric(15, 3),
  estoque_maximo numeric(15, 3),
  localizacao text,
  fornecedor_principal text,
  observacoes text,
  ativo boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_produtos_tenant_id on public.produtos (tenant_id);
create index if not exists idx_produtos_deleted_at on public.produtos (deleted_at);
create index if not exists idx_produtos_nome on public.produtos (nome);
create index if not exists idx_produtos_tipo on public.produtos (tipo);
create index if not exists idx_produtos_categoria on public.produtos (categoria);
create index if not exists idx_produtos_sku on public.produtos (sku);
create index if not exists idx_produtos_codigo_interno on public.produtos (codigo_interno);
create index if not exists idx_produtos_ativo on public.produtos (ativo);

create unique index if not exists produtos_tenant_sku_unique
  on public.produtos (tenant_id, sku)
  where deleted_at is null and sku is not null;

create unique index if not exists produtos_tenant_codigo_interno_unique
  on public.produtos (tenant_id, codigo_interno)
  where deleted_at is null and codigo_interno is not null;

create unique index if not exists produtos_tenant_codigo_barras_unique
  on public.produtos (tenant_id, codigo_barras)
  where deleted_at is null and codigo_barras is not null;

create or replace function public.set_produtos_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_produtos_updated_at on public.produtos;
create trigger trg_produtos_updated_at
  before update on public.produtos
  for each row execute function public.set_produtos_updated_at();

alter table public.produtos enable row level security;

drop policy if exists "Membros gerenciam produtos da empresa" on public.produtos;
create policy "Membros gerenciam produtos da empresa"
  on public.produtos for all
  using (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = produtos.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = produtos.tenant_id
        and tm.user_id = auth.uid()
    )
  );

comment on table public.produtos is 'Catálogo de produtos, serviços e insumos por tenant';
comment on column public.produtos.margem_percent is 'Margem calculada automaticamente a partir de custo e preço de venda';
