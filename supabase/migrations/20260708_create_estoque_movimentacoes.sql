-- Migration: módulo Estoque — movimentações
-- Execute manualmente no Supabase SQL Editor

create table if not exists public.estoque_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  produto_id uuid not null references public.produtos (id) on delete restrict,
  tipo text not null check (tipo in ('entrada', 'saida', 'ajuste')),
  quantidade numeric(15, 3) not null check (quantidade >= 0),
  quantidade_anterior numeric(15, 3) not null default 0,
  quantidade_nova numeric(15, 3) not null default 0,
  motivo text,
  origem text not null default 'manual',
  observacoes text,
  created_by uuid references public.profiles (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_estoque_movimentacoes_tenant_id
  on public.estoque_movimentacoes (tenant_id);
create index if not exists idx_estoque_movimentacoes_produto_id
  on public.estoque_movimentacoes (produto_id);
create index if not exists idx_estoque_movimentacoes_tipo
  on public.estoque_movimentacoes (tipo);
create index if not exists idx_estoque_movimentacoes_created_at
  on public.estoque_movimentacoes (created_at desc);
create index if not exists idx_estoque_movimentacoes_deleted_at
  on public.estoque_movimentacoes (deleted_at);

alter table public.estoque_movimentacoes enable row level security;

drop policy if exists "Membros gerenciam estoque da empresa" on public.estoque_movimentacoes;
create policy "Membros gerenciam estoque da empresa"
  on public.estoque_movimentacoes for all
  using (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = estoque_movimentacoes.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = estoque_movimentacoes.tenant_id
        and tm.user_id = auth.uid()
    )
  );

comment on table public.estoque_movimentacoes is 'Histórico de movimentações de estoque por produto e tenant';
comment on column public.estoque_movimentacoes.quantidade is 'Entrada/saída: quantidade movimentada. Ajuste: nova quantidade definida.';
