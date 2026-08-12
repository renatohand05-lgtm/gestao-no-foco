# Sprint 33.4 — Asaas sandbox adapter + billing seguro

**Data:** 2026-08-12  
**Mobile:** **NÃO alterado**  
**Base 33.3:** `8e73887`

## Auditoria

Integração Asaas runtime **não existia** antes (apenas stub genérico 33.3 + catálogo).  
Secrets Asaas: **ausentes** no ambiente (`.env.local` sem `ASAAS_*`).

## Entregas

| Item | Status |
|------|--------|
| Adapter Asaas (`lib/billing/asaas/*`) | PASS |
| Customer idempotente (`externalReference=tenant_id`) | PASS (código) |
| Subscription PIX/BOLETO | PASS (código) |
| Cartão | NÃO TESTADO — bloqueado sem tokenização |
| Webhook `asaas-access-token` + idempotência | PASS |
| Status mapping seguro | PASS |
| Cancelamento OWNER | PASS (código) |
| past_due (sem apagar dados) | PASS (política) |
| UI sandbox banner + checkout form | PASS |
| Chamada live sandbox Asaas | **NÃO EXECUTADO** (credenciais ausentes) |
| Cobrança real | **NÃO** |

## Credenciais para Renato continuar

1. `BILLING_PROVIDER=asaas`
2. `ASAAS_ENV=sandbox`
3. `ASAAS_API_KEY` (sandbox)
4. `ASAAS_WEBHOOK_TOKEN`
5. `BILLING_ASAAS_CHECKOUT_ENABLED=1`
6. Webhook URL: `https://gestao-no-foco.vercel.app/api/billing/webhook`

## Gates

| Gate | Resultado |
|------|-----------|
| `test:phase33-4-asaas` | 15 PASS |
| `test:phase33-3-billing` | 15 PASS |
| `test:phase33-2-multiempresa` | 16 PASS |
| `test:phase33-1-hardening` | 13 PASS |
| `test:rbac` | 92 PASS |
| lint | PASS |
| build web | PASS |
| `git diff --check` | PASS |

## Docs

- `docs/billing/ASAAS_SANDBOX.md`
- `docs/billing/BILLING_ARCHITECTURE.md`
- `docs/billing/PILOT_BILLING_RUNBOOK.md`

## Decisão

| Critério | Veredito |
|----------|----------|
| Piloto sem cobrança | **GO** |
| Piloto com cobrança sandbox | **NO-GO** até secrets + webhook Asaas |
| Piloto com cobrança real | **NO-GO** |
| Plataforma 5 dias | **VERDE** |
| Provedor externo | **AMARELO** (KYC/conta sandbox) |

## Migration

**NÃO** — schema 33.3 suficiente.
