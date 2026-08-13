# Sprint 33.8 — Asaas Production Readiness

**Status desta sprint:** READINESS ONLY.  
**ASAAS_ENV atual:** sandbox.  
**BILLING_REAL_CHARGES_ENABLED:** OFF (fail-closed).  
**Cobrança real / microtransação:** NÃO EXECUTAR.  
**R$ 19,90:** homologação sandbox. **Não** é preço comercial.

Nunca colar API keys, webhook tokens, PAN ou CVV neste documento, em logs ou no chat.

## Auditoria (estado atual)

| Item | Resultado |
|------|-----------|
| Gates A/B (sandbox técnico + checkout opt-in) | Preservados |
| Gate C cobrança real | OFF — só `BILLING_REAL_CHARGES_ENABLED=1` liga |
| Isolamento de keys | Production usa `ASAAS_API_KEY_PRODUCTION` — **não** reutiliza a sandbox |
| Isolamento de webhook | Production usa `ASAAS_WEBHOOK_TOKEN_PRODUCTION` — token sandbox não autoriza |
| Idempotência webhook | `billing_provider_events (provider, event_id)` unique |
| Tenant isolation | RLS + `externalReference=tenant_id` + auth por slug |
| PIX / BOLETO / CARTÃO | Homologados em sandbox; cartão tokenize-first, sem PAN/CVV persistido |
| PENDING / CONFIRMED / RECEIVED / OVERDUE / REFUNDED | Mapeados; desconhecido não vira `active` |
| Kill switch | `BILLING_ASAAS_CHECKOUT_ENABLED=0` |
| Plano `pilot` | Preservado; bloqueado em production |
| Catálogo comercial | Essencial 27990 / Gestão 47990 / Pro 74990 / Pro Plus 349990 |

## Gates fail-closed

| Gate | Liga somente se |
|------|-----------------|
| A técnico | `BILLING_PROVIDER=asaas` + key + webhook token do **modo atual** |
| B sandbox checkout | A + `ASAAS_ENV=sandbox` + `BILLING_ASAAS_CHECKOUT_ENABLED=1` |
| C cobrança real | `ASAAS_ENV=production` + `ASAAS_ALLOW_PRODUCTION=1` + `BILLING_REAL_CHARGES_ENABLED=1` + checkout=1 + keys **production distintas** |

Ausente / `false` / `0` / `true` / `yes` / inválido em `BILLING_REAL_CHARGES_ENABLED` = **OFF**.

## Envs atuais (manter)

Não alterar nesta sprint:

- `ASAAS_ENV=sandbox`
- `ASAAS_API_KEY` (sandbox)
- `ASAAS_WEBHOOK_TOKEN` (sandbox)
- `BILLING_ASAAS_CHECKOUT_ENABLED` (sandbox opt-in)
- `BILLING_REAL_CHARGES_ENABLED` ausente
- `ASAAS_ALLOW_PRODUCTION` ausente
- `BILLING_ENFORCEMENT` ausente

## Envs futuras (NÃO setar agora)

Slots preparados no código. **Não configurar no Vercel até autorização explícita:**

- `ASAAS_API_KEY_PRODUCTION`
- `ASAAS_WEBHOOK_TOKEN_PRODUCTION`
- `ASAAS_ENV=production`
- `ASAAS_ALLOW_PRODUCTION=1`
- `BILLING_REAL_CHARGES_ENABLED=1`

Se as duas keys (ou os dois tokens) forem iguais, o sistema **bloqueia**.

Nunca `NEXT_PUBLIC_*` para secrets.

## Webhook

URL: `https://gestao-no-foco.vercel.app/api/billing/webhook`  
Header: `asaas-access-token` (timing-safe).

Sandbox e production **devem** ser webhooks distintos, com tokens distintos.

Eventos: `PAYMENT_*`, `SUBSCRIPTION_*`.

| Evento / status | Efeito interno |
|-----------------|----------------|
| PENDING / CREATED / UPDATED / AWAITING_RISK_ANALYSIS | ignore (não promove `active`) |
| CONFIRMED / RECEIVED | `active` |
| OVERDUE | `past_due` |
| REFUNDED | `canceled` |
| CHARGEBACK* | unknown — **não** inventa política |
| desconhecido | não vira `active` |

`CONFIRMED`/`RECEIVED` não regridem para `PENDING`.  
`active` não regride para `trial`. `canceled` é terminal no webhook.

## PCI / cartão

- Tokenização Asaas antes da assinatura
- PAN/CVV só em memória até o POST de tokenize
- Não persiste em `result_summary`, logs, localStorage
- Last4/brand apenas após token

## Kill switch / rollback (futuro cutover)

Ordem imediata, **sem apagar dados**:

1. `BILLING_ASAAS_CHECKOUT_ENABLED=0`
2. Remover `BILLING_REAL_CHARGES_ENABLED`
3. Remover `ASAAS_ALLOW_PRODUCTION`
4. Restaurar `ASAAS_ENV=sandbox` + keys sandbox
5. Redeploy  
Não apagar tenants, histórico, `billing_provider_events` nem o plano `pilot`.

## Microtransação controlada — NÃO EXECUTAR NESTA SPRINT

Não há valor “micro” no catálogo comercial. O menor plano cobrável em production é:

**Essencial — R$ 279,90 (`amount_cents=27990`).**

R$ 19,90 **não** pode ser usado em production.

Checklist futuro (só após autorização explícita de Renato):

1. Checkpoint SHA + screenshot Assinatura sandbox
2. Confirmar KYC da conta Asaas **production** (sem colar keys)
3. Criar webhook **production** (token novo, URL acima)
4. Setar no Vercel, **sem checkout**: `ASAAS_ENV=production`, keys production, `BILLING_ASAAS_CHECKOUT_ENABLED=0`, `BILLING_REAL_CHARGES_ENABLED` ainda ausente
5. Redeploy + smoke **sem cobrança** (login, Assinatura, GET webhook `sandbox: false`)
6. Confirmação humana explícita
7. Ligar `ASAAS_ALLOW_PRODUCTION=1` + `BILLING_ASAAS_CHECKOUT_ENABLED=1` + `BILLING_REAL_CHARGES_ENABLED=1`
8. Tenant de **teste**, OWNER, plano Essencial (27990), preferir PIX
9. Confirmar webhook → `active` e evento idempotente
10. Cancelar/estornar no provedor se for teste; **não** apagar tenant
11. Se falhar: kill switch passo 1

## O que esta sprint NÃO faz

- Não altera `ASAAS_ENV`
- Não altera `ASAAS_API_KEY` / `ASAAS_WEBHOOK_TOKEN` existentes
- Não seta envs production no Vercel
- Não cria webhook production no Asaas
- Não habilita `BILLING_REAL_CHARGES_ENABLED`
- Não executa cobrança real
- Não remove/converte o plano `pilot`
- Não liga enforcement comercial
