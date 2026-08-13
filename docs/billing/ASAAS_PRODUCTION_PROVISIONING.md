# Sprint 33.9 — Provisionamento controlado Asaas Production (pré-cutover)

**KYC production:** GO (confirmação manual de Renato).  
**Cobrança real:** NO-GO.  
**BILLING_REAL_CHARGES_ENABLED:** permanece OFF em todo o provisionamento.  
**ASAAS_ENV atual:** sandbox — não alterar nesta sprint.  
**Sandbox:** preservar keys e webhook atuais.  
**R$ 19,90:** só homologação sandbox. Não usar em production.

Nunca colar API keys, webhook tokens, PAN, CVV, SMS/Token App neste documento, em logs ou no chat.

## Separação definitiva

| Slot | Ambiente | Quando o código usa |
|------|----------|---------------------|
| `ASAAS_API_KEY` | sandbox | só se `ASAAS_ENV≠production` |
| `ASAAS_WEBHOOK_TOKEN` | sandbox | só se `ASAAS_ENV≠production` |
| `ASAAS_API_KEY_PRODUCTION` | production | só se `ASAAS_ENV=production` |
| `ASAAS_WEBHOOK_TOKEN_PRODUCTION` | production | só se `ASAAS_ENV=production` |

Slots production **não sobrescrevem** sandbox. Podem existir na Vercel com `ASAAS_ENV=sandbox` sem efeito.  
Se os valores sandbox e production forem iguais, o sistema bloqueia.

## Guards (combinação explícita)

Cobrança real exige **todos**:

1. `ASAAS_ENV=production`
2. `ASAAS_ALLOW_PRODUCTION=1`
3. `BILLING_REAL_CHARGES_ENABLED=1`
4. `BILLING_ASAAS_CHECKOUT_ENABLED=1`
5. `ASAAS_API_KEY_PRODUCTION` presente e ≠ sandbox
6. `ASAAS_WEBHOOK_TOKEN_PRODUCTION` presente e ≠ sandbox
7. host `https://api.asaas.com` (não sandbox)

Qualquer um ausente → `isRealProductionChargeAllowed() === false`.

- `ASAAS_ENV=production` sozinho → **não cobra**
- `BILLING_REAL_CHARGES_ENABLED=1` sozinho (com sandbox) → **não usa API production**

Credencial production ausente em modo production → fail-closed (não cai para a key sandbox).

## Endpoint de webhook

URL (a mesma do app; o isolamento é o **token**):  
`https://gestao-no-foco.vercel.app/api/billing/webhook`

- Método: POST (eventos) / GET (health, sem secret)
- Header: `asaas-access-token`
- Validação: `timingSafeEqual`
- Idempotência: `billing_provider_events (provider, event_id)` unique
- Tenant: `externalReference` / customer / subscription amarrados ao `tenant_id`
- Token sandbox **não** autoriza eventos quando `ASAAS_ENV=production`

Eventos a marcar no webhook production (mínimo):

- `PAYMENT_CREATED`, `PAYMENT_UPDATED`, `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`
- `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`, `PAYMENT_DELETED`, `PAYMENT_RESTORED`
- `PAYMENT_AWAITING_RISK_ANALYSIS`
- `SUBSCRIPTION_CREATED`, `SUBSCRIPTION_UPDATED`, `SUBSCRIPTION_INACTIVATED`, `SUBSCRIPTION_DELETED`

## Catálogo (production)

| Plano | amount_cents |
|-------|----------------|
| Essencial | 27990 |
| Gestão | 47990 |
| Pro | 74990 |
| Pro Plus + Consultoria | 349990 |

Não criar plano de micro-valor sem decisão explícita. Plano `pilot` bloqueado em production.

## Rollback imediato

1. `BILLING_ASAAS_CHECKOUT_ENABLED=0` (kill switch)
2. Garantir `BILLING_REAL_CHARGES_ENABLED` ausente
3. Remover `ASAAS_ALLOW_PRODUCTION` se tiver sido setado
4. `ASAAS_ENV=sandbox` (volta a usar keys sandbox; slots production ficam inertes)
5. Redeploy  
Não apagar tenants, histórico, eventos nem o plano `pilot`.

