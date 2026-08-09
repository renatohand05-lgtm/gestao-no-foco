# 31.11.8 — Crash iOS após boot / inicialização

## Classificação

**CORREÇÃO APROVADA**

Nova build: **NÃO**

---

## 1. Causa exata do crash

Combinação de falhas de runtime no cold start (especialmente com Keychain residual do mesmo Bundle ID):

1. **Supabase Auth em `expo-secure-store`** (`apps/mobile/src/supabase/client.ts`, adapter antigo)
   A sessão JSON do Supabase frequentemente **ultrapassa ~2048 bytes**. No iOS, `SecureStore.setItemAsync` lança erro nativo. Com `autoRefreshToken: true`, a persistência ocorre em background durante o boot/refresh → **rejection não tratada → processo morto** (app “abre, carrega e fecha”).

2. **Promises sem `catch` no gate biométrico** (`apps/mobile/app/_layout.tsx`)
   `loadBiometricPref` / `unlockApp` / `returnToLogin` / `router.replace` em `void (async () => …)()` sem tratamento. Qualquer falha de SecureStore/LocalAuthentication virava unhandled rejection.

3. **SecureStore sem wrapper seguro** (`secure-session.ts` / `storage/secure.ts`)
   `getItem`/`setItem` propagavam erros nativos (keychain / tamanho).

Fator agravante iOS: dados do Keychain (`gof.*` e sessão Auth) **sobrevivem à reinstalação** com o mesmo Bundle ID, então o crash aparecia mesmo “limpo”.

## 2. Arquivo e linha (principais)

| Área | Arquivo |
|------|---------|
| Adapter SecureStore → crash de tamanho | `src/supabase/client.ts` (storage antigo) |
| Gate biométrico sem catch | `app/_layout.tsx` (~efeito Face ID) |
| SecureStore direto | `src/auth/secure-session.ts` |

## 3. Correção aplicada

1. Sessão Auth Supabase → **AsyncStorage** com catches (tokens curtos da app continuam no SecureStore via `safeSecure*`).
2. `safeSecureGet` / `safeSecureSet` / `safeSecureDelete` — nunca derrubam o app.
3. `RootErrorBoundary` — tela “O aplicativo encontrou um erro” + Tentar novamente + Voltar para o login + código sanitizado.
4. Boot / Face ID / Linking / Theme: catches; Face ID só após sessão validada; flag biométrica setada **antes** do await; navegação só com router pronto.
5. Env: `safeParse`, URLs normalizadas (remove `/rest/v1`), empty string → undefined.
6. `wipeLocalAuthArtifacts` tolera falha parcial.

## 4–11. Checklist

| # | Item | Resultado |
|---|------|-----------|
| 4 | ErrorBoundary criado | **SIM** |
| 5 | Boot determinístico | **SIM** |
| 6 | Face ID preservado | **SIM** |
| 7 | Login por senha preservado | **SIM** |
| 8 | Env validado | **SIM** |
| 9 | Testes aprovados | **SIM** |
| 10 | Nova build executada | **NÃO** |
| 11 | Pronto para nova build iOS | **SIM** |

### Gates

| Gate | Resultado |
|------|-----------|
| `mobile:doctor` | 20/20 |
| `mobile:lint` | PASS |
| `mobile:typecheck` | PASS |
| `mobile:test` | 16 PASS · 0 FAIL |
| `expo export --platform ios --clear` | PASS |
| boot-safety / auth-recovery / auth / biometrics / session / offline / route-guards / secure-storage / homolog-31-11 | PASS |

## Próximo passo (usuário)

Gerar **manualmente** nova build preview (não executada nesta sprint):

```powershell
cd apps\mobile
npx eas-cli@latest build --platform ios --profile preview
```

Após instalar: se ainda houver Keychain antigo problemático, use “Voltar para o login” / ErrorBoundary uma vez para limpar artefatos locais.

Commit / push / deploy: **não feitos**.
