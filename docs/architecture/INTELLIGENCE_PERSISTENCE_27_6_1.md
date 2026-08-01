# Persistência Inteligência — Sprint 27.6.1

## Status

**MIGRATION PENDENTE DE APLICAÇÃO MANUAL**

Arquivo:

`supabase/migrations/20260816_intelligence_persistence_phase27_6_1.sql`

Não executar automaticamente. Não aplicar via agent.

## Tabelas

- `intelligence_sessions`
- `intelligence_messages`
- `intelligence_evidence`
- `intelligence_audit_events`
- `intelligence_feedback`
- `intelligence_action_plans`
- `intelligence_automation_drafts`

## Índices mínimos

- sessions `(tenant_id, user_id, created_at desc)`
- messages `(tenant_id, session_id, created_at)`
- evidence `(tenant_id, message_id)`
- audit `(tenant_id, correlation_id)` e `(tenant_id, created_at desc)`
- feedback `(tenant_id, message_id)`
- action_plans / automation_drafts `(tenant_id, status)`

## RLS

Todas as tabelas com RLS. Policies usam `tenant_members` + `auth.uid()`.

- Insert de sessão/feedback exige `user_id = auth.uid()`
- Soft delete via `deleted_at` / archive via `archived_at`

## Repositórios

`lib/intelligence/enterprise/persistence/`

- `schema.ts` — `probeIntelligenceSchema` (unavailable explícito)
- `repositories.ts` — create/list/insert sem fallback memória

## Ordem de aplicação

1. Backup / review no Supabase SQL editor
2. Colar e executar o arquivo da migration
3. Validar smoke tests abaixo
4. Reiniciar app / nova sessão do Copiloto
5. Confirmar histórico e auditoria com `ready: true`

## Rollback (manual)

```sql
-- CUIDADO: apaga dados de inteligência
drop table if exists public.intelligence_automation_drafts cascade;
drop table if exists public.intelligence_action_plans cascade;
drop table if exists public.intelligence_feedback cascade;
drop table if exists public.intelligence_evidence cascade;
drop table if exists public.intelligence_audit_events cascade;
drop table if exists public.intelligence_messages cascade;
drop table if exists public.intelligence_sessions cascade;
```

## Smoke tests (manual — não executar pelo agent)

```sql
-- Tabelas
select table_name from information_schema.tables
where table_schema = 'public' and table_name like 'intelligence_%'
order by 1;

-- RLS
select relname, relrowsecurity
from pg_class
where relname like 'intelligence_%';

-- Policies
select tablename, policyname from pg_policies
where tablename like 'intelligence_%'
order by 1, 2;

-- Insert session (substituir UUIDs reais do seu tenant/user)
-- insert into intelligence_sessions (tenant_id, user_id, mode, status)
-- values ('...','...','deterministic','active');
```

## Runtime sem migration

- Copiloto continua deterministic com fontes live
- Persistência retorna `INTELLIGENCE_SCHEMA_UNAVAILABLE`
- UI Histórico/Auditoria mostra estado pendente
- Sem gravação falsa em memória

## Classificação máxima sem Etapa B

**PRONTO PARA APLICAÇÃO DA MIGRATION**
