-- Sprint 13.17 — Incremental: colunas de recorrência ausentes no remoto
-- Execute MANUALMENTE no Supabase SQL Editor (após 20260717 / 20260721).
-- Idempotente. NÃO apaga dados. NÃO altera migrations antigas.
--
-- Drift detectado por: npm run audit:schema -- --live
--   - contas_pagar.despesa_recorrente_id
--   - despesas_recorrentes.proxima_competencia
--   - despesas_recorrentes.ocorrencias_geradas
--   - despesas_recorrentes.pausada
--
-- Após Run:
--   NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- 1) despesas_recorrentes — controles de geração
-- =============================================================================
alter table public.despesas_recorrentes
  add column if not exists ocorrencias_geradas integer not null default 0;

alter table public.despesas_recorrentes
  add column if not exists proxima_competencia date;

alter table public.despesas_recorrentes
  add column if not exists pausada boolean not null default false;

alter table public.despesas_recorrentes
  add column if not exists max_ocorrencias integer;

alter table public.despesas_recorrentes
  add column if not exists forma_pagamento_id uuid;

create index if not exists idx_despesas_recorrentes_proxima
  on public.despesas_recorrentes (tenant_id, proxima_competencia)
  where deleted_at is null and ativo = true and pausada = false;

-- =============================================================================
-- 2) contas_pagar — vínculo com série recorrente
-- =============================================================================
alter table public.contas_pagar
  add column if not exists despesa_recorrente_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'contas_pagar_despesa_recorrente_fkey'
  ) then
    alter table public.contas_pagar
      add constraint contas_pagar_despesa_recorrente_fkey
      foreign key (despesa_recorrente_id)
      references public.despesas_recorrentes (id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_contas_pagar_recorrente
  on public.contas_pagar (despesa_recorrente_id)
  where deleted_at is null and despesa_recorrente_id is not null;

comment on column public.contas_pagar.despesa_recorrente_id is
  'Vínculo com série de despesa recorrente (Sprint 13.15 / release gate 13.17).';

-- =============================================================================
-- 3) Reload PostgREST schema cache
-- =============================================================================
notify pgrst, 'reload schema';
