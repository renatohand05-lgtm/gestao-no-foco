# Sprint 33.4 hotfix — PIX≠BOLETO + cartão tokenizado (Asaas sandbox)

**Data:** 2026-08-12  
**Mobile:** **NÃO alterado**  
**Bug:** PIX criava cobrança correta no Asaas mas a UI mostrava `Método: BOLETO` + `Abrir boleto`.

## Causa raiz

1. `ensureAsaasSubscription` reusava ACTIVE sem checar `billingType`.
2. Hint usava o primeiro payment da lista (boleto antigo).
3. UI exibia `Abrir boleto` sempre que havia `bankSlipUrl`.

## Correção

| Item | Detalhe |
|------|---------|
| Alinhamento provider | Update/PUT quando billingType diverge; DIVERGENCE sem mascarar |
| `buildPaymentHint` | Rótulo = método solicitado; PIX nunca leva `bankSlipUrl` |
| `pickPaymentForBillingType` | Só payment do método pedido |
| UI | `Abrir boleto` só se `billingType === BOLETO` && URL |
| Reload | Hint do último checkout `completed` |

## Cartão (decisão A)

Tokenizar primeiro (`POST /v3/creditCard/tokenizeCreditCard`) → subscription com `creditCardToken` + `remoteIp` do cliente (forwarded headers).  
PAN/CVV não persistem (nem logs, nem Supabase, nem storage browser).

## Gates

| Gate | Resultado |
|------|-----------|
| `test:phase33-4-asaas` | 26 PASS |
| `test:phase33-3-billing` | 15 PASS |
| `test:phase33-2-multiempresa` | 16 PASS |
| `test:phase33-1-hardening` | 13 PASS |
| `test:rbac` | 92 PASS |
| lint (arquivos da sprint) | PASS |
| build web | PASS |
| `git diff --check` (paths sprint) | PASS |
| Smoke PIX/BOLETO/Cartão live | **PENDENTE** (pós-deploy Ready `902c60c` → Renato no tenant teste) |
| Production deploy (git → Vercel) | **PASS** (`https://gestao-no-foco.vercel.app`, dpl Ready) |

## Docs

- `docs/billing/ASAAS_SANDBOX.md`
- `docs/billing/PILOT_BILLING_RUNBOOK.md`

## Migration / ENVs

- Nova migration: **NÃO**
- Novas ENVs: **NENHUMA** (reusa sandbox já configurada)

## Go / No-Go

| Critério | Veredito |
|----------|----------|
| Piloto sem cobrança | GO |
| PIX/BOLETO sandbox | GO após smoke manual no tenant teste |
| Cartão sandbox | GO código; smoke cartão pendente |
| Cobrança real | **NO-GO** |
