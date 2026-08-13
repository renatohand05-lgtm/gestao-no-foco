# Checklist de cutover Asaas Production — NÃO EXECUTAR AGORA

**Pré-condição:** `ASAAS_PRODUCTION_API_KEY_BLOCKER` resolvido (botão de gerar chave habilitado).  
**Agora:** `ASAAS_ENV=sandbox`, `BILLING_REAL_CHARGES_ENABLED` OFF.

R$ 19,90 não entra em production. Catálogo: 27990 / 47990 / 74990 / 349990.

## Sequência futura

1. Asaas liberar geração de API key production.
2. Renato gerar API key production no painel (`www.asaas.com`).
3. Guardar no gerenciador de senhas. Não colar no chat.
4. Criar webhook production distinto (URL `https://gestao-no-foco.vercel.app/api/billing/webhook`).
5. Gerar token production distinto (não reutilizar sandbox; não usar a API key).
6. Vercel Production: **criar** `ASAAS_API_KEY_PRODUCTION` e `ASAAS_WEBHOOK_TOKEN_PRODUCTION` (não substituir slots sandbox).
7. Manter `ASAAS_ENV=sandbox` e `BILLING_REAL_CHARGES_ENABLED` ausente/OFF.
8. Redeploy.
9. Smoke **sem cobrança**: GET webhook; login; Assinatura; confirmar guards.
10. Validar logs (`billing.checkout_*`, `billing.webhook_*`) sem secrets.
11. Só depois: `ASAAS_ENV=production` com real charges **ainda OFF** + `ASAAS_ALLOW_PRODUCTION` conforme runbook.
12. Redeploy.
13. Smoke novamente **sem cobrança** (checkout deve falhar com REAL_CHARGES_BLOCKED / kill switch).
14. Somente com autorização explícita: `BILLING_REAL_CHARGES_ENABLED=1` e checkout=1.
15. Microtransação controlada (Essencial 27990, tenant teste, PIX).
16. Confirmar webhook → `active`.
17. Confirmar UI.
18. Decidir GO ou rollback.

## Smoke sem cobrança (passo 9/13)

- Nenhuma payment criada no Asaas production
- GET `/api/billing/webhook` 200
- POST sem token / token sandbox em production → 401
- Checkout bloqueado se real charges OFF
- `isRealProductionChargeAllowed() === false` até o passo 14

## Rollback (incidente pós-cutover)

1. `BILLING_ASAAS_CHECKOUT_ENABLED=0` — novos checkouts param; webhook e leitura seguem
2. Remover `BILLING_REAL_CHARGES_ENABLED`
3. `ASAAS_ENV=sandbox` só se seguro (slots sandbox intactos; production slots ficam inertes)
4. Preservar webhook production se houver eventos pendentes
5. Preservar histórico / `billing_provider_events`
6. Registrar incidente (`requestId` / `tenantId`)
7. Validar tenant
8. Não apagar provider events

## Kill switch

`BILLING_ASAAS_CHECKOUT_ENABLED=0`  
Não destrói histórico, não apaga cobranças, não impede leitura, não deve quebrar processamento de webhook legado.
