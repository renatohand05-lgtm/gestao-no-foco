# Enterprise Overview — Gestão no Foco

**Status:** Fase 21 **Release Candidate** (`21.10.0-rc.1`)  
**Sprint de fechamento:** 21.10 RC1  
**Última atualização:** 2026-07-27

---

## Propósito

A camada Enterprise fornece capacidade transversal de **autorização, auditoria, orquestração, aprovação, notificações, persistência, timeline e observabilidade** para os módulos de negócio — sem duplicar regras de domínio financeiro/comercial.

## Mapa de sprints (Fase 21)

| Sprint | Capacidade | Pacote principal |
|--------|------------|------------------|
| 21.1 | RBAC | `lib/rbac/` |
| 21.2 | Audit | `lib/audit/` + adapters Enterprise |
| 21.3 | Workflow | `lib/workflow/` |
| 21.4 | Approval Engine | `lib/approval/` (domínio) |
| 21.5 | Notifications | adapters + engine de notificação |
| 21.6 | Enterprise Persistence | `lib/enterprise/` (repos, RLS, RPC, outbox, idempotency) |
| 21.7 | Approval Runtime | `lib/approval/runtime/` |
| 21.8 | Activity Timeline | `lib/timeline/` (read-only) |
| 21.9 | Observability | `lib/observability/` (read-only) |
| **21.10** | **Release Candidate** | docs + quality gates + versão |

## Princípios

1. **Domain engines puros** — RBAC / Audit / Workflow / Approval não dependem de React nem de SQL direto.
2. **Persistence em `lib/enterprise/`** — adapters Supabase + memory kit para testes.
3. **Runtime consome engines** — Approval Runtime orquestra domínio + Enterprise (RBAC, Audit, Workflow, Notifications, Outbox, Idempotency).
4. **Timeline e Observability são read-only** — agregam/diagnosticam; não mutam engines.
5. **Server-first + RBAC** — mutações e leituras sensíveis via Server Actions; Client Components não escrevem dados críticos.
6. **Multi-tenant primeiro** — `tenant_id` + `requireTenant` + RLS.

## Rotas Enterprise (App Router)

| Rota | Função |
|------|--------|
| `/{tenant}/aprovacoes/runtime` | Approval Runtime UI |
| `/{tenant}/atividade` | Activity Timeline |
| `/{tenant}/observabilidade` | Observability dashboards |
| `/api/health` · `/api/status` | Health / status de plataforma |

## Quality gates

```bash
npm run test:enterprise-rc   # suíte Fase 21 completa
npm run lint
npm run build
```

## Documentos

- [Sprint History](./ENTERPRISE_21_SPRINT_HISTORY.md)
- [Release Checklist 21.10](./ENTERPRISE_21_10_RELEASE_CHECKLIST.md)
- [Release Notes RC1](../releases/ENTERPRISE_21_10_RC1.md)
- [ADR RC](./ADR_ENTERPRISE_21_RC.md)
- [Architecture Overview](./ARCHITECTURE.md)
