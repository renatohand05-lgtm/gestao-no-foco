-- Migration: Contas a Receber (módulo financeiro)
-- Execute manualmente no Supabase SQL Editor
-- Requer: clientes, vendas, formas_pagamento, categorias_financeiras, centros_custo

create table if not exists public.contas_receber (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  numero bigint generated always as identity,
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  venda_id uuid references public.vendas (id) on delete set null,
  forma_pagamento_id uuid references public.formas_pagamento (id) on delete set null,
  categoria_financeira_id uuid references public.categorias_financeiras (id) on delete set null,
  centro_custo_id uuid references public.centros_custo (id) on delete set null,
  descricao text not null,
  grupo_parcelamento_id uuid,
  parcela_numero integer not null default 1 check (parcela_numero >= 1),
  parcela_total integer not null default 1 check (parcela_total >= 1),
  status text not null default 'aberto'
    check (status in ('aberto', 'recebido', 'vencido', 'cancelado')),
  valor_original numeric(15, 2) not null check (valor_original >= 0),
  desconto numeric(15, 2) not null default 0 check (desconto >= 0),
  juros numeric(15, 2) not null default 0 check (juros >= 0),
  multa numeric(15, 2) not null default 0 check (multa >= 0),
  valor_recebido numeric(15, 2) not null default 0 check (valor_recebido >= 0),
  data_emissao date not null default current_date,
  data_vencimento date not null,
  data_recebimento date,
  observacoes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contas_receber_parcela_check check (parcela_numero <= parcela_total)
);

create index if not exists idx_contas_receber_tenant_id on public.contas_receber (tenant_id);
create index if not exists idx_contas_receber_deleted_at on public.contas_receber (deleted_at);
create index if not exists idx_contas_receber_cliente_id on public.contas_receber (cliente_id);
create index if not exists idx_contas_receber_venda_id on public.contas_receber (venda_id);
create index if not exists idx_contas_receber_status on public.contas_receber (status);
create index if not exists idx_contas_receber_data_vencimento on public.contas_receber (data_vencimento);
create index if not exists idx_contas_receber_grupo_parcelamento on public.contas_receber (grupo_parcelamento_id);
create index if not exists idx_contas_receber_numero on public.contas_receber (numero);

create unique index if not exists contas_receber_tenant_venda_parcela_unique
  on public.contas_receber (tenant_id, venda_id, parcela_numero)
  where deleted_at is null and venda_id is not null;

create or replace function public.set_contas_receber_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_contas_receber_updated_at on public.contas_receber;
create trigger trg_contas_receber_updated_at
  before update on public.contas_receber
  for each row execute function public.set_contas_receber_updated_at();

alter table public.contas_receber enable row level security;

drop policy if exists "Membros gerenciam contas a receber da empresa" on public.contas_receber;
create policy "Membros gerenciam contas a receber da empresa"
  on public.contas_receber for all
  using (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = contas_receber.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = contas_receber.tenant_id
        and tm.user_id = auth.uid()
    )
  );

comment on table public.contas_receber is 'Títulos a receber por tenant';
comment on column public.contas_receber.grupo_parcelamento_id is 'Agrupa parcelas do mesmo lançamento';
