# Runbook — Billing piloto (Sprint 33.4 hotfix)

## Status

| Item | Estado |
|------|--------|
| Schema billing (33.3) | Aplicado em production |
| Trial sem cartão | GO |
| Adapter Asaas sandbox | Pronto (PIX / BOLETO / CREDIT_CARD tokenizado) |
| Secrets Asaas no Vercel | Configurados (sandbox) — confirmar pós-deploy |
| Bug PIX→UI BOLETO | **Corrigido no código** — revalidar smoke |
| Cobrança real | **OFF** |

## Credenciais (sandbox only)

1. `BILLING_PROVIDER=asaas`
2. `ASAAS_ENV=sandbox`
3. `ASAAS_API_KEY` (sandbox)
4. `ASAAS_WEBHOOK_TOKEN`
5. `BILLING_ASAAS_CHECKOUT_ENABLED=1`

Webhook: `https://gestao-no-foco.vercel.app/api/billing/webhook`
Header: `asaas-access-token`

## Smoke sandbox (tenant de teste apenas)

1. OWNER na empresa de teste → Assinatura
2. **PIX:** método na UI = PIX; sem “Abrir boleto”; reload mantém PIX
3. **BOLETO:** método = BOLETO; “Abrir boleto” só se Asaas devolver URL
4. **Cartão (opcional):** usar cartão de teste Asaas; recusa não marca `active`
5. Double-submit com mesma idempotency key → sem cobrança duplicada
6. Trocar de empresa no switcher → customer/token isolados

## Cartão — decisão

Tokenizar primeiro (`/v3/creditCard/tokenizeCreditCard`), depois subscription com `creditCardToken` + `remoteIp` do cliente.

## O que NÃO fazer

- Key / endpoint production
- Cobrar cliente real
- Alterar `apps/mobile`
- Guardar PAN/CVV
- Mascarar PIX como BOLETO

## Rollback

`BILLING_ASAAS_CHECKOUT_ENABLED=0` (mantém trial).

## Go-live real (futuro)

Ver checklist em `docs/billing/ASAAS_SANDBOX.md` — **não** executar nesta sprint.
