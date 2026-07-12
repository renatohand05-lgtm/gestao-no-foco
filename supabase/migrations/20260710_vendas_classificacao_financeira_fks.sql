-- Migration: garantir FKs de classificação financeira em vendas
-- Execute manualmente no Supabase SQL Editor
--
-- Contexto: 20260708_vendas_classificacao_financeira.sql usa
--   ADD COLUMN IF NOT EXISTS ... REFERENCES ...
-- Se a coluna já existia sem FK, o IF NOT EXISTS pula a adição e a
-- constraint nunca é criada. PostgREST então falha embeds como
--   categoria_financeira:categorias_financeiras (...)
-- com: Could not find a relationship between 'vendas' and 'categorias_financeiras'

alter table public.vendas
  add column if not exists categoria_financeira_id uuid;

alter table public.vendas
  add column if not exists centro_custo_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vendas_categoria_financeira_id_fkey'
      and conrelid = 'public.vendas'::regclass
  ) then
    alter table public.vendas
      add constraint vendas_categoria_financeira_id_fkey
      foreign key (categoria_financeira_id)
      references public.categorias_financeiras (id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'vendas_centro_custo_id_fkey'
      and conrelid = 'public.vendas'::regclass
  ) then
    alter table public.vendas
      add constraint vendas_centro_custo_id_fkey
      foreign key (centro_custo_id)
      references public.centros_custo (id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_vendas_categoria_financeira_id
  on public.vendas (categoria_financeira_id);

create index if not exists idx_vendas_centro_custo_id
  on public.vendas (centro_custo_id);

comment on column public.vendas.categoria_financeira_id is
  'Categoria financeira padrão para títulos gerados ao faturar';

comment on column public.vendas.centro_custo_id is
  'Centro de custo padrão para títulos gerados ao faturar';
