# Sprint 33.1 — Hardening final pré-piloto

**Data:** 2026-08-11  
**Mobile:** **NÃO alterado** (`git diff apps/mobile` vazio)

## P1.1 RLS financeiro

Migration versionada: `supabase/migrations/20260822_phase33_1_finance_rls_write.sql`  
Guia: `docs/architecture/PHASE_33_1_FINANCE_RLS.md`

- SELECT: `can_read_finance` (membro ativo)
- INSERT/UPDATE/DELETE: `can_write_finance` (`owner` | `admin` | `manager`)
- `member` / anon / sem tenant / outro tenant: sem write
- **Não aplicada em production nesta sprint** (fluxo oficial = SQL Editor após snapshot)

## P1.2 Sidebar

`filterNavByPermissions` + `resolveTenantNavPermissions` no layout.  
Módulos principais com `requiredAnyPermissions`. Backend/RLS continuam autoridade.

## P1.3 Service role

| Onde | Resultado |
|------|-----------|
| `lib/supabase/admin.ts` | `server-only` · env `SUPABASE_SERVICE_ROLE_KEY` |
| `lib/mobile/*-compose.ts` | BFF servidor; **não** entra em `apps/mobile` |
| Vercel Production env (nomes) | `SUPABASE_SERVICE_ROLE_KEY` **presente** |
| Frontend `NEXT_PUBLIC_*SERVICE*` | **ausente** |

Não alterado runtime mobile. Compose admin permanece no servidor (após auth de rota + `tenantId`).

## P1.4 Idempotency

`lib/finance/persistent-idempotency.ts`: RPC persistente; **fail-closed** em production sem service role.  
Sem fallback em memória no path de `lib/finance/actions.ts`.

## Recovery

`docs/pilot/PRODUCTION_RECOVERY.md` — snapshot manual no painel Supabase (sem job automático no repo).

## Produção

- `GET https://gestao-no-foco.vercel.app/api/health` → `ok`, `env: production`, supabase probe ok
- Env names: `APP_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

## Gates

| Gate | Resultado |
|------|-----------|
| lint | PASS (0 errors; 29 warnings pré-existentes) |
| test:phase33-1-hardening | 13 PASS |
| test:phase33-0-finance-action-rbac | PASS |
| test:rbac | 92 PASS |
| test:phase29-tenant-isolation | 9 PASS |
| test:phase30-team-tenant-isolation | 22 PASS |
| test:phase31-finance-tenant-isolation | 5 PASS |
| test:phase30-multisector-nav | 14 PASS |
| build | PASS |
| smoke production completo (15 itens) | **não executado** — migration RLS ainda não aplicada; sem usuário de teste nesta sessão |

## GO/NO-GO

Código pronto. **Dados reais: NÃO LIBERADO** até:

1. Snapshot no Supabase  
2. Aplicar SQL 33.1 no SQL Editor  
3. Smoke humano com dados de teste (OWNER write + member negado)

## P2/P3 (não tratados)

Relatórios stub · Hub integrações mock · e-mail convite opcional · Sentry · conectores/Excel/PDF
