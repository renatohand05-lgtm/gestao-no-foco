# Sprint 31.9 — PERFORMANCE

Metas preferenciais em device (não medidas aqui):

| Meta | Status |
|------|--------|
| Abrir busca ≤ 300ms | Não medido (device) |
| Cache ≤ 300ms | Contrato cache local |
| Remoto ≤ 1,5s | Depende rede |
| Command palette ≤ 200ms | Lista local |
| Scanner pronto ≤ 1s | Device N/A |
| Nav cached ≤ 300ms | Expo Router |

Aplicado: debounce 280ms, AbortSignal, React Query staleTime, FlatList, payload enxuto, limite 50, parallel master+OS+veículo.
