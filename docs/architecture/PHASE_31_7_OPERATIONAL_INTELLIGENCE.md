# Fase 31.7 — Inteligência Operacional Mobile Enterprise

**Status:** implementado (sem commit/push nesta sprint)
**Princípio:** 100% reuso dos builders/services Web — sem novas regras, sem IA generativa, sem migrations.

## Arquitetura

```
apps/mobile (Expo)
  └─ tab Inteligência → fetchIntelligencePack
         │
         ▼
GET /api/mobile/v1/tenants/:tenantId/inteligencia
         │
         ▼
lib/mobile/intelligence-compose.ts
  ├─ composeMobileExecutiveDashboard  → brief V2, decision, alerts, metas, KPIs
  ├─ composeOperationalExecutive      → CentroOperacoes + OsDashboard + Mecânicos + Agenda
  ├─ buildExecutiveAnalyticsBundle
  │     └─ composeDecisionCenterPack  → kpiHealth, decisions, enriched alerts, report
  └─ composeAlertCenter               → cockpit + CRM + Estoque + Ops + Financeiro
```

## APIs

| Rota | Conteúdo |
|------|----------|
| `.../inteligencia` | Pack completo |
| `.../inteligencia/operacional` | Dashboard operacional |
| `.../inteligencia/brief` | Executive Brief V2 |
| `.../inteligencia/decision` | Decision + Analytics Decision |
| `.../inteligencia/kpi-health` | KPI Health |
| `.../inteligencia/alertas` | Central de alertas |
| `.../inteligencia/metas` | Metas dia/semana/mês |

Auth: Bearer → membership → permissions → `hasExecutiveDashboardAccess`.

## Builders reutilizados

- `buildExecutiveBriefV2`, `composeExecutiveDecision`, `buildCockpitAlerts`, `buildCockpitKpis`, `buildMetaPanel`
- `composeDecisionCenterPack` / `buildKpiHealth` (via Analytics bundle)
- `CentroOperacoesService`, `OsDashboardService`, `MecanicosDashboardService`, `AgendaEventService`, `RecursosOcupacaoService`
- `composeCrmAlerts`, `composeStockAlerts`, `composeOpsNotifications`, `composeFinanceSummary`

## Offline

Cache `@gof/cache/intelligence-pack/{tenantId}` + leitura de timestamps dos snapshots de Dashboard/CRM/Financeiro/Estoque/Operação. Somente leitura.

## Fora de escopo

EAS, lojas, SQL, alteração Web, fórmulas novas.
