-- Migration: módulo Vendas Enterprise
-- Execute manualmente no Supabase SQL Editor

create table if not exists public.vendas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  numero bigint generated always as identity,
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  data_venda date not null default current_date,
  status text not null default 'orcamento'
    check (status in ('orcamento', 'em_andamento', 'faturado', 'cancelado')),
  subtotal numeric(15, 2) not null default 0,
  desconto_total numeric(15, 2) not null default 0 check (desconto_total >= 0),
  total numeric(15, 2) not null default 0,
  margem_total numeric(15, 2),
  forma_pagamento text,
  observacoes text,
  created_by uuid references public.profiles (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.venda_itens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  venda_id uuid not null references public.vendas (id) on delete cascade,
  produto_id uuid references public.produtos (id) on delete restrict,
  descricao text not null,
  tipo_item text not null default 'produto'
    check (tipo_item in ('produto', 'servico', 'kit', 'combo', 'materia_prima')),
  quantidade numeric(15, 3) not null check (quantidade > 0),
  preco_unitario numeric(15, 2) not null check (preco_unitario >= 0),
  desconto numeric(15, 2) not null default 0 check (desconto >= 0),
  total numeric(15, 2) not null default 0,
  custo_unitario numeric(15, 2),
  margem numeric(15, 2),
  ordem int not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_vendas_tenant_id on public.vendas (tenant_id);
create index if not exists idx_vendas_cliente_id on public.vendas (cliente_id);
create index if not exists idx_vendas_status on public.vendas (status);
create index if not exists idx_vendas_numero on public.vendas (numero);
create index if not exists idx_vendas_data_venda on public.vendas (data_venda desc);
create index if not exists idx_vendas_deleted_at on public.vendas (deleted_at);
create index if not exists idx_vendas_created_at on public.vendas (created_at desc);

create index if not exists idx_venda_itens_tenant_id on public.venda_itens (tenant_id);
create index if not exists idx_venda_itens_venda_id on public.venda_itens (venda_id);
create index if not exists idx_venda_itens_produto_id on public.venda_itens (produto_id);
create index if not exists idx_venda_itens_deleted_at on public.venda_itens (deleted_at);

create or replace function public.set_vendas_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_vendas_updated_at on public.vendas;
create trigger trg_vendas_updated_at
  before update on public.vendas
  for each row execute function public.set_vendas_updated_at();

alter table public.vendas enable row level security;
alter table public.venda_itens enable row level security;

drop policy if exists "Membros gerenciam vendas da empresa" on public.vendas;
create policy "Membros gerenciam vendas da empresa"
  on public.vendas for all
  using (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = vendas.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = vendas.tenant_id
        and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Membros gerenciam itens de venda da empresa" on public.venda_itens;
create policy "Membros gerenciam itens de venda da empresa"
  on public.venda_itens for all
  using (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = venda_itens.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = venda_itens.tenant_id
        and tm.user_id = auth.uid()
    )
  );

comment on table public.vendas is 'Pedidos, orçamentos e vendas faturadas por tenant';
comment on table public.venda_itens is 'Itens de linha de cada venda';
comment on column public.vendas.numero is 'Número sequencial global da venda';
