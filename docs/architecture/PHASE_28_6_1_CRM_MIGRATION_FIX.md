# Sprint 28.6.1 — Correção da migration CRM

## Causa raiz

`ERROR: 42P01: relation "public.crm_oportunidades" does not exist`

O bloco DO da migration `20260802_phase28_crm_rbac_fields.sql` verificava apenas a existência de `centros_custo` e do nome da constraint, e então executava:

```sql
alter table public.crm_oportunidades
  add constraint crm_oportunidades_centro_custo_fk ...
```

sem `to_regclass('public.crm_oportunidades')`.

## Tabela canônica

| Conceito | Relação real |
|----------|----------------|
| Oportunidades | **`public.crm_oportunidades`** |
| Leads | **`public.clientes`** (`estagio_funil = 'lead'`) — sem tabela `leads` |
| Pipeline stages | `public.crm_pipeline_stages` (Fase 24) |
| Movimentos | `public.crm_stage_movements` (Fase 24) |

Não existem aliases `oportunidades`, `crm_opportunities` ou `oportunidades_crm` no schema canônico.

Código: `lib/crm/enterprise/oportunidade-service.ts`  
Types: `types/database.ts` → `crm_oportunidades`  
Criação original: `supabase/migrations/20260812_crm_enterprise_fase24.sql`

## Classificação

A tabela **deveria** existir (migration Fase 24). Neste projeto Supabase ela **não** estava aplicada. A migration Fase 28 assumiu a tabela e falhou no FK.

## Execução parcial da tentativa anterior

| Trecho | Provável estado |
|--------|-----------------|
| Colunas em `clientes` (`consentimento_contato`, `origem_contato_detalhe`, `prioridade_crm`, `valor_potencial`, `proxima_acao`, `data_proxima_acao`) | **Já aplicadas** (rodaram antes da falha) |
| Comentários em `clientes` | **Já aplicados** |
| Colunas `crm_oportunidades.centro_custo_id` / `tags` | **Não** (`ALTER TABLE IF EXISTS` no-op se tabela ausente) |
| FK `crm_oportunidades_centro_custo_fk` | **Não** (falhou) |

A versão corrigida é **reexecutável do início** (`IF NOT EXISTS` + checagens).

## Arquivo corrigido

`supabase/migrations/20260802_phase28_crm_rbac_fields.sql`

### Mudanças

1. Self-heal: `CREATE TABLE IF NOT EXISTS public.crm_oportunidades` alinhada à Fase 24 (mesma tabela, não estrutura paralela).
2. RLS + policy defensiva se ainda não existir.
3. Colunas de `clientes` e de oportunidades dentro de blocos com `to_regclass` / `information_schema`.
4. FK só se existirem tabela, coluna, `centros_custo` e a constraint ainda não existir (`ON DELETE SET NULL`).
5. Índice `idx_crm_oportunidades_centro_custo` idempotente.

## Próximo SQL a aplicar (manual)

Reaplicar **somente** o arquivo corrigido:

`supabase/migrations/20260802_phase28_crm_rbac_fields.sql`

(Agenda, OT e Financeiro já SUCCESS — não reaplicar.)

### Validação pós-aplicação

```sql
select to_regclass('public.crm_oportunidades');

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'clientes'
  and column_name in (
    'consentimento_contato','origem_contato_detalhe','prioridade_crm',
    'valor_potencial','proxima_acao','data_proxima_acao'
  );

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'crm_oportunidades'
  and column_name in ('centro_custo_id','tags');

select conname
from pg_constraint
where conname = 'crm_oportunidades_centro_custo_fk';
```

## Ordem recomendada (contexto completo)

1. *(se ainda faltarem artefatos Fase 24 além de oportunidades)* `20260812_crm_enterprise_fase24.sql` — opcional agora; self-heal cobre `crm_oportunidades`.
2. **`20260802_phase28_crm_rbac_fields.sql`** ← aplicar agora (corrigida)
3. Demais Phase 28 já aplicadas: OT, Agenda, Finance — manter.

## Risco

**Baixo.** Additive / idempotente. Self-heal só cria a tabela se ausente, com o mesmo shape da Fase 24.
