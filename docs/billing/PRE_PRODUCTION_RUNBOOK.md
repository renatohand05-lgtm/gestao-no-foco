# Pré-produção comercial Asaas — Sprint 33.6

Readiness 33.8: `docs/billing/ASAAS_PRODUCTION_READINESS.md`.

**NÃO EXECUTAR ativação real nesta sprint.**  
**ASAAS_ENV atual:** sandbox. **Cobrança real:** NO-GO.

## Gates (fail-closed)

| Gate | Significado | Como está hoje |
|------|-------------|----------------|
| A — técnico | `BILLING_PROVIDER=asaas` + `ASAAS_API_KEY` + `ASAAS_WEBHOOK_TOKEN` | ON (sandbox) |
| B — checkout sandbox | A + `ASAAS_ENV=sandbox` + `BILLING_ASAAS_CHECKOUT_ENABLED=1` | ON |
| C — cobrança real | `ASAAS_ENV=production` + `ASAAS_ALLOW_PRODUCTION=1` + `BILLING_REAL_CHARGES_ENABLED=1` + checkout=1 | **OFF** |

Kill switch: `BILLING_ASAAS_CHECKOUT_ENABLED=0` (bloqueia A/B/C de criar cobrança).

R$ 19,90 = homologação sandbox (`BILLING_SANDBOX_AMOUNT`). **Não** é preço comercial. Production exige `billing_plans.amount_cents` definido por decisão humana.

## A. Variáveis Sandbox (atuais)

Configurar no **Vercel → Project → Settings → Environment Variables → Production** (app Vercel, Asaas continua sandbox):

- `BILLING_PROVIDER=asaas`
- `ASAAS_ENV=sandbox`
- `ASAAS_API_KEY` (sandbox)
- `ASAAS_WEBHOOK_TOKEN` (sandbox)
- `BILLING_ASAAS_CHECKOUT_ENABLED=1`
- `BILLING_ENFORCEMENT` ausente ou ≠ `1`
- `BILLING_REAL_CHARGES_ENABLED` ausente ou ≠ `1`
- `ASAAS_ALLOW_PRODUCTION` ausente

Nunca `NEXT_PUBLIC_*` para secrets. Não colar valores no chat.

## B. Variáveis futuras Production (não setar agora)

- `ASAAS_ENV=production`
- `ASAAS_API_KEY` (production, **nova**)
- `ASAAS_WEBHOOK_TOKEN` (production, **novo**)
- `ASAAS_ALLOW_PRODUCTION=1`
- `BILLING_REAL_CHARGES_ENABLED=1` (só após confirmação humana)
- `BILLING_ASAAS_CHECKOUT_ENABLED=0` no primeiro deploy production; `1` só depois do smoke
- Plano com `amount_cents` no banco (não usar 19,90)

## C. Secrets que Renato obterá no Asaas (futuro)

1. API Key da conta **production** (não a sandbox)
2. Token de autenticação do webhook **production**

Onde: painel Asaas → Integrações / API / Webhooks.  
Onde configurar: **somente Vercel env**, nunca no repositório.

## D. Onde configurar cada secret

| Secret | Onde |
|--------|------|
| `ASAAS_API_KEY` | Vercel Production env (encrypted) |
| `ASAAS_WEBHOOK_TOKEN` | Vercel Production env (encrypted) |
| Token no painel Asaas | Asaas → Webhook → access token = mesmo valor de `ASAAS_WEBHOOK_TOKEN` |

## E. Webhook

URL (já usada no sandbox): `https://gestao-no-foco.vercel.app/api/billing/webhook`  
Header: `asaas-access-token`  
Production: criar **outro** webhook na conta production, token novo, mesmos eventos (`PAYMENT_*`, `SUBSCRIPTION_*`).

## F. Microtransação (checklist — NÃO executar agora)

Exige confirmação humana **antes** de: inserir credencial production, habilitar checkout production, criar cobrança real.

1. Checkpoint SHA + `BILLING_REAL_CHARGES_ENABLED` ainda off
2. `amount_cents` comercial definido no plano (decisão humana)
3. Setar keys production no Vercel com checkout **desligado**
4. Redeploy + smoke sem cobrança
5. Confirmar humano
6. `BILLING_ASAAS_CHECKOUT_ENABLED=1` + `BILLING_REAL_CHARGES_ENABLED=1`
7. Uma cobrança no menor valor do plano, tenant de teste, OWNER
8. Confirmar webhook → status `active`
9. Se falhar: kill switch `BILLING_ASAAS_CHECKOUT_ENABLED=0`

## G. Rollback

1. `BILLING_ASAAS_CHECKOUT_ENABLED=0`
2. `BILLING_REAL_CHARGES_ENABLED` remover
3. Restaurar `ASAAS_ENV=sandbox` + keys sandbox
4. Remover `ASAAS_ALLOW_PRODUCTION`
5. Redeploy  
Não apagar tenants, histórico nem `billing_provider_events`.

## H. Kill switch

`BILLING_ASAAS_CHECKOUT_ENABLED=0` → novos checkouts bloqueados; webhook e leitura permanecem.

## I. Como confirmar webhook

- Painel Asaas: logs do webhook (HTTP 200 / 401)
- App: GET `/api/billing/webhook` (`sandbox: true` hoje)
- Banco: `billing_provider_events` por `event_id`
- UI: status da última cobrança (CONFIRMED/RECEIVED) — **não** marcar active no frontend

## J. Como verificar uma cobrança

- UI Assinatura: customer `cus_*`, subscription `sub_*`, última cobrança
- Asaas: mesma `sub_` / payment
- `billing_checkout_attempts.result_summary` (sem PAN/CVV)
- `billing_subscriptions.status`

## K. Incidente sem expor secrets

Correlacionar logs: `requestId`, `tenantId`, `billing.checkout.*`, `billing.webhook.*`, `billing.asaas.api_error`.  
Nunca copiar `ASAAS_API_KEY`, webhook token, PAN, CVV, header `access_token`.

## Preço

Fonte: `billing_plans.amount_cents` no servidor. Cliente não envia valor. Plano não autorizado é rejeitado.  
Não assumir R$ 19,90 como preço comercial.
