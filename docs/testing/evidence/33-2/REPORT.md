# Sprint 33.2 — Portal multiempresa + onboarding + prep billing

**Data:** 2026-08-12  
**Mobile:** **NÃO alterado**  
**Base 33.1:** `069a341`

## Modelo multiempresa (real)

```
user → tenant_members → tenants (URL /{slug})
```

Sem arquitetura paralela. Filiais operacionais de produto **não** existem no Portal.
Detalhe: `docs/architecture/PHASE_33_2_MULTI_TENANT.md`

## Entregas

| Item | Status |
|------|--------|
| Seletor de empresa (memberships) | Harden: cookie last-tenant, clear cache, refresh |
| Empresa adicional | `/empresas/nova` |
| Cache dashboard tenant-scoped | `gnf:dashboard-filters:{slug}` |
| Cold start autorizado | cookie `gof_last_tenant_slug` + middleware |
| Logs deny tenant | `tenant_access_denied` / `tenant_context_denied` + `x-request-id` |
| Billing architecture | `docs/billing/BILLING_ARCHITECTURE.md` (sem pagamento) |
| Onboarding piloto | `docs/pilot/WEB_PILOT_01_ONBOARDING.md` |
| Pilot flag ops | `lib/pilot/pilot-tenant.ts` + `PILOT_TENANT_SLUGS` (sem bypass) |
| Recovery | procedimento válido; restore **não** re-testado E2E |

## Gates

| Gate | Resultado |
|------|-----------|
| `git diff --check` | PASS |
| `test:phase33-2-multiempresa` | 16 PASS |
| `test:phase33-1-hardening` | 13 PASS |
| `test:phase33-0-finance-action-rbac` | 2 PASS |
| `test:rbac` | 92 PASS |
| `test:phase28-tenant-isolation` | 8 PASS |
| `test:phase29-tenant-isolation` | 9 PASS |
| `test:phase30-onboarding` | 16 PASS |
| `lint` | PASS (`docs/testing/evidence/33-2/lint.log`) |
| `build` web | PASS (`docs/testing/evidence/33-2/build.log`) — rota `/empresas/nova` emitida |

## Produção

Deploy: push `main` `4bbe4d5` → Vercel (`https://gestao-no-foco.vercel.app`).  
Smoke HTTP: `npm run test:phase33-2-prod-smoke` → **20 PASS · 0 FAIL**  
Evidence: `docs/testing/evidence/33-2/prod-smoke.json`  
Tenants: `teste-renato-01`, `gestaonofoco2` (somente auth gates; sem dados de cliente).  
RLS financeiro: regressão coberta pelos contratos 33.1; smoke pós-migration 33.1 permanece a evidência de write deny (20/20).

## Plano 5 dias (avaliação real)

| Dia | Foco | Viabilidade |
|-----|------|-------------|
| 1 (33.2) | Multiempresa + onboarding | Fechado nesta sprint |
| 2 (33.3) | Billing mínimo (schema + webhook stub + entitlement gate) | Viável se escopo apertado |
| 3 (33.4) | Observabilidade + recovery drill documentado | Viável |
| 4 | Homologação piloto dados controlados | Viável com OWNER |
| 5 | Liberação 1º cliente + monitoramento | Viável **sem** cobrança real |

**PRAZO 5 DIAS:** **AMARELO** — piloto web GO sem pagamento; monetização só parcial até 33.3; restore E2E ainda não exercitado; multiempresa A↔B com conta real deve ser validado manualmente no login do piloto.

## P0 / P1

- P0: 0
- P1: 0 novos bloqueantes. Pendência consciente: pagamento não implementado (esperado).

## Próxima sprint

**33.3** — billing/payment mínimo sem quebrar RBAC/RLS.
