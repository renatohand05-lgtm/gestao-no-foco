# Sprint 34.2 — P0 isolamento / RLS / revogação de acesso

**Data fechamento:** 2026-08-13
**Branch:** `main`
**Tipo:** CORREÇÃO P0 — sem billing, sem Asaas, sem Vercel envs, sem mobile app
**Migrations em production:** **SIM** — Renato aplicou `20260825_phase34_2_p0_tenant_rls_hardening.sql`
**33.11 / 34.3:** não iniciadas

## Status final

**SPRINT 34.2: HOMOLOGADA — GO**

| Critério | Status |
|---|---|
| P0-1 SELF-JOIN | **PASS** |
| P0-2 INACTIVE ACCESS | **PASS** |
| P0-3 ENTERPRISE RBAC | **PASS** |
| Tenant isolation | **PASS** |
| Cross-tenant | **PASS** |
| RBAC (Enterprise write) | **PASS** |
| RLS production | **PASS** |
| Onboarding (RPC path) | **PASS** (código + funções A1) |
| Multiempresa | **PASS** (inactive em um tenant; ativo em outro) |
| Billing | **FROZEN SAFE** |
| Backup diário | **PASS** |
| PITR | **NÃO HABILITADO** (não bloqueante) |

## Homologação production (evidência Renato)

| Item | Resultado | Evidência |
|---|---|---|
| P0-1 | PASS | `legacy_self_join_policy = 0` |
| P0-2 | PASS | Membership inactive em `teste-renato-01`: usuário não visualiza nem acessa esse tenant; permanece com acesso ao tenant ativo `Primewhash` |
| P0-3 | PASS | Smoke SQL sob contexto member: alteração `tenant_user_roles` bloqueada; Success; No rows returned; **ROLLBACK** executado |
| Seção A (A1–A5) | PASS | `POST_MIGRATION_SMOKE.sql` |
| RLS PRODUCTION | PASS | Policies/funções 34.2 ativas |
| Backup diário | PASS | Confirmado manualmente no painel Supabase |
| PITR | NÃO HABILITADO | Add-on disponível; não bloqueante para 34.2 |

**34.2 HOMOLOGADA:** **SIM**

## Decisão de prontidão (pós-34.2)

| Audiência | Status |
|---|---|
| Piloto interno | **GO** |
| Cliente beta | **GO CONTROLADO** (P0 isolamento fechados; P1 jornada ainda abertos) |
| Cliente pago | **NO-GO** (P1: convite e-mail, recover senha, deletes member, storage CRM, billing key) |
| Escala | **NO-GO** |

## Correções entregues (resumo)

### P0-1
- Drop INSERT permissivo em `tenant_members`.
- RPC `create_tenant_with_owner` SECURITY DEFINER.
- App: `lib/onboarding/create-tenant.ts` via RPC.

### P0-2
- SELECT self só se active / sem `deactivated_at`.
- App: `isActiveMembershipRow` em `getUserTenants` / `getUserTenantSlugs`.

### P0-3
- Enterprise RBAC: member SELECT; owner/admin write (`is_tenant_admin`).

## Migration

**Arquivo:** `supabase/migrations/20260825_phase34_2_p0_tenant_rls_hardening.sql`
**Production:** aplicada manualmente.
**Diagnóstico / smoke:** `DIAGNOSTIC_QUERIES.sql`, `POST_MIGRATION_SMOKE.sql`

## Gates (fechamento)

| Gate | Resultado |
|---|---|
| `test:phase34-2-p0-tenant-rls` | 12 PASS |
| `test:rbac` | 92 PASS |
| `test:phase33-10-cutover-prep` | 6 PASS |
| lint | PASS (0 errors, 30 warnings) |
| typecheck | PASS |
| build | PASS |
| `git diff --check` | PASS |

## Blockers restantes (não impedem fechar 34.2)

1. P1 jornada: recuperar senha web; convite sem e-mail (`emailSent: false`).
2. P1 RBAC mutações core (member delete cliente/venda).
3. P1 storage CRM sem policy `storage.objects`.
4. `ASAAS_PRODUCTION_API_KEY_BLOCKER` — cobrança real OFF (intencional).
5. PITR opcional.

## Próxima sprint

**34.3** — P1 RBAC nas mutações + tax `requireTenant` + storage CRM.

Não iniciar automaticamente — liberada após este fechamento documentado.
