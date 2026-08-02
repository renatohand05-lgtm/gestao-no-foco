# Before / After — Sprint 30.4.1

## First paint critical path

### Antes (30.4)

```
Promise.all([
  hoje,
  resumo,
  execCtx,
  commercial,   // ← bloqueava
  primary,
  charts,       // ← até 8× DRE bloqueava
])
→ PremiumDashboardView completo
```

### Depois (30.4.1)

```
Promise.all([
  hoje,
  resumo,
  execCtx,      // React.cache
  primary,
])
→ PremiumDashboardView (KPIs/Brief/Metas/DRE-Caixa/Alertas/QA)
→ Suspense charts (ChartsMainRowBlock)
→ Suspense AI (commercial + Command Center)
```

## Tempos desktop

| | Cold | Warm |
|--|------|------|
| Before | 4802 ms | 3955 ms |
| After | 2120 ms | 1393 ms |

## Screenshots

`docs/testing/evidence/30-4-1/screenshots/`
