# Billing / monetização — arquitetura (Sprint 33.4)

**Status:** schema 33.3 em production + adapter Asaas **sandbox** no código.  
**PAYMENT REAL: NÃO IMPLEMENTADO** · **ASAAS ENV: NÃO CONFIGURADO** (secrets ausentes no ambiente local/Vercel até Renato configurar).

## Arquivos reais (auditoria 33.4)

| Área | Paths |
|------|-------|
| Config | `lib/billing/config.ts` |
| Domínio | `lib/billing/{actions,auth,repository,entitlements,types}.ts` |
| Asaas | `lib/billing/asaas/{client,customers,subscriptions,status-map,webhook,types,index}.ts` |
| Webhook HTTP | `app/api/billing/webhook/route.ts` |
| UI | `components/billing/billing-actions-panel.tsx`, `.../configuracoes/assinatura/page.tsx` |
| Schema | `supabase/migrations/20260823_phase33_3_billing.sql` (já aplicado) |

Não havia integração Asaas runtime antes de 33.4 (só stub genérico + catálogo de integrações).

## Modelo

```
tenant
  └── billing_subscriptions (1:1)
        ├── provider=asaas
        ├── provider_customer_id
        ├── provider_subscription_id
        └── status: trial | active | past_due | canceled
```

Assinatura = **TENANT**. Multiempresa: A e B têm customers/subscriptions distintos (`externalReference=tenant_id`).

## Status mapping (Asaas → interno)

| Evento Asaas | Interno |
|--------------|---------|
| `PAYMENT_RECEIVED` / `PAYMENT_CONFIRMED` | `active` |
| `PAYMENT_OVERDUE` | `past_due` |
| `PAYMENT_REFUNDED` | `canceled` |
| `SUBSCRIPTION_CREATED` | ignore (≠ pago) |
| `SUBSCRIPTION_INACTIVATED` / `DELETED` | `canceled` |
| desconhecido | **não** vira `active` |

## past_due / cancel

- Não apaga tenant, dados nem histórico
- Grace period comercial: **não definido** — suporte técnico preparado
- Cancel: OWNER → API Asaas DELETE subscription (se houver) → status `canceled` local

## Entitlement ∧ RBAC

`finalAccessAllowed({ entitlement, rbac })` — pagamento não eleva role.

## Checkout

- Opt-in: `BILLING_ASAAS_CHECKOUT_ENABLED=1`
- Sem secrets: mensagem clara com lista de envs faltantes
- Frontend **nunca** marca `active`
- Idempotência: checkout attempts + webhook `event_id` + customer/subscription por `externalReference`
- Webhook: `asaas-access-token` + mapeamento de status seguro

## Docs

- `docs/billing/ASAAS_SANDBOX.md`
- `docs/billing/PILOT_BILLING_RUNBOOK.md`

**PAYMENT IMPLEMENTADO: NÃO**
