# Sprint 34.6 — Observabilidade operacional + backup/recovery + suporte

**Data:** 2026-08-14
**Branch:** `main`
**Tipo:** Operações — sem billing / Asaas / Vercel / mobile / 34.7 / features de negócio
**34.5:** HOMOLOGADA

## Status

**SPRINT 34.6: GO (código + runbooks)**

| Critério | Status |
|---|---|
| LOGGING | **PASS** |
| SECRET SANITIZATION | **PASS** |
| REQUEST ID | **PASS** |
| ERROR HANDLING | **PASS** (padrões críticos) |
| HEALTH/READINESS | **PASS** |
| BACKUP | **PASS** (diário confirmado 34.2) |
| PITR | **NOT ENABLED** |
| RECOVERY READINESS | **PARTIAL** (runbook + backup diário; sem PITR/restore E2E) |
| RECOVERY RUNBOOK | **PASS** |
| INCIDENT RUNBOOK | **PASS** |
| SUPPORT RUNBOOK | **PASS** |
| MONITORING | **PARTIAL** (logger estruturado; sem Sentry) |
| SECURITY | **PASS** |
| P0 REGRESSION | **PASS** |
| Billing | **FROZEN SAFE** |

## Inventário

| Área | Antes | Depois |
|---|---|---|
| Logger | EXISTS | Sanitizer recursivo + env no entry |
| Request ID | PARTIAL (middleware) | Health/status + operational APIs |
| Friendly errors | EXISTS | PGRST116 / fetch / timeout / RLS |
| Health público | EXISTS | serviceRole presence; billing frozen; sem `node` |
| Console cru auth | DANGEROUS | `logger.exception` |
| Runbooks produto | MISSING | `docs/operations/*` |
| Sentry | MISSING | Mantido MISSING (recomendação futura) |

## Backup / PITR

| Item | Status |
|---|---|
| Backup diário | **PASS** (evidência 34.2 manual) |
| PITR | **NOT ENABLED** |
| Restore executado nesta sprint | **NÃO** |

Risco residual: janela até o próximo backup diário. Aceito para piloto; decisão comercial se cliente pago exigir PITR.

## Documentos

- `docs/operations/README.md`
- `docs/operations/INCIDENT_RUNBOOK.md`
- `docs/operations/RECOVERY_RUNBOOK.md`
- `docs/operations/SUPPORT_RUNBOOK.md`
- `docs/operations/MIGRATION_CHECKLIST.md`
- `docs/operations/DEPLOY_READINESS.md`

## Testes (revalidação)

| Suite | Resultado |
|---|---|
| `test:phase34-6-ops-readiness` | **7 PASS** |
| `test:phase34-5-pilot-ux` | **13 PASS** |
| `test:phase34-4-access-journey` | **14 PASS** |
| `test:phase34-3-p1-mutation-auth` | **9 PASS** |
| `test:phase34-2-p0-tenant-rls` | **12 PASS** |
| `test:rbac` | **92 PASS** |
| lint | **PASS** (0 errors) |
| typecheck (`tsc` via `next build`) | **PASS** |
| build | **PASS** |
| `git diff --check` | **PASS** |

## Migration

**NENHUMA**

## Novas envs

**NENHUMA** (usar `LOG_LEVEL` / `DEBUG_STACK` já documentados)

## Ações manuais

| Área | Ação |
|---|---|
| Supabase | NENHUMA obrigatória; PITR continua decisão comercial |
| Vercel | NENHUMA |
| Sentry | Opcional futuro — não criar conta nesta sprint |

## P0 / P1

**P0:** 0
**P1 internos:** 0
**P1 externo:** `ASAAS_PRODUCTION_API_KEY_BLOCKER`

## Próxima sprint

**34.7** — relatórios necessários ao piloto — **somente após homologação 34.6** (não iniciada automaticamente).
