# Runbook — Billing piloto (Sprint 33.4)

## Status

| Item | Estado |
|------|--------|
| Schema billing (33.3) | Aplicado em production |
| Trial sem cartão | GO |
| Adapter Asaas sandbox (código) | Pronto |
| Secrets Asaas no Vercel | **Pendente Renato** |
| Cobrança real | **OFF** |

## Credenciais necessárias (sandbox)

1. `BILLING_PROVIDER=asaas`
2. `ASAAS_ENV=sandbox`
3. `ASAAS_API_KEY` (sandbox)
4. `ASAAS_WEBHOOK_TOKEN`
5. `BILLING_ASAAS_CHECKOUT_ENABLED=1` (só após webhook configurado)

Webhook URL: `https://gestao-no-foco.vercel.app/api/billing/webhook`  
Header validado: `asaas-access-token`

Detalhes: `docs/billing/ASAAS_SANDBOX.md`

## Trial (já validado)

OWNER → Configurações → Assinatura → Ativar trial piloto.

## Go-live checklist (futuro — NÃO executar)

- [ ] Conta Asaas production aprovada + KYC
- [ ] API key production (nunca misturar com sandbox)
- [ ] Webhook production HTTPS + token novo
- [ ] `ASAAS_ENV=production` + `ASAAS_ALLOW_PRODUCTION=1` só com autorização
- [ ] Plano comercial com `amount_cents` definido
- [ ] Teste cobrança mínima controlada
- [ ] Cancelamento + past_due homologados
- [ ] Monitoramento logs `billing.webhook.*`
- [ ] Rollback: `BILLING_ASAAS_CHECKOUT_ENABLED=0` + `BILLING_PROVIDER=none`

## O que NÃO fazer

- Não usar key production agora
- Não cobrar cliente real
- Não reaplicar migration 33.3 sem necessidade
- Não colocar secrets no frontend
