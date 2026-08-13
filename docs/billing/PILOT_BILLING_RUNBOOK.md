# Runbook — Billing piloto (Sprint 33.5)

## Status

| Item | Estado |
|------|--------|
| Asaas | **SANDBOX** |
| PIX / BOLETO / CARTÃO | Homologados (33.4) |
| Enforcement | **OFF** (`BILLING_ENFORCEMENT` ≠ 1) |
| Cobrança real | **NO-GO** |
| Kill switch | `BILLING_ASAAS_CHECKOUT_ENABLED=0` |

## Kill switch / rollback

Incidente → setar no Vercel `BILLING_ASAAS_CHECKOUT_ENABLED=0` → redeploy.
Efeito: bloqueia **novos** checkouts; histórico e webhook continuam; portal permanece.

Detalhes suporte: `docs/billing/SUPPORT_RUNBOOK.md`
Ativação real (não executar): `docs/billing/PRODUCTION_ACTIVATION_RUNBOOK.md`

## Checklist primeiro tenant piloto (sem cobrança real)

- [ ] Tenant de teste correto (não cliente pagante)
- [ ] OWNER correto
- [ ] Plano / trial corretos
- [ ] PIX+BOLETO+CARTÃO sandbox ok
- [ ] Webhook auth ok
- [ ] RBAC OWNER vs member
- [ ] Multiempresa isolada
- [ ] Enforcement OFF
- [ ] Produção financeira OFF (`ASAAS_ENV=sandbox`)
- [ ] Suporte com runbook
- [ ] Rollback/kill switch conhecido

## Smoke pós-deploy (tenant teste)

1. Login + troca de empresa
2. Assinatura: banner SANDBOX
3. Última cobrança: método/valor/vencimento/status (não “—”)
4. Datas: cobrança atual vs próxima renovação
5. Opcional: reenviar webhook no Asaas Sandbox

## Próxima decisão

Cobrança real e enforcement exigem autorização explícita + runbook de ativação.
