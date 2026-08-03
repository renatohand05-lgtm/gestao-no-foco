# Mobile Shared Packages

| Package | Responsabilidade |
|---------|------------------|
| `@gof/design-tokens` | Hex, spacing, radius, typography, light/dark |
| `@gof/domain` | Auth states, tenant, offline/push contracts, query keys, future modules |
| `@gof/schemas` | Zod DTOs (login, env) |
| `@gof/api-contracts` | Headers, timeouts, ApiResult |
| `@gof/rbac-contracts` | hasPermission helpers + shell permission keys |
| `@gof/config` | AppEnv, mock tenants/branches foundation |
| `@gof/utils` | sanitizeForLog, requestId |

## Regras

- Sem React/Next/DOM/`server-only`
- Sem `@/` aliases internos
- Web continua usando `lib/*`; sync progressivo documentado
- Mobile consome via `file:../../packages/...`
