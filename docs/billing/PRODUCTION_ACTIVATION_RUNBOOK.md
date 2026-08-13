# Runbook — Ativação Asaas PRODUCTION (NÃO EXECUTAR AGORA)

**Status:** documentação apenas (Sprint 33.5).  
**Estado atual obrigatório:** `ASAAS_ENV=sandbox`.  
**Cobrança real:** NO-GO até autorização explícita.

## Pré-requisitos

- [ ] Conta Asaas production aprovada (KYC)
- [ ] Piloto sandbox GO (PIX/BOLETO/CARTÃO + webhook)
- [ ] Enforcement permanece OFF até decisão (`BILLING_ENFORCEMENT` ≠ `1`)
- [ ] Backup/checkpoint: anotar SHA do deploy + export das envs Vercel (fora do git)
- [ ] Plano comercial com `amount_cents` definido

## Envs a trocar (valores NÃO vão no repositório)

| Env | Sandbox hoje | Production futuro |
|-----|--------------|-------------------|
| `ASAAS_ENV` | `sandbox` | `production` |
| `ASAAS_API_KEY` | key sandbox | key production **nova** |
| `ASAAS_WEBHOOK_TOKEN` | token sandbox | token **novo** do webhook production |
| `ASAAS_ALLOW_PRODUCTION` | ausente | `1` (só com autorização) |
| `ASAAS_API_BASE_URL` | omitir / sandbox | omitir (default `https://api.asaas.com`) |
| `BILLING_ASAAS_CHECKOUT_ENABLED` | `1` | `0` no primeiro deploy; `1` só após smoke |
| `BILLING_REAL_CHARGES_ENABLED` | ausente | `1` só após confirmação humana |
| `BILLING_PROVIDER` | `asaas` | `asaas` |
| `BILLING_ENFORCEMENT` | off | off até decisão separada |

Nunca `NEXT_PUBLIC_*` para secrets.

## Passos futuros (ordem)

1. Checkpoint: SHA + screenshot Assinatura sandbox
2. Criar webhook production → `https://gestao-no-foco.vercel.app/api/billing/webhook` com token novo
3. Setar envs production no Vercel **sem** habilitar checkout (`BILLING_ASAAS_CHECKOUT_ENABLED=0`)
4. Redeploy
5. Smoke **sem cobrança**: login, Assinatura, banner (não deve dizer sandbox se env production), GET webhook
6. Opt-in checkout (`=1`) + microtransação controlada **só** se aprovada
7. Validar webhook `PAYMENT_RECEIVED` → status `active`
8. Monitorar logs `billing.webhook.*`

## Rollback

1. `BILLING_ASAAS_CHECKOUT_ENABLED=0` (kill switch imediato)
2. Restaurar `ASAAS_ENV=sandbox` + keys sandbox (ou remover `ASAAS_ALLOW_PRODUCTION`)
3. Redeploy
4. Confirmar que novos checkouts falham com opt-in / sandbox
5. **Não** apagar `billing_provider_events`, tenants ou histórico

## O que esta sprint NÃO faz

- Não altera `ASAAS_ENV` para production
- Não usa API key production
- Não gera cobrança real
- Não liga `BILLING_ENFORCEMENT`
