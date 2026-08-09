# Sprint 31.11.11 — Publicar correção RBAC mobile + build iOS

## Classificação

**PUBLICAÇÃO CONCLUÍDA**

Escopo: consolidar Sprints 31.11.7–31.11.10, gates, commit, push, deploy Vercel, smoke prod, build iOS preview.

---

## Causa consolidada (31.11.7–31.11.10)

| Sprint | Problema | Correção |
|--------|----------|----------|
| 31.11.7 | Loop biométrico (Face ID cancel → SecureStore intacto) | `resetLocalMobileAuth`, recovery UI, 1 tentativa/boot |
| 31.11.8 | Crash pós-boot (sessão >2048 no SecureStore) | Auth Supabase → AsyncStorage; `safeSecure*`; RootErrorBoundary |
| 31.11.9 | Pós-login volta ao login | `EXPO_PUBLIC_API_BASE_URL` apontava Supabase; `resolveMobileApiBaseUrl` → Vercel |
| 31.11.10 | Módulos Access Denied (label MECANICO) | `mergeMobileEffectivePermissions` + aliases + tabs filtradas |

**MECANICO** = perfil adaptativo de UI, não role de banco.

---

## Arquivos principais

- `lib/mobile/effective-permissions.ts` / `lib/mobile/permissions.ts`
- `packages/rbac-contracts/src/index.ts`
- `apps/mobile/app/(app)/_layout.tsx`, `index.tsx`
- `apps/mobile/src/env/api-base.ts`, `src/api/client.ts`
- `apps/mobile/src/auth/*` (recovery, reset, secure-session, biometrics)
- `apps/mobile/src/bootstrap/RootErrorBoundary.tsx`
- `apps/mobile/src/supabase/client.ts` (AsyncStorage)
- `apps/mobile/app.config.ts`, `eas.json`, `.easignore`
- Evidências `docs/testing/evidence/31-11-*`
- Testes `scripts/phase31-11-10-rbac-parity-tests.mjs`, recovery/boot/post-login

**Excluído do commit:** `app.json` vazio na raiz (acidental).

---

## Gates (pré-commit)

| Gate | Resultado |
|------|-----------|
| `mobile:doctor` | **20/20** |
| `mobile:lint` | **0 erros** |
| `mobile:typecheck` | **PASS** |
| `mobile:test` | **26 PASS · 0 FAIL** |
| Suites auth/session/biometrics/recovery/boot/post-login | **PASS** |
| tenant/branch/rbac/route-guards | **PASS** |
| dashboard/intelligence/finance/CRM/stock/operations | **PASS** |
| `phase31-11-10-rbac-parity` | **17 PASS · 0 FAIL** |
| `homolog-31-11` / `homolog-31-11-1` | **PASS** |
| `npx expo export --platform ios --clear` | **PASS** |

---

## Paridade RBAC Web/Mobile

**SIM** — mesmo merge de permissões efetivas (analytics/finance/CRM/supply + legado oficina + aliases executivos). Sem bypass; guards servidor preservados (`FORBIDDEN_*`).

---

## Commit / Push / Deploy / Build

| Item | Valor |
|------|-------|
| Commit SHA | `530ac740b725c81e002de0df9420b7f715ad3e95` (`530ac74`) |
| Branch | `main` |
| Push sincronizado | **SIM** (`HEAD` = `origin/main`) |
| Deploy Vercel | **Ready** — `dpl_Du8VrWk8qsChzU8aJfyvsjWpk48x` |
| Deployment URL | https://gestao-no-foco-qafs4f11a-renato16.vercel.app |
| Commit no deploy | `530ac74` (Branch: main) |
| Alias produção | https://gestao-no-foco.vercel.app |
| Smoke prod | **PASS** (`/` 200, `/login` 200, `/api/health` ok, `/api/status` ok) |
| `/api/mobile/v1/memberships` sem token | **401** `UNAUTHORIZED` |
| EAS whoami | contas `rfranco300` / `gesto-no-foco` |
| EAS project | `@gesto-no-foco/gestao-no-foco` |
| projectId | `51b0c195-feec-4ac1-9fe6-a001d9571bb4` |
| bundleIdentifier | `com.gestaonofoco.app` |
| Preview env | carregou `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_SUPABASE_URL`, anon key (valores não registrados) |
| Credenciais iOS | reutilizadas (Distribution Certificate + Provisioning Profile existentes) |
| Build iOS ID | `1d2f13fb-d4e4-4086-9a7f-97c45e18c94c` |
| Build URL | https://expo.dev/accounts/gesto-no-foco/projects/gestao-no-foco/builds/1d2f13fb-d4e4-4086-9a7f-97c45e18c94c |
| Build status | **finished** |
| App Store / TestFlight | **NÃO** submetido |

---

## Ressalvas

1. Arquivo local não versionado: `app.json` vazio na raiz (não commitado).
2. Archive EAS ~345 MB — considerar reforçar `.easignore` em sprint futura (não bloqueou).
3. Homologação física no iPhone: instalar a build preview e validar RBAC em `teste-renato-01`.
4. Confirmar no dispositivo que o perfil deixa de ser só MECANICO se membership for owner/admin.
