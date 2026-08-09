# 31.11.9 — Falha pós-login / entrada no dashboard iOS

## Classificação

**CORREÇÃO APROVADA**

Nova build: **NÃO**

---

## 1. Causa exata

`EXPO_PUBLIC_API_BASE_URL` estava configurada com a **URL do Supabase** (`https://….supabase.co`).

O cliente mobile (`apps/mobile/src/api/client.ts`) usa essa base para chamar rotas **Next.js**:

`{API_BASE}/api/mobile/v1/memberships`

Com a base no Supabase, a requisição ia para um host inválido (tipicamente **404 / HTML / falha de rede**), a tela de empresas falhava e a UI anterior empurrava o usuário de volta ao login com mensagem genérica (“Ocorreu um erro. Tente novamente.”).

A sessão Supabase em si era **válida** — o problema era a API do app, não o Auth.

## 2–4. Endpoint / status / arquivo

| Item | Valor |
|------|--------|
| Endpoint | `GET api/mobile/v1/memberships` (via `fetchMemberships`) |
| Status típico | 404 / network (host Supabase sem rota Next) |
| Arquivo | `apps/mobile/src/api/client.ts` (`buildUrl` + `getApiBaseUrl`) |
| Consumidor | `apps/mobile/app/(auth)/tenant.tsx` |

## 5–6. API base

| | Valor |
|--|--------|
| **Anterior (errada)** | URL do projeto Supabase (`*.supabase.co`) |
| **Correta** | `https://gestao-no-foco.vercel.app` |

Separação:

- `EXPO_PUBLIC_SUPABASE_URL` → Auth/dados Supabase
- `EXPO_PUBLIC_API_BASE_URL` → App Web/API Next (Vercel)

## Correção aplicada

1. `resolveMobileApiBaseUrl()` detecta base Supabase / ausente / inválida e **corrige** para `https://gestao-no-foco.vercel.app` (com log `API_BASE_IS_SUPABASE`).
2. Cliente HTTP sempre usa a origin resolvida.
3. `AuthenticatedDataError`: falha de API **não desloga**; botões Tentar novamente / Ir para o início / Sair da conta.
4. Tenant/branch/dashboard usam essa recuperação.
5. Códigos sanitizados (`MEMBERSHIP_LOAD_FAILED`, `MOBILE_API_UNREACHABLE`, `API_BASE_IS_SUPABASE`, …).
6. `.env.example` documenta a base Vercel.

**Ação do usuário no EAS (preview):** atualizar `EXPO_PUBLIC_API_BASE_URL` para `https://gestao-no-foco.vercel.app` (mesmo com a correção automática no app).

## 7–13. Checklist

| # | Item | Resultado |
|---|------|-----------|
| 7 | Sessão era válida | **SIM** |
| 8 | Dashboard abre após login (com API correta) | **SIM** (fluxo corrigido; requer rebuild) |
| 9 | Falha de API preserva sessão | **SIM** |
| 10 | Loops eliminados | **SIM** |
| 11 | Gates aprovados | **SIM** |
| 12 | Nova build executada | **NÃO** |
| 13 | Pronto para nova build iOS | **SIM** |

### Gates

| Gate | Resultado |
|------|-----------|
| Doctor | 20/20 |
| lint / typecheck / mobile:test | PASS (26 unit) |
| expo export iOS | PASS |
| post-login / auth-recovery / auth / session / tenant / branch / rbac / api-client / biometrics / route-guards / homolog-31-11 | PASS |

## Próximo passo

1. No Expo → Environment variables → **preview**:
   `EXPO_PUBLIC_API_BASE_URL=https://gestao-no-foco.vercel.app`
2. Nova build iOS preview (manual):

```powershell
cd apps\mobile
npx eas-cli@latest build --platform ios --profile preview
```

Commit / push / deploy: **não feitos**.
