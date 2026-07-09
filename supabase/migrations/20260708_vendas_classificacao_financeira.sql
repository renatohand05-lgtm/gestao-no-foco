-- Migration: classificação financeira na venda (propagação para contas a receber)
-- Execute manualmente no Supabase SQL Editor
-- Requer: vendas, categorias_financeiras, centros_custo

alter table public.vendas
  add column if not exists categoria_financeira_id uuid
    references public.categorias_financeiras (id) on delete set null,
  add column if not exists centro_custo_id uuid
    references public.centros_custo (id) on delete set null;

create index if not exists idx_vendas_categoria_financeira_id
  on public.vendas (categoria_financeira_id);

create index if not exists idx_vendas_centro_custo_id
  on public.vendas (centro_custo_id);

comment on column public.vendas.categoria_financeira_id is
  'Categoria financeira padrão para títulos gerados ao faturar';

comment on column public.vendas.centro_custo_id is
  'Centro de custo padrão para títulos gerados ao faturar';
