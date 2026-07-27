# Roadmap — Gestão no Foco

Roadmap oficial de entregas do produto.  
Última atualização: **Sprint 21.10 — Enterprise Release Candidate (`21.10.0-rc.1`)**.

---

## Marco atual

### Fase 21 Enterprise — RELEASE CANDIDATE (21.10 RC1)

Camada transversal concluída em RC: RBAC, Audit, Workflow, Approval Engine, Notifications, Persistence, Approval Runtime, Activity Timeline, Observability.

Release notes: [docs/releases/ENTERPRISE_21_10_RC1.md](../releases/ENTERPRISE_21_10_RC1.md)  
Overview: [docs/architecture/ENTERPRISE_OVERVIEW.md](../architecture/ENTERPRISE_OVERVIEW.md)

| Área | Status |
|------|--------|
| RBAC / Audit / Workflow / Approval / Notifications | RC |
| Enterprise Persistence (RLS/RPC/outbox) | RC |
| Approval Runtime | RC |
| Activity Timeline | RC |
| Observability | RC |
| Quality gates (`test:enterprise-rc`) | PASS |

### Sprint 9 — ENCERRADA (RC 9.9.2)

Arquitetura congelada (9.7), performance, metas, painel comercial.  
Release notes: [docs/releases/SPRINT_9.md](../releases/SPRINT_9.md).

### Base Financeira + Dashboard + Comercial

| Área | Status |
|------|--------|
| Estrutura financeira / CR / CP / RPCs | Estável |
| Fluxo de Caixa (real + paginação lista) | Estável |
| DRE Real | Estável |
| Dashboard executivo (streaming) | Estável |
| Metas + projeção + soft delete | Estável |
| Painel Comercial enterprise | Estável |

---

## Fase 21 — visão

| Sprint | Foco | Status |
|--------|------|--------|
| 21.1 | RBAC | Concluído |
| 21.2 | Audit | Concluído |
| 21.3 | Workflow | Concluído |
| 21.4 | Approval Engine | Concluído |
| 21.5 | Notifications | Concluído |
| 21.6 | Enterprise Persistence | Concluído |
| 21.7 | Approval Runtime | Concluído |
| 21.8 | Activity Timeline | Concluído |
| 21.9 | Observability | Concluído |
| **21.10** | **Enterprise RC1** | **Concluído (RC)** |

---

## Próximo — Fase 22 (planejado)

| Item | Descrição |
|------|-----------|
| Hardening RBAC | Remover fallback de permissão vazia em Timeline/Observability |
| SLA Cron | Gate admin + Vercel Cron para `processApprovalSla` |
| Unificação stacks | Aproximar domain engines e `application-services` |
| Observability persistence | Persistir samples/traces além do processo |
| Notification preferences adapter | Completar contrato sem implementação Supabase |
| Productization | Nav links, seeds de `observabilidade.visualizar`, runbooks |

### Regras (herdadas)

- Não alterar autenticação nem onboarding sem necessidade
- Migrations SQL separadas, sem execução automática
- Multi-tenant obrigatório
- Design System existente
- Não quebrar módulos já entregues (DRE, Fluxo, CR/CP, Enterprise RC)

---

## Documentos relacionados

- [Backlog técnico](./backlog-tecnico.md)
- [Release Enterprise 21.10 RC1](../releases/ENTERPRISE_21_10_RC1.md)
- [Release Sprint 9](../releases/SPRINT_9.md)
- [Arquitetura](../architecture/ARCHITECTURE.md)
- [Enterprise Overview](../architecture/ENTERPRISE_OVERVIEW.md)
- [Performance](../architecture/PERFORMANCE.md)
- [Changelog](../../CHANGELOG.md)
