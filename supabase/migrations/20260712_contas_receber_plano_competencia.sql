-- Migration: plano_conta_id e data_competencia em contas_receber
-- Execute manualmente no Supabase SQL Editor
-- Compatibilidade: colunas de classificação permanecem nullable (registros antigos).
-- data_competencia é backfilled a partir de data_emissao.

alter table public.contas_receber
  add column if not exists plano_conta_id uuid
    references public.plano_contas (id) on delete set null;

alter table public.contas_receber
  add column if not exists data_competencia date;

update public.contas_receber
set data_competencia = data_emissao
where data_competencia is null;

alter table public.contas_receber
  alter column data_competencia set default current_date;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'contas_receber'
      and column_name = 'data_competencia'
      and is_nullable = 'YES'
  ) then
    -- Só força NOT NULL se não houver nulos remanescentes
    if not exists (
      select 1 from public.contas_receber where data_competencia is null
    ) then
      alter table public.contas_receber
        alter column data_competencia set not null;
    end if;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'contas_receber_plano_conta_id_fkey'
      and conrelid = 'public.contas_receber'::regclass
  ) then
    alter table public.contas_receber
      add constraint contas_receber_plano_conta_id_fkey
      foreign key (plano_conta_id)
      references public.plano_contas (id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_contas_receber_plano_conta_id
  on public.contas_receber (plano_conta_id);

create index if not exists idx_contas_receber_data_competencia
  on public.contas_receber (data_competencia);

comment on column public.contas_receber.plano_conta_id is
  'Conta do plano de contas para classificação no DRE por competência';

comment on column public.contas_receber.data_competencia is
  'Data de competência contábil (DRE). Backfill inicial a partir de data_emissao.';
