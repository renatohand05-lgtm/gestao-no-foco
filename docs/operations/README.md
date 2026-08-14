# Operations README — Gestão no Foco

Índice operacional (Sprints 34.6–34.8). Não altera billing / Asaas / Vercel automaticamente.

| Documento | Uso |
|---|---|
| [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) | Gate de release / RC |
| [FIRST_CLIENT_CHECKLIST.md](./FIRST_CLIENT_CHECKLIST.md) | Entrada do primeiro cliente beta |
| [BETA_SCOPE.md](./BETA_SCOPE.md) | Limites operacionais do piloto |
| [TEST_TENANTS.md](./TEST_TENANTS.md) | Tenants QA — não apagar |
| [ROLLBACK_CHECKLIST.md](./ROLLBACK_CHECKLIST.md) | Rollback (não executar sem decisão) |
| [INCIDENT_RUNBOOK.md](./INCIDENT_RUNBOOK.md) | Severidade, contenção, postmortem |
| [RECOVERY_RUNBOOK.md](./RECOVERY_RUNBOOK.md) | Backup, PITR, restore |
| [SUPPORT_RUNBOOK.md](./SUPPORT_RUNBOOK.md) | Atendimento |
| [MIGRATION_CHECKLIST.md](./MIGRATION_CHECKLIST.md) | SQL em production |
| [DEPLOY_READINESS.md](./DEPLOY_READINESS.md) | Smoke pós-deploy |
| [IMPORT_INTELLIGENCE_OPERATIONS.md](./IMPORT_INTELLIGENCE_OPERATIONS.md) | Import Intelligence (legado) |

## Health público (sem secrets)

- `GET https://gestao-no-foco.vercel.app/api/health`
- `GET https://gestao-no-foco.vercel.app/api/status`

Resposta inclui `requestId` e checks (`env`, `supabase`, `serviceRole` = presença da env, **não** o valor).

## Estado conhecido (34.2 / 34.6 / 34.8)

| Item | Status |
|---|---|
| Backup diário Supabase | **PASS** |
| PITR | **NOT ENABLED** (risco **ACCEPTABLE** para beta controlado) |
| Billing | **FROZEN SAFE** |
| Monitoring externo (Sentry) | **PARTIAL** — **NON-BLOCKING** para 1º cliente controlado |
| Cliente pago | **NO-GO** até Asaas production key |
