# Sprint 31.7 — PERFORMANCE

| Prática | Aplicação |
|---------|-----------|
| React Query | `qk.module(..., "intelligence-pack")` + `staleTime: 60_000` |
| Promise.all | Loads dashboard + operacional + analytics em paralelo no compose |
| React.cache | `loadAnalyticsDomainSnapshot` (TTL Analytics existente) |
| Skeleton | `IntelligenceSkeleton` |
| Lazy loading | Tab Inteligência (stack) — pack sob demanda |
| Offline | Snapshot único do pack + timestamps de módulos |
| Waterfall | Evitado no compose principal; sub-rotas reusam pack (aceito para contratos) |

## Não medido nesta sprint

Cold/Warm start em device (pendência não bloqueante).
