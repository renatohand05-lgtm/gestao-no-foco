# Billing / monetização — arquitetura (Sprint 33.2)

**Status:** preparação documental. **Pagamento real NÃO implementado nesta sprint.**

## O que já existe no código

| Item | Situação |
|------|----------|
| `plans` / `subscriptions` / checkout / webhooks de cobrança | **Não existem** como domínio SaaS |
| Stripe / gateway no produto | Apenas stub de catálogo de integrações (não cobrança do SaaS) |
| RBAC (`owner`/`admin`/`manager`/`member` + permissions) | **Existe** e é a fonte de verdade de *o que o usuário pode fazer* |
| Tenant + `tenant_members` | **Existe** — unidade de cobrança futura = **tenant (empresa)** |
| Feature flags / intelligence entitlements ad-hoc | Existem em módulos específicos; **não** substituem plano comercial |

## Modelo mínimo alvo (sem provedor fixo)

```
tenant
  └── subscription
        ├── plan_id
        ├── status: trial | active | past_due | canceled
        ├── current_period_end
        └── entitlements[]  (ex.: module.finance, seats.max)
```

### Separação obrigatória

| Conceito | Decide | Exemplo |
|----------|--------|---------|
| **Entitlement (plano)** | O que a **empresa** contratou | Plano habilita módulo Financeiro |
| **RBAC (membership)** | O que **este usuário** pode fazer na empresa | Só OWNER/ADMIN escreve financeiro |

Nunca misturar: um plano sem Financeiro não libera o módulo; com Financeiro, RBAC ainda bloqueia `member` na escrita (RLS 33.1).

## O que falta (Sprint 33.3+)

1. Tabelas `billing_plans`, `billing_subscriptions` (ou nomes equivalentes) com RLS por `tenant_id`
2. Server-only sync de status (webhook do provedor → DB)
3. Gate de entitlement no servidor (não só no frontend)
4. Trial controlado para piloto (status `trial` sem cartão, se desejado)
5. UI de plano/fatura (após segurança estável)

## Onde integrar pagamento

- **Webhook HTTP** em rota server-only (`/api/billing/webhook` — a criar)
- Atualiza `subscription.status` com **idempotência** (`event_id` único do provedor)
- Frontend **nunca** decide sozinho se a assinatura está ativa
- Service role / secret do webhook **somente** no servidor (Vercel env)

## Segurança

- Não confiar em query string / localStorage para “paid”
- Webhook: verificar assinatura do provedor; rejeitar replay
- Idempotência: processar o mesmo `event_id` no máximo uma vez
- Logs: sem PAN/CVV/token completo; correlation/request id ok
- Piloto: pode operar em `trial`/`active` manual sem gateway — **sem bypass de RLS/RBAC**

## Piloto e monetização

- Liberar cliente piloto **não** exige cobrança nesta sprint
- Flag de piloto (`PILOT_TENANT_SLUGS` / settings) é **observabilidade/ops**, não entitlement premium escondido

## Relação com os próximos dias

| Dia | Foco |
|-----|------|
| 33.2 (hoje) | Multiempresa + docs billing |
| 33.3 | Schema mínimo + webhook stub + gate entitlement sem provedor obrigatório |
| 33.4 | Observabilidade + recovery + production gates |

**PAYMENT IMPLEMENTADO: NÃO**
