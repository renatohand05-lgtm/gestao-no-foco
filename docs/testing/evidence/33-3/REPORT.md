# Sprint 33.3 — Billing + assinatura (prep comercial piloto)

**Data:** 2026-08-12  
**Mobile:** **NÃO alterado**  
**Base 33.2:** `ac77a47`

## Auditoria

- Nenhum schema SaaS de billing existia antes desta sprint.
- Provedor de pagamento: **NÃO CONFIGURADO** (só stubs no catálogo de integrações).
- `configuracoes.faturamento` permanece platform-only; billing do tenant usa membership OWNER.

## Entregas

| Item | Status |
|------|--------|
| Migration `20260823_phase33_3_billing.sql` | Criada (aplicar **manual**) |
| Plans / subscriptions tenant 1:1 | PASS (código + SQL) |
| Trial piloto finito (sem cartão) | PASS |
| Entitlements ≠ RBAC | PASS |
| Checkout server-side sem fake paid | PASS (`provider_missing`) |
| Webhook stub + idempotência event_id | PASS (503 sem provedor) |
| UI `/{tenant}/configuracoes/assinatura` | PASS |
| Pagamento real | **NÃO IMPLEMENTADO** |

## Gates

| Gate | Resultado |
|------|-----------|
| `git diff --check` | PASS |
| `test:phase33-3-billing` | 15 PASS |
| `test:phase33-2-multiempresa` | 16 PASS |
| `test:phase33-1-hardening` | 13 PASS |
| `test:rbac` | 92 PASS |
| `test:phase28-tenant-isolation` | 8 PASS |
| `test:phase29-tenant-isolation` | 9 PASS |
| `lint` | PASS |
| `build` web | PASS |

## Produção

Deploy via push `main`. Smoke: `npm run test:phase33-3-prod-smoke` (tenants de teste).  
**Migration SQL ainda NÃO aplicada automaticamente** — Renato deve aplicar no SQL Editor.

## Decisão

| Critério | Veredito |
|----------|----------|
| Piloto **sem** cobrança | **GO** (`BILLING_ENFORCEMENT=0` + trial) |
| Piloto **com** cobrança | **NO-GO** até escolher provedor + secrets + sandbox + autorização |

## Docs

- `docs/billing/BILLING_ARCHITECTURE.md`
- `docs/billing/PILOT_BILLING_RUNBOOK.md`
