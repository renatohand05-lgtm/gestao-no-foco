# Sprint 31.5 — PERFORMANCE

## Objetivos

| Métrica | Meta |
|---------|------|
| Cold start | ≤ 1500 ms |
| Warm navegação | ≤ 900 ms |
| Lista produtos | ≤ 500 ms |

## Medição nesta sessão

**Não medida em device real.** Homologação estática apenas.

## Mitigações

- `staleTime: 60_000` nas queries
- Snapshot AsyncStorage no home
- FlatList + `useInfiniteQuery` (produtos, movimentações, fornecedores)
- `useDeferredValue` na busca
- Soft-fail em sources opcionais
- Listas limitadas (40/page; dashboard movs 8; alertas 20–25)

## Limitação

Sem instrumentação de tempo em dispositivo físico nesta sprint.
