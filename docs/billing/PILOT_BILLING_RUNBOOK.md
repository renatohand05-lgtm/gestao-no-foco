# Runbook — Billing piloto (Sprint 33.4 fechamento)

## Status

| Item | Estado |
|------|--------|
| Schema billing (33.3) | Aplicado |
| Trial sem cartão | GO |
| PIX / BOLETO / CARTÃO sandbox | Homologados manualmente |
| Bug PIX→UI BOLETO | Corrigido |
| Datas UI | Cobrança atual ≠ Próxima renovação (rótulos distintos) |
| Webhook auth gate | Smoke PASS (`test:phase33-4-webhook-smoke`) |
| Cobrança real | **OFF** |

## Credenciais (sandbox only)

1. `BILLING_PROVIDER=asaas`
2. `ASAAS_ENV=sandbox`
3. `ASAAS_API_KEY` (sandbox)
4. `ASAAS_WEBHOOK_TOKEN`
5. `BILLING_ASAAS_CHECKOUT_ENABLED=1`

Webhook: `https://gestao-no-foco.vercel.app/api/billing/webhook`
Header: `asaas-access-token`

## Smoke pós-deploy (tenant teste)

1. Confirmar card **Última cobrança criada** (método/valor/vencimento/status)
2. Plano: **Cobrança atual / vencimento** e **Próxima renovação** sem ambiguidade
3. PIX sem “Abrir boleto”; BOLETO/CARTÃO isolados
4. Opcional: no painel Asaas Sandbox, reenviar `PAYMENT_RECEIVED` e conferir status da assinatura só via webhook

## Próxima sprint

33.5

## Rollback

`BILLING_ASAAS_CHECKOUT_ENABLED=0`