## Smoke sem cobrança (após provisionar slots — NÃO agora)

1. `ASAAS_ENV` ainda sandbox **ou** production com `BILLING_REAL_CHARGES_ENABLED` OFF e checkout `0`
2. GET `/api/billing/webhook` → HTTP 200 (não cria cobrança)
3. POST sem token / token inválido → 401
4. Login + tela Assinatura: banner sandbox se env sandbox
5. **Não** clicar em checkout PIX/boleto/cartão de plano comercial em production

Script local de contratos: `npm run test:phase33-9-provisioning`  
Smoke HTTP existente (sem evento autenticado): `npm run test:phase33-4-webhook-smoke`

## Procedimento 1 — API key Production (PRIMEIRA ação manual)

Fazer **somente** isto até nova autorização. Não criar webhook ainda. Não alterar Vercel.

1. Abrir o painel **production** (não sandbox): `https://www.asaas.com`
2. Confirmar que não está em `sandbox.asaas.com`
3. Entrar com usuário **administrador**
4. Menu do usuário → **Integrações** → aba **Chaves de API**
5. **Gerar nova chave de API**
6. Nome sugerido: `gestao-no-foco-production` (até 100 caracteres)
7. Expiração: omitir por enquanto
8. Confirmar com Token App ou SMS (não copiar isso no chat)
9. Copiar a chave **uma vez** para o gerenciador de senhas
10. Conferir prefixo de production (a documentação Asaas distingue sandbox vs production)
11. **Não** colar no chat, git, Vercel, Slack ou e-mail
12. **Não** substituir `ASAAS_API_KEY` sandbox

A chave sozinha **não** gera cobrança neste app enquanto `ASAAS_ENV=sandbox` e `BILLING_REAL_CHARGES_ENABLED` ≠ `1`.

## Procedimento 2 — Webhook Production (NÃO executar agora)

Só depois da key estar guardada e de autorização para o passo 2.

1. Painel production `https://www.asaas.com` (não sandbox)
2. Menu do usuário → **Integrações** → **Webhooks** → **Criar Webhook**
3. Nome: `gestao-no-foco-production`
4. URL: `https://gestao-no-foco.vercel.app/api/billing/webhook`
5. E-mail de falha: o e-mail operacional da conta
6. API version: v3
7. Auth token: **Gerar token** (32–255 chars; **não** usar a API key)
8. Enabled: pode ficar ativo; com `ASAAS_ENV=sandbox` o app responde **401** ao token production (fail-closed)
9. Send type: sequencial
10. Eventos: lista mínima acima
11. Guardar o token no gerenciador de senhas (exibido na criação)
12. Não colar no chat. Não colocar na Vercel neste passo se a ordem ainda for “só Asaas”

## Procedimento 3 — Vercel (NÃO executar agora)

Só depois dos procedimentos 1 e 2. **Não substituir** secrets sandbox.

No projeto Vercel → Settings → Environment Variables → Production:

| Nome | Valor | Ação |
|------|-------|------|
| `ASAAS_API_KEY_PRODUCTION` | key production | **criar slot novo** |
| `ASAAS_WEBHOOK_TOKEN_PRODUCTION` | token do webhook production | **criar slot novo** |
| `ASAAS_API_KEY` | (sandbox) | **não alterar** |
| `ASAAS_WEBHOOK_TOKEN` | (sandbox) | **não alterar** |
| `ASAAS_ENV` | `sandbox` | **não alterar neste passo** |
| `BILLING_REAL_CHARGES_ENABLED` | ausente | **não criar / não ligar** |
| `ASAAS_ALLOW_PRODUCTION` | ausente | **não criar neste passo** |

Nunca `NEXT_PUBLIC_*`. Redeploy só quando Renato autorizar o passo Vercel.

## Microtransação futura (NÃO executar)

Menor valor comercial: Essencial R$ 279,90. Sem plano micro.  
Exige autorização explícita **depois** do provisionamento e do smoke sem cobrança.

## Esta sprint NÃO faz

- Não altera Asaas
- Não altera Vercel
- Não liga `BILLING_REAL_CHARGES_ENABLED`
- Não muda `ASAAS_ENV`
- Não executa microtransação
- Não remove sandbox
