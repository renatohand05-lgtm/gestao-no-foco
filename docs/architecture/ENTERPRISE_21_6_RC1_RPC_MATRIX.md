# Sprint 21.6 RC1 — Matriz de RPCs Enterprise

| RPC | Security | Grantee | Tenant validation | Atomic | Risk |
|-----|----------|---------|-------------------|--------|------|
| `enterprise_claim_outbox_batch` | DEFINER | authenticated (REVOKE PUBLIC) | `assert_tenant_member` | FOR UPDATE SKIP LOCKED + `locked_by` | Médio — DEFINER necessário (RLS sem UPDATE); mitigado por member check + search_path |
| `enterprise_complete_outbox_event` | DEFINER | authenticated | `assert_tenant_member` + lock ownership | UPDATE condicional status/locked_by | Baixo se ownership ok |
| `enterprise_fail_outbox_event` | DEFINER | authenticated | idem + ownership | FOR UPDATE + retry/dead | Baixo |
| `enterprise_release_outbox_locks` | DEFINER | authenticated | `assert_tenant_member` | libera só TTL expirado | Baixo |
| `enterprise_resolve_idempotency` | DEFINER | authenticated | `assert_tenant_member` | UNIQUE + FOR UPDATE | Médio — race tratada; expires_at limpa chave |
| `enterprise_save_workflow_definition` | DEFINER | authenticated | member; rejeita tenant null (global) | SELECT FOR UPDATE + insert/update | Baixo |
| `enterprise_save_approval_definition` | DEFINER | authenticated | idem | idem | Baixo |
| `enterprise_save_notification_template` | DEFINER | authenticated | idem | idem | Baixo |
| `enterprise_commit_approval_decision` | INVOKER | authenticated | `assert_tenant_member` + actor shape | transação na função | Baixo — policies INVOKER |

Todas: `SET search_path = public, pg_temp`.

## Foreign keys (resumo)

| FK | ON DELETE | Justificativa |
|----|-----------|---------------|
| `*_history` → parent instance/request | RESTRICT | Não apagar histórico silenciosamente |
| `approval_decisions` → request | RESTRICT | Append-only / auditoria |
| `notification_delivery_attempts` → notification | RESTRICT | Append-only |
| `requester_id` / `approver_id` / `actor_id` → profiles | RESTRICT ou SET NULL | Sem profile fictício; actor não-humano usa key |
| Definições / operacionais tenant → tenants | CASCADE | Tenant removido remove dados operacionais do tenant |
| pending_actions → parent | CASCADE | Filhos operacionais sem valor sem o parent |

## Uniques

- Global: `WHERE tenant_id IS NULL` em (key, version)
- Tenant: `WHERE tenant_id IS NOT NULL` em (tenant_id, key, version)
