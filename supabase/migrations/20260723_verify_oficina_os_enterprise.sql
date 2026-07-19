-- =============================================================================
-- VERIFICAÇÃO PÓS-FIX — Sprint 13.19 (somente leitura + reload cache)
-- Arquivo: 20260723_verify_oficina_os_enterprise.sql
--
-- Execute no SQL Editor do MESMO projeto Supabase apontado por .env.local.
-- Se as tabelas existirem no Postgres mas a API falhar com "schema cache",
-- este script força NOTIFY pgrst.
-- Se alguma tabela estiver ausente, ABORTA com lista clara (reexecutar o fix).
-- =============================================================================

do $$
declare
  missing text[] := array[]::text[];
  t text;
  tables text[] := array[
    'veiculos',
    'ordens_servico',
    'ordem_servico_itens',
    'ordem_servico_checklist',
    'ordem_servico_diagnosticos',
    'ordem_servico_anexos',
    'ordem_servico_eventos',
    'ordem_servico_previsoes',
    'retornos_servico'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is null then
      missing := array_append(missing, t);
    end if;
  end loop;

  if array_length(missing, 1) is not null then
    raise exception
      'Sprint 13.19 INCOMPLETA no Postgres. Ausentes: %. Reexecute 20260723_fix_oficina_os_enterprise.sql neste projeto.',
      array_to_string(missing, ', ');
  end if;

  raise notice 'OK: todas as 9 tabelas OS existem em public.';
end $$;

-- Integridade rápida (contagens de metadados)
select
  c.relname as tabela,
  (select count(*) from pg_attribute a
    where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped) as colunas,
  (select count(*) from pg_constraint con where con.conrelid = c.oid) as constraints,
  (select count(*) from pg_indexes i where i.schemaname = 'public' and i.tablename = c.relname) as indices,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'veiculos', 'ordens_servico', 'ordem_servico_itens', 'retornos_servico',
    'ordem_servico_checklist', 'ordem_servico_diagnosticos',
    'ordem_servico_anexos', 'ordem_servico_eventos', 'ordem_servico_previsoes'
  )
order by c.relname;

-- Policies
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'veiculos', 'ordens_servico', 'ordem_servico_itens', 'retornos_servico',
    'ordem_servico_checklist', 'ordem_servico_diagnosticos',
    'ordem_servico_anexos', 'ordem_servico_eventos', 'ordem_servico_previsoes'
  )
order by tablename, policyname;

-- Colunas tenant_id / deleted_at
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'veiculos', 'ordens_servico', 'ordem_servico_itens', 'retornos_servico',
    'ordem_servico_checklist', 'ordem_servico_diagnosticos',
    'ordem_servico_anexos', 'ordem_servico_eventos', 'ordem_servico_previsoes'
  )
  and column_name in ('tenant_id', 'deleted_at')
order by table_name, column_name;

-- Força refresh do PostgREST (necessário para a API enxergar tabelas novas)
notify pgrst, 'reload schema';

select 'NOTIFY pgrst enviado — aguarde ~5s e rode: npm run audit:schema -- --live' as proximo_passo;
