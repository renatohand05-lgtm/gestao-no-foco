# Sprint 33.6 — Pré-go-live comercial Asaas (sem cobrança real)

**Data:** 2026-08-13  
**ASAAS_ENV:** sandbox  
**Cobrança real:** NO-GO  
**Mobile:** NÃO alterado  
**Enforcement:** OFF  

## Auditoria (preservado)

Checkout server-side, PIX/BOLETO/CARTÃO sandbox, webhook token + idempotência, kill switch `BILLING_ASAAS_CHECKOUT_ENABLED`, tokenização sem PAN/CVV.

## Entregas

1. Fail-closed sandbox vs production (sem fallback automático)
2. Gate C: `BILLING_REAL_CHARGES_ENABLED` (default OFF)
3. Preço só server-side; R$ 19,90 = homologação sandbox; production exige `amount_cents`
4. Plano não autorizado rejeitado; cliente não envia preço
5. Webhook não regride `active`→`trial` nem `CONFIRMED`→`PENDING`
6. Ciclo visível `pending` = trial + checkout completed (sem migration)
7. Runbook `docs/billing/PRE_PRODUCTION_RUNBOOK.md`

## Gates

Ver execução na sessão (test:phase33-6-pre-golive + regressão 33.4/33.5).

## NÃO feito (parada obrigatória)

- Não trocou `ASAAS_ENV` para production
- Não alterou secrets Vercel
- Não criou cobrança real
- Não definiu preço comercial
- Não ligou enforcement
