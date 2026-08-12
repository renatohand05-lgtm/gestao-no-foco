# Sprint 33.1 — Hardening final pré-piloto + smoke pós-migration

**Data (código):** 2026-08-11 · commit `58d8cec`  
**Data (smoke pós-SQL):** 2026-08-12  
**Mobile:** **NÃO alterado**

## Migration production

Arquivo aplicado manualmente no SQL Editor:  
`supabase/migrations/20260822_phase33_1_finance_rls_write.sql`  
Execução reportada sem erro aparente pelo operador.

## Smoke pós-migration (PRODUCTION)

Script: `scripts/phase33-1-post-migration-smoke.mjs`  
Evidence: `docs/testing/evidence/33-1/post-migration-smoke.json`  
Tenants de teste: `teste-renato-01` (A) · `gestaonofoco2` (B)  
Artefatos temporários (users/rows) criados e **apagados** ao final.

| Controle | Resultado |
|----------|-----------|
| Funções `can_read_finance` / `can_write_finance` ativas | **PASS** (owner write=true, member write=false) |
| OWNER INSERT/UPDATE/DELETE | **PASS** |
| MEMBER INSERT bloqueado (RLS) | **PASS** |
| MEMBER UPDATE bloqueado (0 rows) | **PASS** |
| MEMBER DELETE bloqueado (0 rows) | **PASS** |
| Cross-tenant read/write | **PASS** |
| Unauthenticated write | **PASS** |
| `/api/health` production | **PASS** |
| HTTP dashboard/financeiro/crm/ordens/estoque | **PASS** (307 auth gate) |

Resultado smoke: **20 PASS · 0 FAIL**

## Gates (sessão pós-migration)

| Gate | Resultado |
|------|-----------|
| test:phase33-1-hardening | 13 PASS |
| test:rbac | 92 PASS |
| test:phase29-tenant-isolation | 9 PASS |
| prod health | ok / production |

## P1.1–P1.4 (código já em main)

Ver seção anterior da sprint + migration aplicada.

## GO/NO-GO

| Item | Status |
|------|--------|
| P0 | 0 |
| P1 migration pendente | **resolvido** (aplicada + smoke) |
| CLIENTE PILOTO | **GO** |
| DADOS REAIS | **LIBERADO** |

## P2/P3 (não bloqueiam)

Relatórios stub · Hub integrações mock · e-mail convite opcional · Sentry · conectores/Excel/PDF
