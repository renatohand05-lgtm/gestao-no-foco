# PHASE 30.7 — Migration Central de Automações

**Status:** PRONTO PARA APLICAÇÃO MANUAL (não aplicada nesta sessão)  
**Arquivo:** `supabase/migrations/20260821_phase30_7_automations.sql`  
**Escopo:** regras, execuções, aprovações, templates, auditoria e notificações internas de automação  
**SQL remoto automático:** proibido nesta sprint — aplicar manualmente no SQL Editor do Supabase

---

## 1. O que a migration faz

| # | Objeto | Descrição |
| --- | --- | --- |
| 1 | `automation_rules` | Regra com trigger, condições JSON, ações JSON, status, cooldown, max_executions |
| 2 | `automation_executions` | Execução com idempotency_key único por tenant, dry_run, correlation_id |
| 3 | `automation_approvals` | Pedidos de aprovação com histórico JSON |
| 4 | `automation_templates` | Catálogo global de templates (`default_active false`) |
| 5 | `automation_audit` | Trilha de auditoria append-only |
| 6 | `automation_internal_notifications` | Notificações in-app (sem e-mail/WhatsApp) |
| 7 | Índices | `(tenant_id, status)`, `(tenant_id, created_at)` |
| 8 | RLS | Todas as tabelas tenant-scoped via `tenant_members`; templates SELECT global |

Idempotente: `CREATE TABLE IF NOT EXISTS`, policies com guard `IF NOT EXISTS`.

## 2. Isolamento

- `tenant_id` NOT NULL + FK `tenants(id) ON DELETE CASCADE`
- Policies filtram `tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())`
- Unique `(tenant_id, idempotency_key)` em execuções

## 3. Após aplicar

1. Supabase: **Reload schema** (PostgREST).
2. Validar `lib/automacoes/schema-probe.ts` → `schemaReady: true`.
3. Rodar suites `test:phase30-automation-*` e `test:homolog-30-7`.

## 4. Verificação SQL

```sql
select to_regclass('public.automation_rules');
select to_regclass('public.automation_executions');
select count(*) from pg_policies where tablename like 'automation_%';
```
