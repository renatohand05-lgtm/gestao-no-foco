# Sprint 30.8 — Architecture snapshot

## Camadas

| Camada | Responsabilidade | I/O externo |
|--------|------------------|-------------|
| Marketplace | Catálogo de vendors | Nenhum (`active: false`) |
| API Center | Inventário de APIs internas | Nenhum (tokens planned) |
| Connection Manager | Blueprints OAuth/Key/Bearer/… | `storesSecrets: false` |
| Webhook Center | In/Out/Retry/DLQ/Replay UI | Mock only |
| Scheduler | Jobs, backoff, prioridade | `executesExternally: false` |
| Event Bus | Pub/sub, idempotência, DLQ | `externalDispatch: false` |
| Observability | Logs + Monitor + Config knobs | Mock metrics |
| Compose | Snapshot determinístico + `cache()` | Puro |

## RBAC

`integracoes.visualizar|configurar|administrar`, `api.*`, `webhook.*`, `scheduler.*`, `eventbus.*`, `logs.visualizar`, `monitor.visualizar`.

## Rotas

- `/{tenant}/integracoes` — Hub Enterprise (canônico)
- `/{tenant}/integracoes/hub` — redirect → canônico
- `/{tenant}/integracoes/importar` — Import Intelligence (legado Sprint 22)
