-- Migration: quantidade de parcelas na venda (faturamento financeiro)
-- Execute manualmente no Supabase SQL Editor
-- Requer: vendas

alter table public.vendas
  add column if not exists quantidade_parcelas integer not null default 1
    check (quantidade_parcelas >= 1 and quantidade_parcelas <= 48);

comment on column public.vendas.quantidade_parcelas is
  'Número de parcelas geradas em contas a receber ao faturar';
