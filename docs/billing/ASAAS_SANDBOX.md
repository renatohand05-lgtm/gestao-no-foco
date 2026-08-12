# Asaas SANDBOX — Gestão no Foco (Sprint 33.4 + hotfix PIX/Cartão)

## Escopo

Integração **sandbox** do Asaas para cobrança SaaS por **tenant**.
**Não** usa credencial production. **Não** cobra cliente real.

## Arquivos

| Path | Papel |
|------|-------|
| `lib/billing/asaas/*` | Adapter (client, customers, subscriptions, tokenize, status-map, webhook) |
| `lib/billing/payment-hint.ts` | Fonte da verdade do método na UI (PIX ≠ BOLETO) |
| `lib/billing/remote-ip.ts` | IP do cliente via forwarded headers |
| `lib/billing/actions.ts` | Checkout / cancel / trial |
| `app/api/billing/webhook/route.ts` | Webhook (`asaas-access-token`) |
| `app/(app)/[tenant]/configuracoes/assinatura/page.tsx` | UI + reload do hint |

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

Nunca `NEXT_PUBLIC_*` para secrets. Nunca imprimir `ASAAS_API_KEY` / `ASAAS_WEBHOOK_TOKEN`.

## Bug corrigido (33.4 hotfix)

**Sintoma:** usuário escolhia PIX, mensagem citava PIX, mas o card mostrava `Método: BOLETO` + `Abrir boleto`.

**Causa:** reuse de subscription ACTIVE ignorava `billingType`; o hint usava o primeiro payment (boleto antigo).

**Correção:**
1. `ensureAsaasSubscription` alinha/atualiza `billingType` no provider (ou falha com DIVERGENCE).
2. `buildPaymentHint` usa método **solicitado** como rótulo; **nunca** anexa `bankSlipUrl` em PIX.
3. `pickPaymentForBillingType` só usa cobrança do método pedido.
4. UI renderiza `Abrir boleto` **somente** se `billingType === BOLETO` e houver `bankSlipUrl`.
5. Reload hidrata hint do último `billing_checkout_attempts` completed.

## Decisão cartão (tokenização)

**Fluxo A (preferido):** tokenizar primeiro
`POST /v3/creditCard/tokenizeCreditCard` → `creditCardToken` → criar/atualizar subscription com `billingType=CREDIT_CARD` + `creditCardToken` + `remoteIp`.

Motivo: dados sensíveis atravessam o servidor uma vez; depois só token; alinhado ao sandbox Asaas; evita formulário inseguro persistente.

Não persistir PAN/CVV. Persistência local: no máximo `cardMeta` (brand/last4) no `result_summary`.

## Métodos

| Método | Status |
|--------|--------|
| PIX | `billingType=PIX` + QR/copia-e-cola quando Asaas retorna |
| Boleto | `billingType=BOLETO` + `bankSlipUrl` só se retornado |
| Cartão | Tokenização + subscription CREDIT_CARD (sandbox) |

## Idempotência

- Customer: `externalReference=tenant_id`
- Subscription: reuse ACTIVE **com mesmo billingType**; senão PUT alinhando método
- Checkout: `billing_checkout_attempts (tenant_id, idempotency_key)`
- Webhook: `billing_provider_events (provider, event_id)` unique

## Multiempresa

- Tenant A → customer A → token A
- Tenant B → customer B → token B
- Mismatch `externalReference` → erro; token de A não é enviado para customer B.

## Setup sandbox (Renato)

1. Conta Asaas Sandbox
2. API Key sandbox + Webhook → `https://gestao-no-foco.vercel.app/api/billing/webhook`
3. Eventos: `PAYMENT_*` + `SUBSCRIPTION_*` já listados no runbook
4. Vercel Production: envs sandbox + `BILLING_ASAAS_CHECKOUT_ENABLED=1`
5. Redeploy

## Datas na UI (semântica)

| Rótulo | Fonte |
|--------|-------|
| Cobrança atual / vencimento | `payment.dueDate` da última cobrança criada |
| Próxima renovação | `subscription.nextDueDate` → `current_period_end` |
| Última cobrança criada | Card de resultado do checkout (não confundir com o seletor do formulário) |
| Status | Status Asaas da cobrança (`PENDING`, `CONFIRMED`, …) amigável + técnico |

Se as duas datas coincidem, a UI mostra só a cobrança atual e explica que a renovação ainda não diverge.

## Webhook smoke

```bash
npm run test:phase33-4-webhook-smoke
```

Valida GET + rejeição 401 sem token / token inválido. Evento autenticado real continua via Asaas Sandbox → URL production.

## Go-live real

**Não** nesta sprint. Ver `docs/billing/PILOT_BILLING_RUNBOOK.md`.
