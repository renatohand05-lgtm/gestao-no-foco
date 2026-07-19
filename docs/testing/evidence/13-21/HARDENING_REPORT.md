# Sprint 13.21 — Relatório final de hardening

**Data:** 2026-07-18  
**Objetivo:** Preparar o ERP para uso comercial (somente melhorias estruturais).  
**Restrições cumpridas:** sem novos módulos de negócio; sem alteração de regras financeiras; sem mudança de banco; sem merge/push.

## Resultado dos 20 itens

| # | Item | Status | Evidência |
|---|------|--------|-----------|
| 1 | Sistema centralizado de logs | **FEITO** | `lib/observability/logger.ts` — JSON estruturado + redaction |
| 2 | Tratamento global de exceções | **FEITO** | `app/global-error.tsx` + `error.tsx` + `RouteError` com log |
| 3 | Página 404 | **FEITO** | `app/not-found.tsx` + tenant `not-found.tsx` (rótulo Erro 404) |
| 4 | Página 500 | **FEITO** | `global-error.tsx` título “Erro interno (500)” |
| 5 | Tela de manutenção | **FEITO** | `/manutencao` + `MAINTENANCE_MODE` no proxy |
| 6 | Loader global | **FEITO** | `app/loading.tsx` + `GlobalLoader` + `RouteLoading` |
| 7 | Notificações padronizadas | **FEITO** | `ToastProvider`/`useToast` + `FeedbackMessage` (error/success/info/warning) |
| 8 | Auditoria de performance | **FEITO** | `docs/architecture/HARDENING_13_21.md` + audit script |
| 9 | Auditoria de queries lentas | **FEITO** | `withTiming` / `SLOW_QUERY_MS` + inventário `select('*')` no audit |
| 10 | Padronização de componentes | **FEITO** | barrel `components/platform` + feedback alinhado ao toast |
| 11 | Remover código morto | **PARCIAL** | limpeza em harnesses (imports/vars mortas); sem knip massivo |
| 12 | Remover imports não utilizados | **FEITO** | lint limpo (0 warnings) |
| 13 | Eliminar warnings React/Next | **FEITO** | lint 0; hydration pré-existente do search = melhoria futura |
| 14 | Revisar rotas autenticadas | **FEITO** | `manutencao` reservado; health/status bypass; tenant slug check |
| 15 | Validar políticas RLS | **FEITO** | anon sem sessão = 0 rows em clientes/vendas/OS/CR |
| 16 | HEALTH CHECK | **FEITO** | `GET /api/health` → 200 ok (Supabase ~339ms) |
| 17 | Endpoint de status | **FEITO** | `GET /api/status` → app/version/uptime/checks |
| 18 | Build limpa | **FEITO** | `GNF_DIST_DIR=.next-build` exit 0 |
| 19 | Lint limpo | **FEITO** | `npm run lint` exit 0, 0 warnings |
| 20 | Relatório final | **FEITO** | este arquivo |

## Verificações executadas

```
npm run lint                 → EXIT 0 (0 warnings)
npm run build                → EXIT 0 (.next-build)
npm run audit:hardening      → PASS=31 FAIL=0
GET /api/health              → 200 {"ok":true,"status":"ok",...}
GET /api/status              → 200 {"status":"ok","maintenance":false,...}
```

JSON da auditoria: `docs/testing/evidence/13-21/HARDENING_AUDIT.json`

## Como ativar manutenção

```
MAINTENANCE_MODE=1
```

Todas as rotas (exceto `/manutencao`, `/api/health`, `/api/status`, estáticos) redirecionam para a tela de manutenção.

## Env opcional (ver `.env.example`)

- `LOG_LEVEL`
- `SLOW_QUERY_MS`
- `MAINTENANCE_MODE`
- `DEBUG_STACK`

## O que não foi feito (fora do escopo / consciente)

- Não introduzimos Sentry/Datadog (logger pronto para hook futuro).
- Não alteramos RPCs/migrations financeiras.
- Não fizemos varredura knip completa de dead code (risco alto sem ROI imediato).
- Hydration mismatch do input de busca do header permanece como melhoria UX futura (já notado na 13.20).

## Decisão

Plataforma **estruturalmente pronta** para operação comercial no que tange hardening 13.21.

Aguardando aprovação do CTO para commit/PR/tag (não executados nesta sprint).
