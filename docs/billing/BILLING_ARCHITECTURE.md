# Billing / monetização — arquitetura (Sprint 33.3)

**Status:** schema + gates + UI + webhook stub. **Pagamento real NÃO implementado.**

## Auditoria (código real)

| Item | Situação |
|------|----------|
| Provedor Stripe/Asaas/MP no produto | Apenas stub de catálogo de integrações |
| Env de cobrança SaaS | Documentado em `.env.example` — **não configurado** por padrão |
| `billing_*` tables | Migration `supabase/migrations/20260823_phase33_3_billing.sql` |
| RBAC `configuracoes.faturamento` | Continua **platform-only** (super_admin) — não misturar com assinatura do tenant |
| Gestão tenant billing | Membership **OWNER** (`can_manage_billing`) / view OWNER+ADMIN |

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

**Assinatura = TENANT.** Empresa A e Empresa B nunca compartilham a mesma row.

## RBAC ≠ Entitlement

| Camada | Decide |
|--------|--------|
| Entitlement (plano) | Módulos liberados para a **empresa** |
| RBAC (membership) | O que o **usuário** pode fazer |
| Final | `entitlement ∧ rbac` (`lib/billing/entitlements.ts` → `finalAccessAllowed`) |

Pagamento **nunca** concede role admin.

## Enforcement

- `BILLING_ENFORCEMENT=0` (default): acesso `open` — **não bloqueia** tenants de teste/piloto.
- `BILLING_ENFORCEMENT=1`: aplica restrição controlada (não apaga tenant/dados).

### past_due / canceled / trial expirado

| Status | Comportamento (enforcement on) |
|--------|--------------------------------|
| `past_due` | Restrição controlada; dados preservados |
| `canceled` | Restrito; dados preservados |
| trial sem `trial_end` ou expirado | Restrito (não há trial infinito) |
| missing subscription | Restrito |

## Provedor

**NÃO CONFIGURADO** por padrão (`BILLING_PROVIDER=none`).

Decisão necessária do Renato (escolher **um**):

1. Stripe — `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (servidor)
2. Asaas — `ASAAS_API_KEY` + `ASAAS_WEBHOOK_TOKEN`
3. Mercado Pago — `MERCADOPAGO_ACCESS_TOKEN` + `MERCADOPAGO_WEBHOOK_SECRET`

Nenhuma secret com `NEXT_PUBLIC_`.

## Checkout

- Server action `requestCheckoutAction`
- Persiste `billing_checkout_attempts` com idempotency key
- Sem provedor → `provider_missing` — **não** marca `active`/`paid`
- Com provedor detectado → ainda **não cobra** até autorização explícita (`BILLING_CHECKOUT_NOT_ENABLED`)

## Webhook

- `POST /api/billing/webhook`
- Sem provedor → 503
- Secret inválido → 401
- `event_id` obrigatório; unique `(provider, event_id)` = idempotência / replay
- Sync de status para `active`/`past_due` aguarda integração do provedor escolhido

## UI

- `/{tenant}/configuracoes/assinatura` — OWNER/ADMIN veem; OWNER gerencia
- Link em Configurações

## Plano seed

- slug `pilot` — **temporário**, `amount_cents = null`, `is_pilot = true`
- Sem preço comercial hardcoded

## Arquivos

| Path | Papel |
|------|-------|
| `lib/billing/*` | Domínio |
| `app/api/billing/webhook/route.ts` | Webhook |
| `app/(app)/[tenant]/configuracoes/assinatura/page.tsx` | UI |
| `docs/billing/PILOT_BILLING_RUNBOOK.md` | Operação piloto |

**PAYMENT IMPLEMENTADO: NÃO**
