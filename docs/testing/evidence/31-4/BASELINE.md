# Sprint 31.4 — BASELINE CRM Mobile

## Git (pré-implementação)

```
## main...origin/main
cec3e22 fix(ui): repair dropdown menus logout and manifest
```

Working tree limpa após Hotfix 2. Sem diff pendente no início desta sprint.

## Estado das sprints anteriores

| Sprint | Status |
|--------|--------|
| 31.0 Fundação | Publicada |
| 31.1 Auth híbrida | Publicada |
| 31.2 Dashboard Executivo Mobile | Publicada |
| 31.3 Financeiro Mobile | Publicada |
| Hotfix 2 (dropdown/manifest) | Publicada (`cec3e22`) |

## CRM Web (fonte de verdade)

| Domínio | Origem |
|---------|--------|
| Dashboard / KPIs | `lib/crm/premium/compose-dashboard.ts`, `cliente-360-service` |
| Pipeline | `lib/crm/crm-funnel-service.ts`, `premium/pipeline-enrich.ts` |
| Clientes 360 | `lib/crm/cliente-360-service.ts` |
| Timeline | `lib/crm/cliente-timeline-service.ts`, `cliente-timeline-merge.ts` |
| Follow-ups | `lib/crm/cliente-tarefa-service.ts`, `phase28/follow-up-queue.ts`, `premium/follow-up-buckets.ts` |
| Oportunidades | `lib/crm/enterprise/oportunidade-service.ts` |
| Forecast | `lib/crm/premium/revenue-forecast.ts` |
| Score | `lib/crm/premium/commercial-score.ts` (sem fórmula nova) |
| Ranking | `lib/crm/premium/owner-ranking.ts` |
| Alertas | `lib/crm/enterprise/alert-engine.ts`, `premium/clients-at-risk.ts` |

## RBAC (chaves reais)

Presentes: `crm.*`, `clientes.*`, `crm.pipeline.*`, `crm.atividades.*`, `crm.dashboard.visualizar`, `crm.oportunidades.*`.

Não existem como chaves: `timeline.*`, `followup.*`, `forecast.*`, `score.*`, `executivo.*` — mapeados via `crm.*` / `clientes.*` (compat `lib/crm/rbac-compat.ts`).

## Mobile APIs CRM (pré-31.4)

**Nenhuma** sob `/api/mobile/v1/tenants/:tenantId/crm`.

Padrão a espelhar: `lib/mobile/finance-route-auth.ts` + `finance-compose.ts` + rotas finas.

## Restrições

- Sem novas regras comerciais / score / forecast.
- Sem commit / push / deploy / EAS / SQL remoto.
- Offline: snapshot somente leitura.
- Device QA Android: não declarar homologado sem device.
