# Rollback Checklist — Release (não executar sem decisão)

**Sprint 34.8.** Referência; **não** rodar automaticamente.

## 1. App (Vercel)

1. Identificar deployment anterior estável (SHA).
2. Redeploy / Promote do deployment anterior no Vercel.
3. Confirmar `GET /api/health` e login.
4. Comunicar usuários se houver downtime.

## 2. Database migration

1. Preferir **forward fix** a rollback destrutivo.
2. Se migration nova foi aplicada: usar checklist [MIGRATION_CHECKLIST.md](./MIGRATION_CHECKLIST.md).
3. Não dropar dados de cliente para “voltar”.
4. Restore ponto-no-tempo: só com [RECOVERY_RUNBOOK.md](./RECOVERY_RUNBOOK.md) + decisão explícita (PITR pode estar OFF).

## 3. Feature flags / env

1. Desligar flags de feature problemática (sem expor secrets).
2. Não ligar billing production “para compensar”.

## 4. Billing kill switch

Estado seguro desejado:

- `ASAAS_ENV=sandbox` (ou equivalente atual)
- `BILLING_REAL_CHARGES_ENABLED` ≠ `1`
- `BILLING_ENFORCEMENT` ≠ `1` no piloto
- Checkout production OFF

**Não** usar chave sandbox em production.

## 5. Incident response

Seguir [INCIDENT_RUNBOOK.md](./INCIDENT_RUNBOOK.md) (SEV1/SEV2).

## 6. Pós-rollback

- [ ] SHA em produção anotado
- [ ] Cliente beta informado se impacto
- [ ] Postmortem curto
