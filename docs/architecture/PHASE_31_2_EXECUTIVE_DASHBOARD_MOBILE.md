# Phase 31.2 — Executive Dashboard Mobile

## Objetivo

Dashboard Executivo no app Expo, consumindo a **mesma** lógica da web (cockpit V2), sem duplicar regras de negócio.

## Arquitetura

```
Mobile (RN)
  useQuery → GET /api/mobile/v1/tenants/:tenantId/dashboard
                │
                ├─ authenticateMobileRequest (Bearer)
                ├─ getActiveMembership + resolveMobilePermissions
                ├─ hasExecutiveDashboardAccess (lib/rbac)
                └─ composeMobileExecutiveDashboard
                     ├─ VendasDiaService / ResumoVendasMesService / DashboardService
                     ├─ exec context (mesmas fontes do loadExecutiveDashboardContext)
                     ├─ composeExecutiveDecision
                     ├─ composeOpsExecutiveIntelligence
                     ├─ composeExecutiveFinancialCockpit
                     ├─ buildPremiumInsights
                     ├─ buildCockpitKpis / buildCockpitAlerts
                     ├─ buildExecutiveBriefV2 / buildMetaPanel
                     └─ quickActions (RBAC gates)
```

## Performance

- React Query (`staleTime` 60s) + `qk.module(...)`
- Server: `Promise.all` no critical path (hoje, resumo, execCtx, primary)
- Soft-fail em primary/context fontes
- Skeleton na home; pull-to-refresh
- Sem IA / charts pesados no first paint mobile

## Offline

- Snapshot de apresentação (strings formatadas) em AsyncStorage por tenant
- Banner “atualizado há X minutos”
- Sem mutações; tokens continuam só em SecureStore

## RBAC

- Any-of: `dashboard.executivo` | `analytics.executivo` | `dashboard.visualizar` (legado)
- Server: `hasExecutiveDashboardAccess`
- Widgets/quick actions filtrados por permissão

## Não incluido

- IA generativa, push, websockets, EAS submit
- Novas regras financeiras
- Homologação device Android/iOS (documentar como não executada)

## Endpoints

`GET /api/mobile/v1/tenants/:tenantId/dashboard`
Headers: `Authorization: Bearer`, `x-gof-tenant-id`, `x-gof-branch-id`, opcional `x-gof-branch-name`
