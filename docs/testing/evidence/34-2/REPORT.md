# Sprint 34.2 — P0 isolamento / RLS / revogação de acesso

**Data:** 2026-08-13  
**Branch:** `main`  
**Tipo:** CORREÇÃO P0 — sem billing, sem Asaas, sem Vercel envs, sem mobile app  
**Migrations executadas em production:** **NÃO** (manual Renato)  
**33.11:** não iniciada  

## Decisão

| Critério | Resultado |
|---|---|
| P0-1 self-join | **PASS** (código + migration; production pending apply) |
| P0-2 inactive | **PASS** (app + RLS SELECT) |
| P0-3 Enterprise RBAC write | **PASS** (migration) |
| Onboarding legítimo | **PASS** (RPC `create_tenant_with_owner`) |
| Billing | **FROZEN SAFE** |
| Cliente pago | **NO-GO** até migration aplicada + homologação |
| Cliente beta | **GO CONTROLADO** após Renato aplicar SQL |

## Estado confirmado (antes)

| Item | Evidência |
|---|---|
| Policy INSERT permissiva | `schema.sql` + `fix-tenant-members-policies.sql`: `with check (auth.uid() = user_id)` — **nenhuma migration posterior dropava** |
| SELECT 30.2 | `tenant_members_select_self_or_admin` — self **sem** filtro de status |
| Onboarding | `createTenantWithOwner` fazia `tenants.insert` + `tenant_members.insert` no client |
| Convite | já usava `createAdminClient()` (service role) |
| `getUserTenants` / `getUserTenantSlugs` | sem filtro `status` / `deactivated_at` |
| Enterprise RBAC | `20260807_enterprise_rls.sql` FOR ALL qualquer membro |

## Correções

### P0-1
- Drop policy `"Usuário pode se vincular como owner ao criar empresa"`.
- INSERT em `tenant_members` só via `is_tenant_admin`.
- RPC `public.create_tenant_with_owner(name, slug, segment)` SECURITY DEFINER cria tenant + owner `active`.
- `lib/onboarding/create-tenant.ts` passa a chamar a RPC (valida `user.id === input.userId`).

### P0-2
- SELECT `tenant_members`: self só se `active` e `deactivated_at is null`; admin vê peers.
- Cascata: policies de negócio com `exists (tenant_members…)` deixam de ver linha inactive → **BLOCK** em dados.
- App: `isActiveMembershipRow` em `getUserTenants`, `getUserTenantSlugs`, mobile membership, CRM team select.

### P0-3
- `tenant_roles`, `tenant_rbac_role_permissions`, `tenant_user_roles`, `tenant_user_permission_overrides`:
  - SELECT: `is_active_tenant_member`
  - ALL write: `is_tenant_admin`

## Migration

**Arquivo:** `supabase/migrations/20260825_phase34_2_p0_tenant_rls_hardening.sql`  
**Production:** **NÃO EXECUTADA** por este agente.  
**Diagnóstico (read-only):** `docs/testing/evidence/34-2/DIAGNOSTIC_QUERIES.sql`

## Service role

- Continua server-only (`lib/supabase/admin.ts`, `server-only`).
- Convite/accept e equipe usam admin após `assertEquipeAdmin`.
- RPC de onboarding **não** usa service role — usa `auth.uid()` no DEFINER.
- Nenhuma secret `NEXT_PUBLIC_`.

## Gates

| Gate | Resultado |
|---|---|
| `test:phase34-2-p0-tenant-rls` | 12 PASS |
| `test:rbac` | 92 PASS |
| `test:phase33-10-cutover-prep` | 6 PASS |
| `tsc --noEmit` | PASS |
| lint | PASS (0 errors, 30 warnings) |
| build | PASS |
| `git diff --check` | PASS (warnings CRLF) |

## Backup / PITR

**VERIFICAÇÃO MANUAL NECESSÁRIA** no painel Supabase (fora do repo).

## Arquivos alterados

- `supabase/migrations/20260825_phase34_2_p0_tenant_rls_hardening.sql` (novo)
- `supabase/schema.sql` (remove INSERT permissivo do bootstrap)
- `lib/onboarding/create-tenant.ts`
- `lib/tenants.ts`
- `lib/tenants/membership-status.ts` (novo)
- `lib/auth/redirect.ts`
- `lib/mobile/membership.ts`
- `lib/crm/tenant-team-service.ts`
- `scripts/phase34-2-p0-tenant-rls-tests.mjs` (novo)
- `package.json` (script teste)
- `docs/testing/evidence/34-2/*`

## Riscos residuais

- Até a migration rodar em production, P0-1/P0-3 RLS **permanecem abertos no banco**; o app já filtra inactive e usa RPC (RPC falha se migration não aplicada → onboarding quebra até apply).
- Homologar: register → onboarding → criar 2ª empresa → inativar membro → URL direta → tentativa de escalate.

## Ação manual Renato

1. Rodar `DIAGNOSTIC_QUERIES.sql` (read-only).  
2. Snapshot/PITR confirmado.  
3. Aplicar `20260825_phase34_2_p0_tenant_rls_hardening.sql` no SQL Editor.  
4. Re-rodar diagnósticos (legacy self-join policy count = 0).  
5. Smoke: onboarding + inativar membro + member não escreve RBAC.
