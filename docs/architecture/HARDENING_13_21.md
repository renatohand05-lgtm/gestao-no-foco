# Performance & queries — Sprint 13.21 (hardening)

Complementa `PERFORMANCE.md` (Sprint 9.8) com a camada de observação.

## Instrumentação

| Utilitário | Arquivo | Uso |
|------------|---------|-----|
| `logger` | `lib/observability/logger.ts` | Logs estruturados JSON; redaction de secrets |
| `withTiming` | `lib/observability/perf.ts` | Mede operações e emite `slow_operation` se ≥ `SLOW_QUERY_MS` (default 800) |
| `createRequestTimer` | idem | Marcas de request |

## Env

```
LOG_LEVEL=info          # debug|info|warn|error
SLOW_QUERY_MS=800
MAINTENANCE_MODE=0      # 1|true ativa /manutencao
DEBUG_STACK=0           # 1 inclui stack em produção
```

## Auditoria de queries lentas (13.21)

1. Preferir projeção explícita em `.select(...)` (evitar `*`).
2. Manter paralelismo via `Promise.all` em dashboards/serviços (já aplicado no 9.8).
3. Não cachear DRE/Fluxo/CR/CP/estoque (regra preservada).
4. Rodar `npm run audit:hardening` para inventário estático + probe RLS anon.

## Endpoints

- `GET /api/health` — liveness + probe Supabase
- `GET /api/status` — status operacional (uptime, maintenance, checks)
