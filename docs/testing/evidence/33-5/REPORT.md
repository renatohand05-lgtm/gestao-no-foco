# Sprint 33.5 — Prontidão final do piloto (billing)

**Data:** 2026-08-12  
**Mobile:** NÃO alterado  
**ASAAS_ENV:** sandbox  
**Enforcement:** OFF  
**Cobrança real:** NO-GO  

## Inventário (arquivos relevantes)

Ver `docs/billing/BILLING_ARCHITECTURE.md`.

## Mudanças desta sprint

1. Status UI: vazio → “Aguardando confirmação do provedor” (não fabrica CONFIRMED)
2. Enrich da última cobrança via Asaas (`enrich-payment-hint.ts`) no load da página
3. Webhook sincroniza `paymentHint.providerStatus` no último checkout completed
4. Runbooks: `SUPPORT_RUNBOOK.md`, `PRODUCTION_ACTIVATION_RUNBOOK.md` (não executar), piloto + kill switch
5. Testes: `npm run test:phase33-5-pilot`

## Gates

| Gate | Resultado |
|------|-----------|
| `test:phase33-5-pilot` | 24 PASS |
| `test:phase33-4-asaas` | 27 PASS |
| `test:phase33-4-webhook-smoke` | PASS (auth GET/401) |
| `test:phase33-3-billing` | 15 PASS |
| `test:phase33-2-multiempresa` | 16 PASS |
| `test:rbac` | 92 PASS |
| lint (arquivos sprint) | PASS |
| build web (inclui typecheck) | PASS |
| `git diff --check` (paths sprint) | PASS |

## Webhook E2E

| Etapa | Resultado |
|-------|-----------|
| Auth token inválido/ausente | PASS (HTTP 401 production) |
| Idempotência / mismatch (código) | PASS |
| Evento autenticado PAYMENT_* real | **MANUAL** — depende de reenvio no painel Asaas Sandbox |

## Kill switch

`BILLING_ASAAS_CHECKOUT_ENABLED=0` — documentado e testado por contrato.

## Go / No-Go

| Critério | Veredito |
|----------|----------|
| Piloto técnico / sem cobrança / sandbox | **GO** |
| Cobrança real | **NO-GO** |
| Enforcement real | **NO-GO** |
| Rollback / suporte | **READY** |

## Migration / ENVs

- Novas migrations: **NENHUMA**
- Novas ENVs: **NENHUMA**
