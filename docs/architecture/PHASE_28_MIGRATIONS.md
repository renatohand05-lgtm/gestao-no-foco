# Fase 28 — Migrations (aplicação manual)

**Não executar automaticamente.** Aplicar no SQL Editor do Supabase (tenant/projeto correto).

## Sprint 28.6.1 — hotfix CRM

A migration CRM falhou no Supabase com `42P01 crm_oportunidades does not exist`.  
Arquivo **corrigido e reexecutável**: `20260802_phase28_crm_rbac_fields.sql`  
Detalhes: [`PHASE_28_6_1_CRM_MIGRATION_FIX.md`](./PHASE_28_6_1_CRM_MIGRATION_FIX.md).

**Próximo passo manual (se Agenda/OT/Finance já SUCCESS):** reaplicar **apenas** a CRM corrigida.

## Ordem de aplicação

| # | Arquivo | Domínio | Risco |
|---|---------|---------|-------|
| 0 | *(se ausente)* `20260812_crm_enterprise_fase24.sql` | CRM base (pipeline/oportunidades) | Médio — CRM Phase 28 self-heal cria `crm_oportunidades` se faltar |
| 1 | `20260802_phase28_crm_rbac_fields.sql` | CRM campos lead + opp (+ self-heal) | Baixo (corrigida 28.6.1) |
| 2 | `20260802_phase28_work_order_tipo.sql` | OS `tipo_ordem` + templates | Médio (UI condicional) |
| 3 | `20260802_phase28_agenda_resources.sql` | Agenda recursos/conflitos | Médio |
| 4 | `20260802_phase28_finance_budget.sql` | Orçamento empresarial | Médio |
| 5 | *(pré-existentes se faltarem)* `20260813_supply_chain_enterprise_fase25.sql` | Compras/estoque enterprise | Alto |
| 6 | *(pré-existentes se faltarem)* `20260815_inventory_ledger_lote_serie_fase2543.sql` | Lotes/séries | Alto |

## Rollback

- Soft: não remover colunas em produção sem plano; preferir `UPDATE … SET NULL` / desativar feature flags.
- Hard: `DROP TABLE IF EXISTS` apenas em staging para tabelas **novas** (`finance_budgets*`, `agenda_recursos*`).
- Colunas additive (`tipo_ordem`, CRM consent) — rollback = ignorar na app / default.

## Validação pós-migration

```sql
-- CRM (28.6.1)
select to_regclass('public.crm_oportunidades');
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'clientes'
  and column_name in (
    'consentimento_contato','origem_contato_detalhe','prioridade_crm',
    'valor_potencial','proxima_acao','data_proxima_acao'
  );
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'crm_oportunidades'
  and column_name in ('centro_custo_id','tags');
select conname from pg_constraint where conname = 'crm_oportunidades_centro_custo_fk';

-- OS
select column_name from information_schema.columns
where table_name = 'ordens_servico' and column_name = 'tipo_ordem';

-- Agenda
select to_regclass('public.agenda_recursos');
select to_regclass('public.agenda_eventos');

-- Finance
select to_regclass('public.finance_budgets');
select to_regclass('public.finance_budget_lines');
```

## Limitações

- RLS exige membership em `tenant_members`.
- Regenerar `types/database.ts` após aplicar (manual).
- UI degrada gracefully se schema ausente (`ready: false` / Indisponível).
