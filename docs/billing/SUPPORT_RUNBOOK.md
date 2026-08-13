# Runbook de suporte — Billing Asaas (Sprint 33.5)

**Escopo:** sandbox / piloto. Sem cobrança real.  
**Kill switch:** `BILLING_ASAAS_CHECKOUT_ENABLED=0` (bloqueia novos checkouts; webhook e leitura permanecem).

## Correlação (logs)

Buscar por: `billing.checkout.*`, `billing.webhook.*`, `billing.asaas.api_error`, `billing.subscription.*`, `billing.card.tokenized`  
Correlacionar: `requestId`, `tenantId`, `asaasSubscriptionId` / `asaasCustomerId` (não secrets).

**Nunca** logar/copiar: `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, PAN, CVV, `Authorization`/`access_token`.

---

## A. Checkout não abriu

| | |
|--|--|
| Detectar | UI erro `PROVIDER_NOT_CONFIGURED` / `CHECKOUT_OPT_IN_REQUIRED` / OWNER only |
| Verificar | Vercel envs: `BILLING_PROVIDER`, `ASAAS_*`, `BILLING_ASAAS_CHECKOUT_ENABLED=1`; role OWNER |
| Não fazer | Colocar secret em `NEXT_PUBLIC_*`; usar key production |
| Ação | Corrigir env → redeploy; confirmar banner SANDBOX |
| Escalar | Se envs OK e Asaas 5xx persistente |

## B. PIX não apareceu

| | |
|--|--|
| Detectar | Método PIX mas sem QR/copia-e-cola |
| Verificar | `billingType` no checkout attempt; payment Asaas `PIX`; endpoint pixQrCode |
| Não fazer | Mostrar boleto como fallback |
| Ação | Abrir fatura PIX se `invoiceUrl`; retry checkout com nova idempotency key |
| Escalar | Asaas sem retornar PIX no sandbox |

## C. Boleto não apareceu

| | |
|--|--|
| Detectar | Método BOLETO sem `bankSlipUrl` |
| Verificar | Payment `billingType=BOLETO`; UI só mostra link se URL existir |
| Não fazer | Inventar URL de boleto |
| Ação | Usar `invoiceUrl`; aguardar geração no Asaas |
| Escalar | Sandbox sem bankSlip |

## D. Cartão recusado

| | |
|--|--|
| Detectar | Mensagem amigável de falha de cartão; status assinatura inalterado |
| Verificar | Logs `billing.checkout.failed` sem PAN; Asaas sandbox card docs |
| Não fazer | Reenviar PAN por chat/e-mail |
| Ação | Outro cartão de teste / PIX / boleto |
| Escalar | Tokenização continuamente 400 com holder válido |

## E. Cobrança criada mas status não atualizou

| | |
|--|--|
| Detectar | Card “Aguardando confirmação do provedor” ou PENDING longo |
| Verificar | Webhook Asaas → URL production; token; `billing_provider_events`; reload Assinatura |
| Não fazer | Marcar `active` manualmente no banco sem evidência |
| Ação | Reenviar evento no painel Asaas Sandbox; `npm run test:phase33-4-webhook-smoke` |
| Escalar | Eventos não chegam (firewall/URL errada) |

## F. Webhook falhou

| | |
|--|--|
| Detectar | 401/400/409/5xx no Asaas webhook log |
| Verificar | `asaas-access-token`; JSON; `SUBSCRIPTION_MISMATCH` / `CUSTOMER_MISMATCH` |
| Não fazer | Desligar auth do webhook |
| Ação | Alinhar token; corrigir vínculo customer/subscription do tenant |
| Escalar | 5xx persistente / service role ausente |

## G. Cobrança duplicada

| | |
|--|--|
| Detectar | 2 payments Asaas próximos |
| Verificar | Idempotency key distinta (double click gera keys novas — esperado 1 attempt cada se keys diferentes); reuse subscription mesmo `externalReference` |
| Não fazer | Apagar payments no Asaas sem registro |
| Ação | Documentar payment legítimo vs bug; cancelar extra só no sandbox se necessário |
| Escalar | Duplicata com a mesma idempotency key |

## H. Customer duplicado

| | |
|--|--|
| Detectar | 2 `cus_*` com mesmo `externalReference` |
| Verificar | Lookup por `externalReference=tenant_id` |
| Não fazer | Mesclar tenants |
| Ação | Manter o vinculado em `provider_customer_id`; marcar o outro no Asaas |
| Escalar | Race persistente |

## I. Subscription duplicada

| | |
|--|--|
| Detectar | 2 `sub_*` ACTIVE mesmo tenant |
| Verificar | `ensureAsaasSubscription` reuse/update |
| Não fazer | DELETE em production |
| Ação | Cancelar extras **somente sandbox**; manter a do `provider_subscription_id` |
| Escalar | Asaas cria ACTIVE paralelo |

## J. Tenant incorreto

| | |
|--|--|
| Detectar | Customer/subscription de A em UI de B |
| Verificar | Switcher; cookie last-tenant; `externalReference`; mismatch webhook |
| Não fazer | “Ajustar” IDs manualmente sem auditoria |
| Ação | Isolar tenant; abrir incidente P0 |
| Escalar | Imediato se cross-tenant confirmado |

## K. Cancelamento falhou

| | |
|--|--|
| Detectar | Erro `ASAAS_CANCEL_FAILED` / permissão |
| Verificar | OWNER; `provider_subscription_id`; Asaas 404 (já deletada → local cancel OK) |
| Não fazer | Apagar tenant/histórico/events |
| Ação | Retry; se 404, confirmar `canceled` local |
| Escalar | Provider inconsistente após retries |

## L. API Key Production Asaas indisponível no painel

**Código:** `ASAAS_PRODUCTION_API_KEY_BLOCKER`

| | |
|--|--|
| Detectar | Integrações → Chaves de API → botão "Gerar chave de API" cinza/desabilitado |
| Estado | Conta production aprovada; KYC GO; painel operacional; suporte Asaas acionado |
| Não fazer | Workaround; reutilizar `ASAAS_API_KEY` sandbox; alterar Vercel; ligar `BILLING_REAL_CHARGES_ENABLED`; cutover |
| Ação | Continuar sandbox. Aguardar desbloqueio oficial da geração de chave. Não colar keys no chat |
| Escalar | Somente após o Asaas habilitar o botão | |
