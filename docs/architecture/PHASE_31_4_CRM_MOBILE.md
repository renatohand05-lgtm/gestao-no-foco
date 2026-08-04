# Phase 31.4 — CRM Mobile Enterprise

## Objetivo

Expor o CRM Enterprise Web existente como experiência Expo nativa para vendedores/gestores/consultores — **sem** recriar regras comerciais.

## Arquitetura

```
Bearer auth → authorizeCrmRoute → crm-compose → services/premium Web
                                                      ↓
Expo (React Query staleTime 60s) ← mobile-api.ts ← /api/mobile/v1/.../crm/*
         ↓
AsyncStorage @gof/cache/crm-summary/{tenantId} (home RO)
```

## Reuso obrigatório

| Mobile | Web |
|--------|-----|
| Forecast / KPIs | `buildRevenueForecast`, `computeCommercialScore` |
| Pipeline | `CrmFunilService` |
| Follow-ups | `groupPremiumFollowUps` + `cliente_tarefas` |
| Ranking | `buildOwnerRanking` |
| Risk | `buildClientsAtRisk` |
| Timeline | `ClienteTimelineService` |

## RBAC

Gates em `crm.*` / `clientes.*` via `hasCrmViewAccess` + `CRM_VIEW_PERMS`. Sem novas chaves inventadas.

## Offline

- Home CRM: snapshot de apresentação.
- Listas/detalhe: exigem online.
- Mutações: bloqueadas (abrir CRM Web).

## Não faz

- Novas fórmulas de score/forecast
- Service role no client
- Commit/push/EAS nesta sprint
