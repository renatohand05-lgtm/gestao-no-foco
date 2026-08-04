# Mobile Operations Offline (Sprint 31.6)

## Snapshot

- Chave: `@gof/cache/ops-summary/{tenantId}`
- Conteúdo: DTO de apresentação do dashboard (strings formatadas)
- Sem tokens / sem mutações

## Comportamento

| Superfície | Offline |
|------------|---------|
| Dashboard | Restore snapshot + banner “somente leitura” / idade |
| Ordens, agenda, equipe, veículos, clientes, notificações | Bloqueadas (exige conexão) |
| Pull-to-refresh | Somente online |
| Status/edição/criação/upload/aprovação | Bloqueadas — CTA portal |

## React Query

- `staleTime: 60_000`
- Keys com `tenantId` + `branchId` via `qk.module` / `qk.entity`
