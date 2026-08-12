# Sprint 33.3 — Billing + assinatura (prep comercial piloto)

**Data:** 2026-08-12  
**Mobile:** **NÃO alterado**  
**Base 33.2:** `ac77a47`  
**Código billing:** `2b0a6da` · evidência pós-migration neste commit

## Auditoria

- Nenhum schema SaaS de billing existia antes desta sprint.
- Provedor de pagamento: **NÃO CONFIGURADO** (só stubs no catálogo de integrações).
- `configuracoes.faturamento` permanece platform-only; billing do tenant usa membership OWNER.

## Migration production (aplicada por Renato)

| Item | Status |
|------|--------|
| Arquivo | `supabase/migrations/20260823_phase33_3_billing.sql` |
| SQL Editor | Success. No rows returned. |
| Reaplicação | **NÃO** (idempotente, mas não necessária) |

### Smoke pós-migration (PRODUCTION · dados de teste)

Script: `npm run test:phase33-3-post-migration-smoke`  
Evidence: `docs/testing/evidence/33-3/post-migration-smoke.json`  
Tenants: `teste-renato-01` · `gestaonofoco2`  
Artefatos temporários (users/rows) **apagados** ao final.

| Controle | Resultado |
|----------|-----------|
| Tabelas billing_* | **PASS** |
| Seed plano `pilot` (sem preço) | **PASS** |
| Entitlements módulos core | **PASS** |
| RPC `can_read_billing` / `can_manage_billing` | **PASS** |
| OWNER cria trial próprio tenant | **PASS** |
| OWNER cross-tenant bloqueado | **PASS** |
| MEMBER insert/update bloqueados | **PASS** |
| Unauthenticated bloqueado | **PASS** |
| `billing_provider_events` negado a authenticated | **PASS** |
| Service role escreve events (server) | **PASS** |
| Checkout idempotente (23505) | **PASS** |
| Sem cobrança (`status=trial`, `provider=none`) | **PASS** |
| HTTP Assinatura / webhook / módulos | **PASS** |
| **Total** | **36 PASS · 0 FAIL** |

## Entregas

| Item | Status |
|------|--------|
| Plans / subscriptions tenant 1:1 | PASS |
| Trial piloto finito (sem cartão) | PASS |
| Entitlements ≠ RBAC | PASS |
| Checkout server-side sem fake paid | PASS |
| Webhook stub + idempotência | PASS |
| UI `/{tenant}/configuracoes/assinatura` | PASS (auth gate 307) |
| Pagamento real | **NÃO IMPLEMENTADO** |

## Gates (reexecução pós-migration)

| Gate | Resultado |
|------|-----------|
| `git diff --check` | PASS |
| `test:phase33-3-billing` | 15 PASS |
| `test:phase33-2-multiempresa` | 16 PASS |
| `test:phase33-1-hardening` | 13 PASS |
| `test:phase33-0-finance-action-rbac` | 2 PASS |
| `test:rbac` | 92 PASS |
| `test:phase28-tenant-isolation` | 8 PASS |
| `test:phase29-tenant-isolation` | 9 PASS |
| lint / build (código billing já em production) | PASS (sessão anterior 33.3; sem mudança de app neste pós-migration além do smoke script) |

## Comparativo de provedores (sem criar conta)

| Critério | Stripe | Asaas | Mercado Pago |
|----------|--------|-------|--------------|
| Assinatura recorrente | Excelente | Forte (BR) | Boa |
| PIX | Limitado / indireto | Nativo | Nativo |
| Boleto | Disponível (BR onboarding) | Nativo | Nativo |
| Cartão | Excelente | Bom | Bom |
| Webhook | Excelente | Bom | Bom |
| Operação BR (CNPJ/KYC) | Mais fricção | Focado BR | Focado BR/LATAM |
| Integração SaaS multi-tenant | Madura global | Simples p/ PME BR | Boa; mais marketplace |

**Recomendação:** **ASAAS** — melhor encaixe para SaaS brasileiro multiempresa com PIX + boleto + recorrência e operação local, sem bloquear cartão.

## Decisão

| Critério | Veredito |
|----------|----------|
| Piloto **sem** cobrança | **GO** |
| Piloto **com** cobrança | **NO-GO** (provedor ainda não configurado) |

## Docs

- `docs/billing/BILLING_ARCHITECTURE.md`
- `docs/billing/PILOT_BILLING_RUNBOOK.md`
