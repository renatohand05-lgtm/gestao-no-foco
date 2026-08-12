# Billing / monetização — arquitetura (Sprint 33.3)

**Status:** schema aplicado em production + gates + UI + webhook stub. **Pagamento real NÃO implementado.**

## Homologação pós-migration (2026-08-12)

Migration `20260823_phase33_3_billing.sql` aplicada manualmente por Renato (SQL Editor: Success).  
Smoke: `scripts/phase33-3-post-migration-smoke.mjs` → **36 PASS · 0 FAIL**  
Evidence: `docs/testing/evidence/33-3/post-migration-smoke.json`

Confirmado em production:

- Tabelas `billing_plans`, `billing_subscriptions`, `billing_checkout_attempts`, `billing_provider_events`
- Funções `can_read_billing` / `can_manage_billing`
- RLS: OWNER gerencia; member lê; cross-tenant bloqueado; unauth bloqueado
- `billing_provider_events` inacessível a authenticated; service role OK
- Trial `provider=none` sem cobrança

## Modelo

```
tenant (empresa)
  └── billing_subscriptions (1:1)
        ├── plan_id → billing_plans
        ├── status: trial | active | past_due | canceled
        ├── provider / provider_*_id
        └── trial_* / current_period_*

billing_checkout_attempts  (idempotência checkout)
billing_provider_events    (idempotência webhook)
```

**Assinatura = TENANT.** Empresa A e B nunca compartilham a mesma row.

## RBAC ≠ Entitlement

| Camada | Decide |
|--------|--------|
| Entitlement (plano) | Módulos liberados para a **empresa** |
| RBAC (membership) | O que o **usuário** pode fazer |
| Final | `entitlement ∧ rbac` |

## Enforcement

- `BILLING_ENFORCEMENT=0` (default): não bloqueia piloto/teste
- `=1`: restrição controlada (não apaga tenant/dados)

## Provedor

**NÃO CONFIGURADO** (`BILLING_PROVIDER=none`).

### Comparativo (recomendação técnica)

| | Stripe | **Asaas (recomendado)** | Mercado Pago |
|--|--------|-------------------------|--------------|
| PIX / boleto BR | Fraco / médio | **Forte** | Forte |
| Assinatura recorrente | Forte | **Forte p/ PME BR** | Médio-forte |
| Cartão | Forte | Bom | Bom |
| Webhook | Forte | Bom | Bom |
| Operação Brasil | Mais fricção | **Nativa** | Nativa |

**Recomendação:** Asaas para o SaaS brasileiro multiempresa. Stripe se expansão internacional for prioridade imediata. Mercado Pago se já houver ecossistema MP.

Nenhuma conta criada nesta sprint. Secrets ainda **não** solicitados para produção de cobrança.

## Checkout / Webhook

- Checkout: server action; sem provedor → `provider_missing` (nunca `paid` no frontend)
- Webhook: `POST /api/billing/webhook` — 503 sem provedor; idempotente por `(provider, event_id)`

## UI

`/{tenant}/configuracoes/assinatura` — OWNER/ADMIN veem; OWNER gerencia trial

**PAYMENT IMPLEMENTADO: NÃO**
