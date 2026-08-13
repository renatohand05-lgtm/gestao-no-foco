# Billing / monetização — arquitetura (Sprint 33.5)

**Status:** schema 33.3 + Asaas **sandbox** operacional.
**PAYMENT REAL: NÃO** · **ASAAS_ENV: sandbox** · **ENFORCEMENT: OFF**
**PAYMENT IMPLEMENTADO: NÃO** (cobrança real). Sandbox PIX/BOLETO/CARTÃO: sim.

## Inventário de arquivos

| Área | Paths |
|------|-------|
| Config / flags | `lib/billing/config.ts` (`BILLING_ASAAS_CHECKOUT_ENABLED`, `BILLING_ENFORCEMENT`, `ASAAS_*`) |
| Domínio | `lib/billing/{actions,auth,repository,entitlements,types,payment-hint,enrich-payment-hint,remote-ip}.ts` |
| Asaas | `lib/billing/asaas/{client,customers,subscriptions,tokenize,status-map,webhook,types,index}.ts` |
| Webhook HTTP | `app/api/billing/webhook/route.ts` |
| UI | `components/billing/billing-actions-panel.tsx`, `app/(app)/[tenant]/configuracoes/assinatura/page.tsx` |
| Schema | `supabase/migrations/20260823_phase33_3_billing.sql` |
| Runbooks | `ASAAS_SANDBOX.md`, `PILOT_BILLING_RUNBOOK.md`, `SUPPORT_RUNBOOK.md`, `PRODUCTION_ACTIVATION_RUNBOOK.md` |

## Modelo

```
tenant
  └── billing_subscriptions (1:1)
        ├── status: trial | active | past_due | canceled
        ├── provider=asaas
        ├── provider_customer_id
        └── provider_subscription_id
  └── billing_checkout_attempts (idempotency_key)
  └── billing_provider_events (provider, event_id unique)
```

Assinatura = **TENANT**. Multiempresa: A e B isolados (`externalReference=tenant_id`).

## Status mapping (Asaas → interno)

| Evento | Interno |
|--------|---------|
| `PAYMENT_RECEIVED` / `PAYMENT_CONFIRMED` | `active` |
| `PAYMENT_OVERDUE` | `past_due` |
| `PAYMENT_REFUNDED` | `canceled` |
| `PAYMENT_CREATED` | ignore (+ sync status cobrança no checkout) |
| `SUBSCRIPTION_CREATED` | ignore |
| `SUBSCRIPTION_INACTIVATED` / `DELETED` | `canceled` |
| desconhecido | **não** vira `active` |

Checkout criado ≠ pagamento confirmado. UI nunca marca `active`.
Idempotência: checkout attempts + webhook `event_id` + customer/subscription por `externalReference`.
Webhook: `asaas-access-token` + mapeamento de status seguro.

## Entitlement ∧ RBAC

`finalAccessAllowed({ entitlement, rbac })` — pagamento não eleva role.
OWNER gerencia billing; member não inicia checkout.

## past_due / cancel / trial

- trial / past_due / canceled não apagam tenant nem histórico
- Enforcement OFF no piloto (`BILLING_ENFORCEMENT` ≠ 1)
- Grace period comercial: não definido

## Kill switch

`BILLING_ASAAS_CHECKOUT_ENABLED=0` — bloqueia novos checkouts; mantém leitura/webhook.

## Docs

- Suporte: `docs/billing/SUPPORT_RUNBOOK.md`
- Ativação real (não executar): `docs/billing/PRODUCTION_ACTIVATION_RUNBOOK.md`
- Piloto: `docs/billing/PILOT_BILLING_RUNBOOK.md`
