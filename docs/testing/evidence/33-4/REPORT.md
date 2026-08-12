# Sprint 33.4 — Fechamento Asaas sandbox (PIX + BOLETO + CARTÃO + datas + webhook)

**Data:** 2026-08-12  
**Mobile:** **NÃO alterado**  
**ASAAS_ENV:** sandbox (production API bloqueada sem allow)

## Homologação manual (Renato) — pré-fechamento

| Método | Resultado |
|--------|-----------|
| PIX | Funcional (sandbox) |
| BOLETO | Funcional (sandbox) |
| CARTÃO | Funcional (sandbox) |
| Bug PIX→UI BOLETO | Corrigido |

## Correção de datas (UI)

| Campo | Semântica |
|-------|-----------|
| Cobrança atual / vencimento | `payment.dueDate` da última cobrança criada |
| Próxima renovação | `billing_subscriptions.current_period_end` ← `subscription.nextDueDate` Asaas |
| Última cobrança criada | Card separado do formulário (método + valor + vencimento + status provider) |

Não altera datas do provider — só interpretação/rótulos.

## Status da cobrança

Persiste `providerStatus` no payment hint (PENDING, CONFIRMED, RECEIVED, …) com label amigável + código técnico.  
Assinatura `active` **só** via webhook/backend.

## Webhook

| Check | Resultado |
|-------|-----------|
| GET `/api/billing/webhook` | PASS (`asaas`, sandbox=true) |
| POST sem token | PASS → 401 INVALID_SIGNATURE |
| POST token inválido | PASS → 401 |
| Evento autenticado real (PAYMENT_*) | **NÃO EXECUTADO** neste agente (sem replay com secret) |
| Idempotência (código `23505`) | PASS (contrato) |

Script: `npm run test:phase33-4-webhook-smoke`

## Gates

| Gate | Resultado |
|------|-----------|
| `test:phase33-4-asaas` | 27 PASS |
| `test:phase33-4-webhook-smoke` | PASS (auth gate) |
| `test:rbac` | 92 PASS |
| lint (arquivos sprint) | PASS |
| build web | PASS |
| `git diff --check` (paths sprint) | PASS |

## Segurança cartão

- PAN/CVV: não persistidos
- Tokenização: `/v3/creditCard/tokenizeCreditCard` + `remoteIp` cliente
- Cross-tenant: customer `externalReference=tenant_id`

## Go / No-Go

| Critério | Veredito |
|----------|----------|
| Piloto sem cobrança | **GO** |
| PIX / BOLETO / CARTÃO sandbox | **GO** (manual + código; smoke UI datas após deploy) |
| Cobrança sandbox (conjunto) | **GO** após confirmar labels no tenant teste |
| Cobrança real | **NO-GO** |
| Prazo 5 dias | **VERDE** |

## Migration / ENVs

- Nova migration: **NÃO**
- Novas ENVs: **NENHUMA**
