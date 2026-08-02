# Sprint 30.4.1 — Baseline

**Data:** 2026-08-02  
**HEAD publicado:** `a109f32`  
**Branch:** `main` = `origin/main`

## Tempos anteriores (Sprint 30.4 Browser QA)

| Métrica | Valor |
|---------|-------|
| Desktop cold | **4802 ms** |
| Desktop warm | **3955 ms** |
| Tablet cold | 6417 ms |
| Mobile cold | 4701 ms |
| Browser | 33 PASS · 0 FAIL |

## Alvo 30.4.1

| Métrica | Meta |
|---------|------|
| Cold | ≤ 3000 ms |
| Warm | ≤ 1500 ms |

## Top 10 gargalos (evidência de código)

| # | Gargalo | Severidade | Evidência |
|---|---------|------------|-----------|
| 1 | Commercial Intelligence no caminho crítico | crítico | `HojeExecutiveBlock` Promise.all inclui `softLoadCommercial` só usado no AI Suspense |
| 2 | 3× `getFluxo` no exec context | crítico | `executive-dashboard-context-service` mes+7d+30d |
| 3 | CR/CP `getResumo` duplicado | crítico | execCtx + `DashboardService.fetchOpenBalances` |
| 4 | Charts = até 8 DRE no first paint | alto | `softLoadCharts` no mesmo Promise.all |
| 5 | Vendas mês sobrepostas (hoje+resumo+CI) | alto | 3 serviços no fan-out |
| 6 | `vendas` sem limit no snapshot | alto | `vendas-dia-service.fetchVendas` |
| 7 | Exec context over-fetch (board/estoque full) | alto | só counts usados no cockpit |
| 8 | Primary 2× DRE+fluxo | alto | necessário para variação KPI |
| 9 | Hydration client (QuickActions use client sem hooks) | médio | `quick-actions-panel.tsx` |
| 10 | Export `loadDashboardFull` no footer | médio | Suspense — não bloqueia first paint |

## Escopo

Somente performance + UX polish. Sem alterar cálculos/DRE/financeiro. Sem commit/push/deploy.
