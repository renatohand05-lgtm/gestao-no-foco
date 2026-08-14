# Operações — Gestão no Foco

Índice operacional (Sprint 34.6). Não altera billing / Asaas / Vercel automaticamente.

| Documento | Uso |
|---|---|
| [INCIDENT_RUNBOOK.md](./INCIDENT_RUNBOOK.md) | Severidade, contenção, postmortem |
| [RECOVERY_RUNBOOK.md](./RECOVERY_RUNBOOK.md) | Backup, PITR, restore (não executar sem decisão) |
| [SUPPORT_RUNBOOK.md](./SUPPORT_RUNBOOK.md) | Atendimento ao primeiro cliente |
| [MIGRATION_CHECKLIST.md](./MIGRATION_CHECKLIST.md) | Antes/depois de SQL em production |
| [DEPLOY_READINESS.md](./DEPLOY_READINESS.md) | Smoke pós-deploy |
| [IMPORT_INTELLIGENCE_OPERATIONS.md](./IMPORT_INTELLIGENCE_OPERATIONS.md) | Import Intelligence (legado) |

## Health público (sem secrets)

- `GET https://gestao-no-foco.vercel.app/api/health`
- `GET https://gestao-no-foco.vercel.app/api/status`

Resposta inclui `requestId` e checks (`env`, `supabase`, `serviceRole` = presença da env, **não** o valor).

## Estado conhecido (34.2 / 34.6)

| Item | Status |
|---|---|
| Backup diário Supabase | **PASS** (confirmado manualmente) |
| PITR | **NOT ENABLED** |
| Billing | **FROZEN SAFE** |
| Monitoring externo (Sentry) | **NÃO CONFIGURADO** — logging estruturado no servidor |
