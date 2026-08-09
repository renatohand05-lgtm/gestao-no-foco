# 31.11.7 — Recuperação de loop biométrico e retorno seguro ao login

## Classificação

**CORREÇÃO APROVADA**

Nova build: **NÃO**

---

## 1. Causa exata do loop

1. Com Face ID ativo, o gate em `app/_layout.tsx` chamava `unlockApp()` e, em cancelamento/falha, fazia apenas `router.replace("/(auth)/login")` **sem limpar** SecureStore nem o estado Zustand (`authenticated` / `offline_limited`).
2. `app/index.tsx` redireciona pelo estado real → `/offline` ou `/(app)`, reabrindo o fluxo e pedindo Face ID de novo.
3. A tela `/offline` só oferecia “Tentar reconectar” (sem saída para login).
4. Em `tenant.tsx`, qualquer erro de fetch era rotulado como `network_unavailable` (“Sem conexão…”), misturando falha de sessão/API com rede.

No iOS, `gof.biometric_enabled` + tokens em SecureStore/Keychain podem sobreviver a reinstalação com o mesmo Bundle ID — reforçando o loop sem rota de escape.

## 2. Chaves locais afetadas

Chaves reais usadas (não inventadas):

| Chave | Uso |
|-------|-----|
| `gof.access_token` | access token |
| `gof.refresh_token` | refresh token |
| `gof.user_id` / `gof.email` / `gof.display_name` / `gof.expires_at` | metadados de sessão |
| `gof.biometric_enabled` | flag Face ID |
| `gof.last_tenant_id` / `gof.last_branch_id` / `gof.last_validated_at` | contexto offline |
| `gof.storage_version` | versão storage |
| `gof.supabase.auth` | persistência Auth Supabase |

`resetLocalMobileAuth()` / `wipeLocalAuthArtifacts()` apagam **todas** as acima via `clearSecureSession()` + `deleteItemAsync(gof.supabase.auth)`.

## 3. Recuperação criada

- `src/auth/reset-local-auth.ts` → `resetLocalMobileAuth()` (idempotente, single-flight)
- `session-store.returnToLogin()` / `logout()` reutilizam o reset
- Cancelamento Face ID → reset + login com mensagem biométrica (não rede)
- Refresh inválido online → `local_credential_invalid` + signed-out (`revoked`/`unauthenticated`)
- `src/auth/recovery-policy.ts` separa rede / sessão / biometria
- Uma tentativa automática de Face ID por cold start (`boot-attempts.ts`)
- Refresh cancelável (`cancelPendingRefresh`) + boot single-flight

## 4–11. Checklist

| # | Item | Resultado |
|---|------|-----------|
| 4 | Botão “Voltar para o login” | **SIM** (`/offline`, tenant error, bootstrap error) |
| 5 | Reset idempotente | **SIM** |
| 6 | Erro de rede separado de sessão | **SIM** |
| 7 | Face ID preservado (opt-in + unlock com sessão válida) | **SIM** |
| 8 | Login por senha preservado | **SIM** |
| 9 | Gates aprovados | **SIM** |
| 10 | Nova build executada | **NÃO** |
| 11 | Pronto para nova build iOS | **SIM** |

### Gates

| Gate | Resultado |
|------|-----------|
| `mobile:doctor` | 20/20 |
| `mobile:lint` | PASS |
| `mobile:typecheck` | PASS |
| `mobile:test` | 8 PASS · 0 FAIL |
| `test:phase31-mobile-auth-recovery` | 28 PASS · 0 FAIL |
| biometrics / logout / offline / auth / session / refresh / route-guards / secure-storage | PASS |

## Instalação atual (usuário preso)

Na build **já instalada** (sem esta correção), use uma destas saídas temporárias:

1. Aguardar nova build com este fix; ou
2. Apagar dados do Keychain do app / resetar o iPhone do perfil de desenvolvedor e reinstalar após a nova build.

Após instalar a build com 31.11.7: Face ID cancelado ou “Voltar para o login” limpa o Keychain do app e abre o login por senha.

Commit / push / deploy / `eas build`: **não executados**.
