# Fase 30.5 — CRM Premium Enterprise

## Objetivo

Elevar a experiência do CRM Enterprise existente (produtividade, inteligência comercial, leitura executiva) **sem recriar o módulo** e sem alterar RBAC, DRE, regras financeiras, estoque ou compras.

## Princípios

- Dados reais apenas; empty states honestos.
- Score determinístico (`config/crm/commercial-score.ts`) — sem IA fictícia.
- Kanban = funil de clientes (`CrmFunilBoard`); oportunidades alimentam KPIs/previsão.
- Sem migration / SQL remoto nesta sprint.

## Arquitetura

```
config/crm/commercial-score.ts
lib/crm/premium/
  compose-dashboard.ts   → Promise.all + React.cache
  commercial-score.ts
  revenue-forecast.ts    → Σ valor × probabilidade
  loss-reasons.ts
  clients-at-risk.ts
  owner-ranking.ts
  follow-up-buckets.ts
  pipeline-enrich.ts
components/crm/premium/
  crm-premium-dashboard.tsx
  follow-up-panel.tsx
```

## Superfícies

| Área | Rota / componente |
|------|-------------------|
| Dashboard Premium | `/crm/executivo` + `CrmPremiumDashboardView` |
| Pipeline Premium | `/clientes/funil` + `CrmFunilBoard` |
| Timeline Premium | `CrmTimeline` (Cliente 360) |
| Follow-up Premium | `/crm/follow-ups` + `FollowUpPremiumPanel` |

## Performance

- Alvos: cold ≤ 2,5s · warm ≤ 1,3s no CRM executivo.
- `getCachedCrmPremiumDashboard` (`React.cache`), Suspense no bloco Premium, skeleton dedicado.

## Testes

- `test:phase30-crm-dashboard|pipeline|timeline|followup|score|revenue`
- `test:homolog-30-5`
