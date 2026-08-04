# Sprint 31.3 — SECURITY

## Confirmado no desenho

- Bearer via `authenticateMobileRequest`
- Membership + permissions no servidor
- Compose usa admin client só no server após RBAC (padrão 31.2)
- Sem service role no app
- Snapshot AsyncStorage sem tokens
- Mutações críticas offline bloqueadas (UI)
- Aprovações sem bypass no app (available:false)
- Erros sanitizados
- Paginação limitada
- Tenant isolation por membership + `tenant_id` nos services

## Sem dumps

Nenhum token, credencial ou dado financeiro real não mascarado nesta pasta.
