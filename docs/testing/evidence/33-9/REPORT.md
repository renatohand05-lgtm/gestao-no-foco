# Sprint 33.9 — Provisionamento controlado Asaas Production (pré-cutover)

**KYC production:** GO (confirmação manual).  
**ASAAS_ENV:** sandbox.  
**REAL_CHARGES:** OFF.  
**Microtransação:** NÃO executada.  
**Asaas/Vercel:** nenhuma alteração feita pelo agente.

Runbook: `docs/billing/ASAAS_PRODUCTION_PROVISIONING.md`

## Gates

- 33.9 provisioning: 7/7 PASS
- 33.3–33.8 regressão: PASS
- webhook smoke (GET + 401, sem cobrança): PASS (`sandbox: true`)
- lint / typecheck / build: PASS

## Não feito

- Não criou API key/webhook no Asaas
- Não alterou Vercel
- Não ligou `BILLING_REAL_CHARGES_ENABLED`
- Não mudou `ASAAS_ENV`
- Não executou microtransação
