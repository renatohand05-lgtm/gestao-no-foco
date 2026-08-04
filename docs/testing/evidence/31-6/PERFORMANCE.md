# Sprint 31.6 — PERFORMANCE

## Objetivos

| Métrica | Meta |
|---------|------|
| Cold | ≤ 1500 ms |
| Warm | ≤ 900 ms |

## Medição

**Não medido em device** nesta sessão.

## Mitigações

- React Query `staleTime` 60s + keys tenant/filial
- FlatList + busca `useDeferredValue`
- Soft-fail paralelo no compose (`Promise.all` + `soft`)
- Snapshot home offline
- Sem gráficos pesados no first paint
