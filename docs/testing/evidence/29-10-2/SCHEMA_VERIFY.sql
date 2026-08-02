-- Sprint 29.10.2 — Verificação MANUAL no Supabase SQL Editor
-- NÃO executar automaticamente pelo agente.

select
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cliente_contatos'
      and column_name = 'ativo'
  ) as coluna_ativo_existe,

  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'cliente_contatos'
      and indexname = 'idx_cliente_contatos_one_principal'
  ) as indice_principal_existe,

  to_regclass('public.compras_pedidos') is not null
    as compras_pedidos_existe;

-- Resultado obrigatório: true / true / true
