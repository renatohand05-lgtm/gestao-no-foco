-- =============================================================================
-- DIAGNÓSTICO SOMENTE LEITURA — Sprint 13.19 Oficina OS Enterprise
-- Arquivo: 20260723_diag_oficina_os_enterprise.sql
-- Execute no Supabase SQL Editor ANTES da migration de reparo.
-- NÃO altera dados. NÃO cria objetos.
-- =============================================================================

-- 1) Tabelas candidatas de veículos / OS
select
  c.relname as tabela,
  n.nspname as schema,
  case
    when c.relname in (
      'veiculos', 'clientes_veiculos', 'veiculo', 'frota_veiculos',
      'ordem_servico_veiculos', 'ordens_servico', 'ordem_servico',
      'ordem_servico_itens', 'retornos_servico',
      'ordem_servico_checklist', 'ordem_servico_diagnosticos',
      'ordem_servico_anexos', 'ordem_servico_eventos', 'ordem_servico_previsoes'
    ) then 'esperada_13_19'
    else 'outra'
  end as relevancia
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and (
    c.relname ilike '%veiculo%'
    or c.relname ilike '%ordem%servico%'
    or c.relname ilike '%ordens_servico%'
    or c.relname ilike '%retorno%servico%'
  )
order by c.relname;

-- 2) Existência explícita dos objetos da 13.13 / 13.19
select
  t.tabela,
  to_regclass('public.' || t.tabela) is not null as existe
from (
  values
    ('veiculos'),
    ('ordens_servico'),
    ('ordem_servico'),
    ('ordem_servico_itens'),
    ('retornos_servico'),
    ('ordem_servico_checklist'),
    ('ordem_servico_diagnosticos'),
    ('ordem_servico_anexos'),
    ('ordem_servico_eventos'),
    ('ordem_servico_previsoes'),
    ('clientes'),
    ('vendas'),
    ('produtos'),
    ('profiles'),
    ('centros_custo'),
    ('fornecedores'),
    ('tenants')
) as t(tabela)
order by t.tabela;

-- 3) Colunas enterprise em ordens_servico (se a tabela existir)
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'ordens_servico'
order by ordinal_position;

-- 4) Colunas em veiculos (se existir)
select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'veiculos'
order by ordinal_position;

-- 5) Constraints / checks relacionados
select
  con.conname,
  rel.relname as tabela,
  pg_get_constraintdef(con.oid) as definicao
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace n on n.oid = rel.relnamespace
where n.nspname = 'public'
  and rel.relname in (
    'veiculos', 'ordens_servico', 'ordem_servico_itens', 'retornos_servico',
    'ordem_servico_checklist', 'ordem_servico_diagnosticos',
    'ordem_servico_anexos', 'ordem_servico_eventos', 'ordem_servico_previsoes'
  )
order by rel.relname, con.conname;

-- 6) Índices
select
  schemaname,
  tablename,
  indexname
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'veiculos', 'ordens_servico', 'ordem_servico_itens', 'retornos_servico',
    'ordem_servico_checklist', 'ordem_servico_diagnosticos',
    'ordem_servico_anexos', 'ordem_servico_eventos', 'ordem_servico_previsoes'
  )
order by tablename, indexname;

-- 7) Policies RLS
select
  schemaname,
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'veiculos', 'ordens_servico', 'ordem_servico_itens', 'retornos_servico',
    'ordem_servico_checklist', 'ordem_servico_diagnosticos',
    'ordem_servico_anexos', 'ordem_servico_eventos', 'ordem_servico_previsoes'
  )
order by tablename, policyname;

-- 8) FKs pendentes / existentes para OS
select
  tc.table_name,
  kcu.column_name,
  ccu.table_name as foreign_table,
  ccu.column_name as foreign_column,
  tc.constraint_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
  and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
  and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
  and tc.table_name in (
    'veiculos', 'ordens_servico', 'ordem_servico_itens', 'retornos_servico',
    'ordem_servico_checklist', 'ordem_servico_diagnosticos',
    'ordem_servico_anexos', 'ordem_servico_eventos', 'ordem_servico_previsoes'
  )
order by tc.table_name, kcu.column_name;

-- 9) Resumo rápido (uma linha por checagem)
select
  'veiculos' as objeto,
  case when to_regclass('public.veiculos') is null
    then 'AUSENTE — causa raiz do ERROR 42P01'
    else 'OK'
  end as status
union all
select
  'ordens_servico',
  case when to_regclass('public.ordens_servico') is null
    then 'AUSENTE — aplicar fix (base 20260713 embutida)'
    else 'OK'
  end
union all
select
  'ordem_servico_itens',
  case when to_regclass('public.ordem_servico_itens') is null
    then 'AUSENTE'
    else 'OK'
  end
union all
select
  'retornos_servico',
  case when to_regclass('public.retornos_servico') is null
    then 'AUSENTE'
    else 'OK'
  end
union all
select
  'ordem_servico_checklist',
  case when to_regclass('public.ordem_servico_checklist') is null
    then 'AUSENTE (enterprise)'
    else 'OK (parcial/total 13.19)'
  end
union all
select
  'proxima_acao',
  'Executar 20260723_fix_oficina_os_enterprise.sql';
