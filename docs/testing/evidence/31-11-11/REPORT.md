# Sprint 31.11.11 — Publicar correção RBAC mobile + build iOS

## Classificação

**PUBLICAÇÃO EM CURSO → ver seção Deploy / Build ao final**

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

Preenchidos após execução:

| Item | Valor |
|------|-------|
| Commit SHA | _(pendente)_ |
| Branch | `main` |
| Push sincronizado | _(pendente)_ |
| Deploy Vercel | _(pendente)_ |
| URL produção | `https://gestao-no-foco.vercel.app` |
| Smoke prod | _(pendente)_ |
| `/api/mobile/v1/memberships` sem token | _(pendente)_ |
| EAS project | `@gesto-no-foco/gestao-no-foco` / `51b0c195-feec-4ac1-9fe6-a001d9571bb4` |
| Build iOS ID | _(pendente)_ |
| Build URL | _(pendente)_ |

---

## Ressalvas

1. Deploy da API é obrigatório para o merge RBAC valer no iPhone (cliente + servidor).
2. Variáveis EAS preview devem incluir `EXPO_PUBLIC_API_BASE_URL=https://gestao-no-foco.vercel.app` (não URL Supabase).
3. App Store / TestFlight: **não** nesta sprint.
4. Homologação final no dispositivo físico após instalar a build preview.
