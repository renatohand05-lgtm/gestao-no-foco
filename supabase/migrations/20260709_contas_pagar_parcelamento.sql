-- Migration: Parcelamento em Contas a Pagar
-- Execute manualmente no Supabase SQL Editor
-- Requer: public.contas_pagar
--
-- Corrige bancos criados sem as colunas de parcelamento
-- (parcela_numero, parcela_total, grupo_parcelamento_id).

alter table public.contas_pagar
  add column if not exists grupo_parcelamento_id uuid;

alter table public.contas_pagar
  add column if not exists parcela_numero integer not null default 1;

alter table public.contas_pagar
  add column if not exists parcela_total integer not null default 1;

comment on column public.contas_pagar.grupo_parcelamento_id is
  'Agrupa parcelas do mesmo lançamento';
comment on column public.contas_pagar.parcela_numero is
  'Número da parcela atual (1-based)';
comment on column public.contas_pagar.parcela_total is
  'Quantidade total de parcelas do lançamento';

update public.contas_pagar
set
  parcela_numero = coalesce(parcela_numero, 1),
  parcela_total = coalesce(parcela_total, 1)
where parcela_numero is null
   or parcela_total is null;

alter table public.contas_pagar
  drop constraint if exists contas_pagar_parcela_check;

alter table public.contas_pagar
  add constraint contas_pagar_parcela_check
  check (parcela_numero >= 1 and parcela_total >= 1 and parcela_numero <= parcela_total);

create index if not exists idx_contas_pagar_grupo_parcelamento
  on public.contas_pagar (grupo_parcelamento_id);
