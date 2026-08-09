# Sprint 31.10 — PERFORMANCE

Revisão estática (sem device metrics):

| Área | Observação |
|------|------------|
| React Query | `staleTime` 30s default; módulos usam 30–60s |
| FlatList | Busca/comandos |
| Imagens | `expo-image` |
| Offline | Snapshots limitados por módulo |
| Fonts | Sistema / design tokens (sem download extra no RC) |
| Bundle | Sem tree-shake agressivo adicional nesta sprint |
| Splash | Imagem existente + fundo navy (sem asset novo pesado) |

Metas de cold/warm **não medidas em device** nesta sprint.
