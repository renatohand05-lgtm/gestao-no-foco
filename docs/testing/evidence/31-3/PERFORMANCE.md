# Sprint 31.3 — PERFORMANCE

## Metas preferenciais

| Métrica | Meta | Medição device |
|---------|------|----------------|
| Home cold | ≤ 2,5s | Não medida |
| Home warm | ≤ 1,2s | Não medida |
| Lista inicial | ≤ 1,5s | Não medida |
| Detalhe cached | ≤ 1s | Não medida |

## Aplicado no código

- `Promise.all` no summary (CAP+CR+fluxo+DRE)
- React Query `staleTime: 60_000`
- Query keys com tenant/filial/módulo/filtros
- Sem gráfico no first paint (fluxo = FlatList)
- Payload formatado/enxuto
- Paginação 30 itens

**Não inventar medição em device ausente.**
