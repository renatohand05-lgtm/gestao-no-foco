# Sprint 33.8 — Asaas production readiness (sem cobrança real)

**ASAAS_ENV:** sandbox · **REAL_CHARGES:** OFF · **Mobile:** NÃO

Readiness técnico preparado. Microtransação real: **não executada**.

- Isolamento: `ASAAS_API_KEY_PRODUCTION` / `ASAAS_WEBHOOK_TOKEN_PRODUCTION` (não setar agora)
- Pilot bloqueado em production
- Fail-closed: só `BILLING_REAL_CHARGES_ENABLED=1` autoriza cobrança real
- Runbook: `docs/billing/ASAAS_PRODUCTION_READINESS.md`

Menor valor comercial cobrável no futuro: Essencial R$ 279,90. R$ 19,90 não vai para production.

## Gates

- 33.8 readiness: 7/7 PASS
- 33.3–33.7 regressão: PASS
- lint: PASS
- typecheck: PASS
- production build: PASS

## Não feito (parada obrigatória)

- Não alterou `ASAAS_ENV` / keys sandbox / webhook token
- Não setou envs production no Vercel
- Não criou webhook/API key production
- Não habilitou `BILLING_REAL_CHARGES_ENABLED`
- Não executou microtransação
- Não reexecutou migração 33.7
