# Phase 31.6 — Operação Mobile

## Objetivo

Experiência Mobile Enterprise de Operação (OS, agenda, equipe/mecânicos, veículos, clientes, alertas) reutilizando serviços Web canônicos. Sem novas regras/cálculos.

## Arquitetura

```
Expo (tab Operação)
  → Bearer + SecureStore
  → /api/mobile/v1/tenants/:tenantId/operacao/*
       → authorizeOpsRoute
       → operations-compose
         (OrdemServicoService, OsDashboardService, CentroOperacoesService,
          AgendaEventService, MecanicoService, MecanicosDashboardService,
          VeiculoService, ClienteService, AlertasOperacionaisService,
          RecursosOcupacaoService, InspecaoStorageService, detectAgendaConflicts)
```

## RBAC canônico

`os.*`, `agenda.*`, `mecanicos.*`, `clientes.*`, `centro_operacoes.*`, `dashboard.operacional`
**Não** inventar `operacao.*` / `ordens.*` / `veiculos.*`.

## Offline

Snapshot RO do dashboard: `@gof/cache/ops-summary/{tenantId}`. Listas/detalhe online-only. Mutações → “Continuar no portal”.

## Relacionado

- `MOBILE_OPERATIONS_API.md`
- `MOBILE_OPERATIONS_OFFLINE.md`
- Evidence: `docs/testing/evidence/31-6/`
