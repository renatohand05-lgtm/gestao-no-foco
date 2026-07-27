# Sprint 21.6 RC5 — Teste de RLS como `authenticated` (não usar postgres)

> **PRODUCTION:** não use o role `postgres` / table owner para “provar” RLS —
> o owner **bypassa** policies salvo `FORCE ROW LEVEL SECURITY`.

## Script RC5 (recomendado)

Executar **`supabase/smoke/20260808_enterprise_rc5_auth_rls_test.sql`** no SQL Editor.

- Descobre automaticamente par tenant A/B + user A/B em `tenant_members`.
- `BEGIN … ROLLBACK` — sem dados permanentes.
- Valida: isolamento, append-only, outbox UPDATE negado, idempotency INSERT negado, claim RPC negado a authenticated (pós RC5 grants).

## Pré-requisitos

- Dois memberships reais em tenants distintos (tenant A e B), já existentes.
- Migration `20260808_enterprise_rpc_grants_rc5.sql` aplicada (claim negado a authenticated).
- Sem criar usuários novos permanentes.

## Sessão (SQL / psql) — padrão Supabase

```sql
-- Como superuser apenas para impersonar (não como prova de dados):
begin;
select set_config('request.jwt.claim.sub', '<user_a_uuid>', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

-- Isolamento: não ver dados do tenant B
select count(*) from public.audit_events where tenant_id = '<tenant_b_uuid>';
-- Esperado: 0

-- Sem membership no tenant C
select count(*) from public.audit_events where tenant_id = '<tenant_sem_membership>';
-- Esperado: 0

-- Globais: definitions com tenant_id null legíveis
select count(*) from public.workflow_definitions where tenant_id is null;
-- Esperado: >= 0 (permitido pela policy de SELECT global)

-- Outbox: UPDATE directo deve falhar / 0 rows (sem policy UPDATE)
update public.enterprise_outbox set status = 'completed' where tenant_id = '<tenant_a_uuid>';
-- Esperado: 0 rows affected (ou erro de permissão)

rollback; -- não persistir nada da sessão de teste
```

Repetir com `user_b` / `tenant_a` espelhado.

## Via aplicação / PostgREST

Usar o client anon + JWT do usuário (nunca service role no browser):

1. User A: `from('audit_events').select().eq('tenant_id', tenantB)` → `[]`
2. User A: `rpc('enterprise_claim_outbox_batch', { p_tenant_id: tenantB, ... })` → erro `assert_tenant_member`
3. User A: `rpc('enterprise_claim_outbox_batch', { p_tenant_id: tenantA, p_processor_id: 'test' })` → ok se membro

## O que NÃO fazer

- Não usar `service_role` para validar RLS de membros.
- Não usar `DISABLE ROW LEVEL SECURITY`.
- Não `COMMIT` inserts de smoke em PRODUCTION.
- Não criar `auth.users` fictícios permanentes.
