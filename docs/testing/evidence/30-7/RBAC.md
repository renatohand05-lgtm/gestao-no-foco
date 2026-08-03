# Sprint 30.7 — RBAC

Permissões `automacoes.*` em `lib/rbac/permissions.ts` (12 chaves).

Role `visualizacao` inclui `automacoes.visualizar` e `automacoes.ver_historico` — sem executar/aprovar.

Guards: `lib/automacoes/guards.ts` + checagens em `lib/automacoes/actions.ts`.

Suite: `npm run test:phase30-automation-rbac`
