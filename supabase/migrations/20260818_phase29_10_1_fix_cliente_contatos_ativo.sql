-- =============================================================================
-- Sprint 29.10.1 — Fix cliente_contatos.ativo + índice unique principal
--
-- Causa raiz:
--   20260812_crm_enterprise_fase24.sql criava
--   idx_cliente_contatos_one_principal com predicado `ativo = true`.
--   Se public.cliente_contatos já existia SEM a coluna `ativo`
--   (CREATE TABLE IF NOT EXISTS pulou a definição canônica), o índice
--   falhava com ERROR 42703: column "ativo" does not exist.
--
-- Correção:
--   1) ADD COLUMN IF NOT EXISTS ativo (canônica — types + contato-service)
--   2) Recria índice unique de um principal por cliente de forma defensiva
--
-- Idempotente. NÃO executar automaticamente — aplicar MANUALMENTE se o
-- índice/coluna ainda estiverem ausentes após a falha parcial.
-- =============================================================================

do $$
begin
  if to_regclass('public.cliente_contatos') is null then
    raise notice '29.10.1: public.cliente_contatos ausente — nada a corrigir.';
    return;
  end if;

  -- Coluna canônica (não inventada): CREATE TABLE de 60812 + types/database.ts
  alter table public.cliente_contatos
    add column if not exists ativo boolean not null default true;

  comment on column public.cliente_contatos.ativo is
    '29.10.1 — contato ativo (canônico Fase 24; soft delete permanece em deleted_at).';
end $$;

do $$
begin
  if to_regclass('public.cliente_contatos') is null then
    return;
  end if;

  -- Remove índice se ficou inconsistente / incompleto
  drop index if exists public.idx_cliente_contatos_one_principal;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cliente_contatos'
      and column_name = 'ativo'
  ) then
    execute $idx$
      create unique index if not exists idx_cliente_contatos_one_principal
        on public.cliente_contatos (tenant_id, cliente_id)
        where deleted_at is null and principal = true and ativo = true
    $idx$;
  else
    -- Fallback sem coluna ativo (não deve ocorrer após ADD COLUMN acima)
    execute $idx$
      create unique index if not exists idx_cliente_contatos_one_principal
        on public.cliente_contatos (tenant_id, cliente_id)
        where deleted_at is null and principal = true
    $idx$;
  end if;
end $$;

do $$
begin
  if to_regclass('public.cliente_contatos') is null then
    return;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cliente_contatos'
      and column_name = 'ativo'
  ) and exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'idx_cliente_contatos_one_principal'
  ) then
    raise notice '29.10.1 OK — cliente_contatos.ativo + idx_cliente_contatos_one_principal.';
  else
    raise warning '29.10.1 incompleto — verifique coluna ativo e índice principal.';
  end if;
end $$;
