# Enterprise Fase 21 — Sprint History

Histórico oficial das entregas Enterprise (sem novas engines fora do escopo de cada sprint).

| Sprint | Título | Resultado |
|--------|--------|----------|
| 21.1 | RBAC | Motor de permissões / roles / authorize |
| 21.2 | Audit | Registro estruturado de eventos |
| 21.3 | Workflow | Definições, instâncias, transições, histórico |
| 21.4 | Approval Engine | Definições, requests, decisions, levels |
| 21.5 | Notifications | Criação, recipients, canais, dedupe |
| 21.6 | Enterprise Persistence | Tables, RLS, RPC, outbox, idempotency, adapters, smoke/gates RC4–RC8 |
| 21.7 | Approval Runtime | Orquestração produção + factory Supabase + SLA processor + página runtime |
| 21.8 | Activity Timeline | Agregação read-only multi-fonte + App Router `/atividade` |
| 21.9 | Observability | Health, metrics, logging, tracing, alerts, dashboards `/observabilidade` |
| **21.10** | **Enterprise RC1** | Reviews, docs, versionamento `21.10.0-rc.1`, quality gates PASS |

## Decisões de fechamento (21.10)

- Não criar novas funcionalidades de negócio nesta sprint.
- Não alterar migrations / RLS / arquitetura de engines.
- Dívidas classificadas → Fase 22 (ver Release Notes).
