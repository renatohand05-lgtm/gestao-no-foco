# Checkpoint 31.6-release — SECURITY

## Controles validados (estático / código)

| Controle | Evidência |
|----------|-----------|
| Sem service_role no compose mobile | Suites crm/stock/ops: `!SERVICE_ROLE` |
| Bearer | `authenticateMobileRequest` em *-route-auth |
| Membership | `getActiveMembership(tenantId, userId)` |
| Tenant backend | load `tenants` by id; 403 se ausente |
| RBAC server-side | `resolveMobilePermissions` + `canView*` / FORBIDDEN_* |
| Offline RO | Snapshots AsyncStorage presentation-only; listas online-only |
| Sem mutação crítica offline | UI bloqueia; CTA portal |
| Cache por tenant | Keys `@gof/cache/{crm,stock,ops}-summary/{tenantId}` |
| Query keys | `qk.module(tenantId, branchId, …)` |

## Não encontrados no staging esperado

- `.env` real, tokens, senhas, keystore, certificados, dumps storage, builds EAS

## Limitações

- Device QA Android/iOS não executado nesta publicação
- Filial: propagada em headers/query context das APIs; escopo de dados segue services Web existentes
