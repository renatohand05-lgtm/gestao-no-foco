# Asaas SANDBOX — Gestão no Foco (Sprint 33.4)

## Escopo

Integração **sandbox** do Asaas para cobrança SaaS por **tenant**.  
**Não** usa credencial production. **Não** cobra cliente real.

## Arquivos

| Path | Papel |
|------|-------|
| `lib/billing/asaas/*` | Adapter (client, customers, subscriptions, status-map, webhook) |
| `lib/billing/actions.ts` | Checkout / cancel / trial |
| `app/api/billing/webhook/route.ts` | Webhook (`asaas-access-token`) |
| `app/(app)/[tenant]/configuracoes/assinatura/page.tsx` | UI |

## Variáveis (somente servidor)

| Env | Obrigatório | Notas |
|-----|-------------|-------|
| `BILLING_PROVIDER=asaas` | sim | ativa provedor |
| `ASAAS_API_KEY` | sim | chave **sandbox** |
| `ASAAS_WEBHOOK_TOKEN` | sim | token do webhook (header `asaas-access-token`) |
| `ASAAS_ENV=sandbox` | recomendado | default sandbox |
| `BILLING_ASAAS_CHECKOUT_ENABLED=1` | opt-in | sem isso não cria cobrança mesmo com key |
| `BILLING_SANDBOX_AMOUNT` | opcional | default `19.9` se plano pilot sem preço |
| `ASAAS_API_BASE_URL` | opcional | default `https://api-sandbox.asaas.com` |
| `ASAAS_ALLOW_PRODUCTION` | **não** setar | bloqueia API production |

Nunca `NEXT_PUBLIC_*` para secrets.

## Setup sandbox (Renato)

1. Criar conta Asaas Sandbox (manual — fora do repo)
2. Gerar API Key sandbox
3. Criar Webhook apontando para  
   `https://gestao-no-foco.vercel.app/api/billing/webhook`  
   Auth token = valor de `ASAAS_WEBHOOK_TOKEN`  
   Eventos mínimos:  
   `PAYMENT_CREATED`, `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`,  
   `SUBSCRIPTION_CREATED`, `SUBSCRIPTION_UPDATED`, `SUBSCRIPTION_INACTIVATED`, `SUBSCRIPTION_DELETED`
4. No Vercel (Production env): setar variáveis acima com `BILLING_ASAAS_CHECKOUT_ENABLED=1` só após smoke local/sandbox
5. Redeploy

## Fluxo

```
OWNER → Assinatura → Checkout PIX/BOLETO
  → ensure customer (externalReference=tenant_id)
  → ensure subscription Asaas
  → grava provider_*_id (status interno NÃO vira active)
  → webhook PAYMENT_RECEIVED/CONFIRMED → active
  → PAYMENT_OVERDUE → past_due
  → SUBSCRIPTION_DELETED/INACTIVATED → canceled
```

## Métodos

| Método | Status integração |
|--------|-------------------|
| PIX | Implementado (API subscription `billingType=PIX`) |
| Boleto | Implementado (`BOLETO`) |
| Cartão | **Não** — exige tokenização Asaas; formulário PAN/CVV proibido |

## Idempotência

- Customer: lookup por `externalReference=tenant_id`
- Subscription: reuse ACTIVE com mesmo externalReference
- Checkout: `billing_checkout_attempts (tenant_id, idempotency_key)`
- Webhook: `billing_provider_events (provider, event_id)` unique

## Segurança

- 1 tenant = 1 customer principal
- Webhook rejeita token inválido
- Mismatch customer/subscription → 409, sem update
- Evento desconhecido → não concede `active`
- Production API bloqueada sem `ASAAS_ALLOW_PRODUCTION=1`

## Go-live checklist (NÃO executar agora)

Ver `docs/billing/PILOT_BILLING_RUNBOOK.md`.
