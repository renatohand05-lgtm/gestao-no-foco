# Release Notes — Enterprise 21.10 RC1

**Produto:** Gestão no Foco  
**Versão:** `21.10.0-rc.1`  
**Codename:** Enterprise Release Candidate  
**Data:** 2026-07-27

## Sumário

A Fase 21 Enterprise é declarada **Release Candidate**. A sprint 21.10 não adiciona funcionalidades de negócio; consolida reviews, documentação, versionamento e quality gates.

## Incluído no RC

- RBAC · Audit · Workflow · Approval Engine · Notifications
- Enterprise Persistence (outbox, idempotency, adapters, RLS/RPC já migrados)
- Approval Runtime (produção + UI)
- Activity Timeline (`/atividade`)
- Observability (`/observabilidade`)
- Health endpoints `/api/health` e `/api/status`

## Quality gates (executados)

| Gate | Resultado |
|------|-----------|
| `test:rbac` | 92 PASS |
| `test:audit` | 103 PASS |
| `test:workflow` | 97 PASS |
| `test:approval` | 90 PASS |
| `test:notifications` | 139 PASS |
| `test:enterprise-persistence` | 148 PASS |
| `test:approval-runtime` | 90 PASS |
| `test:timeline` | 95 PASS |
| `test:observability` | 79 PASS |
| **Total Fase 21** | **933 PASS · 0 FAIL** |
| `lint` | PASS (0 errors) |
| `build` | PASS |

## Produção — readiness

| Item | Status |
|------|--------|
| Vercel (Next.js App Router) | Pronto para deploy (não executado neste RC) |
| Supabase (URL + anon + service role) | Documentado em `.env.example` |
| Environment variables | `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `LOG_LEVEL`, `MAINTENANCE_MODE` |
| Storage | Depende de buckets Supabase existentes do produto |
| Cron (SLA approvals) | Processor existe; **cron Vercel ainda não configurado** |
| Health checks | `/api/health`, `/api/status` |

## Não incluído / adiamentos (Fase 22)

- Remover fallback `auditoria.visualizar` quando RBAC retorna permissões vazias
- Gate RBAC admin/cron em `processApprovalSlaAction`
- Unificar stacks paralelos (domain RBAC/audit/workflow vs application-services)
- Adapter Supabase para `NotificationPreferencesRepository`
- Persistência de métricas/traces (hoje in-process)
- Limpeza de shims órfãos em `lib/enterprise/services/*`

## Referências

- [Enterprise Overview](../architecture/ENTERPRISE_OVERVIEW.md)
- [Release Checklist](../architecture/ENTERPRISE_21_10_RELEASE_CHECKLIST.md)
- [ADR](../architecture/ADR_ENTERPRISE_21_RC.md)
- [Sprint History](../architecture/ENTERPRISE_21_SPRINT_HISTORY.md)
