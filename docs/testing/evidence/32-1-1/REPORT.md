# Sprint 32.1.1 — Hotfix TestFlight Build 116 production com regressão

**Data:** 2026-08-09  
**Branch:** `main`  
**Commit fix:** `954a677`  
**Classificação:** **CORREÇÃO IMPLEMENTADA — AGUARDANDO HOMOLOGAÇÃO FÍSICA**

Não declarar resolvido apenas porque a Build 117 compilou.

---

## Checklist (respostas obrigatórias)

| # | Item | Resultado |
|---|------|-----------|
| 1 | Diferença funcional 114 × 116 | Profile/channel/env/`distribution`: **preview/INTERNAL/Ad Hoc** vs **production/STORE/App Store**. JS ~5.8 MB em ambas (≠ regressão easignore 2.2 MB). API/Supabase/anon key **idênticos** no IPA. Único código env-gated: rejeição de token `mock.*` em production |
| 2 | Causa raiz exata | Bearer das APIs mobile vinha **somente** do SecureStore. Sessão Auth canônica fica no AsyncStorage. No upgrade **Ad Hoc (114) → App Store/TestFlight (116)** o Keychain pode ficar vazio/inacessível; login aparenta OK, mas `getAccessToken()` retorna `null` → APIs 401. Em seguida `tenant.tsx` gravava `permissions: []` se `/permissions` falhasse → abas ocultas / Access Denied em massa (mesmo sintoma da regressão RBAC) |
| 3 | Arquivo/linha | `apps/mobile/src/auth/secure-session.ts` (`getAccessToken`); `apps/mobile/app/(auth)/tenant.tsx` (`handleSelect` permissions); agravante layout: imports de `*/sections` no tab bootstrap |
| 4 | Variáveis preview presentes | `EXPO_PUBLIC_API_BASE_URL` SIM · `EXPO_PUBLIC_SUPABASE_URL` SIM · `EXPO_PUBLIC_SUPABASE_ANON_KEY` SIM (sensitive) · `EXPO_PUBLIC_APP_ENV` SIM=`preview` |
| 5 | Variáveis production presentes | Mesmas três + `EXPO_PUBLIC_APP_ENV` SIM=`production` |
| 6 | Diferenças de env | Somente `EXPO_PUBLIC_APP_ENV` / channel / `environment` EAS; hosts API e Supabase **iguais** |
| 7 | API usada pela 116 | `https://gestao-no-foco.vercel.app` (embutida no IPA; host region SHA idêntico à 114) |
| 8 | Supabase usado pela 116 | `https://phjskpyuqlijvbgjdkss.supabase.co` (anon key presente; hash idêntico à 114; sem revelar valor) |
| 9 | RBAC production correto após fix | **SIM** (paridade preview×production nos testes; aliases financeiros intactos; sem bypass) |
| 10 | Financeiro production esperado | **PASS** (esperado; homologação física pendente) |
| 11 | CRM production esperado | **PASS** (esperado) |
| 12 | Estoque production esperado | **PASS** (esperado) |
| 13 | Operação production esperado | **PASS** (esperado) |
| 14 | Inteligência production esperado | **PASS** (esperado) |
| 15 | testes environment parity | **PASS** (19/0) |
| 16 | Doctor 20/20 | **SIM** |
| 17 | lint | **PASS** (0 warnings) |
| 18 | typecheck | **PASS** |
| 19 | tests | **PASS** (`mobile:test` 31/0; parity 19/0; startup 18/0) |
| 20 | export iOS | **PASS** (~5.8 MB hbc) |
| 21 | commit SHA | `954a677` |
| 22 | Vercel Ready | **N/A** (sem mudança backend/API; smoke produção já OK) |
| 23 | Build 117 gerada | **SIM** |
| 24 | Build ID | `fa3cd663-1cdc-45ef-9f85-576ce139c683` |
| 25 | Build URL | https://expo.dev/accounts/gesto-no-foco/projects/gestao-no-foco/builds/fa3cd663-1cdc-45ef-9f85-576ce139c683 |
| 26 | enviada ao TestFlight | **NÃO** |
| 27 | pronto para homologar 117 no iPhone | **SIM** (instalar IPA/store build 117; **não** submit automático) |

---

## Evidência IPA 114 × 116 (antes do fix)

| Campo | Build 114 | Build 116 |
|-------|-----------|-----------|
| EAS ID | `7165e858-ae78-4030-8f30-3d0b2087c369` | `a28888c0-fb81-4c21-94bf-51e07dd99f97` |
| Profile | preview | production |
| Distribution | INTERNAL (Ad Hoc) | STORE (App Store) |
| Channel | preview | production |
| Commit | `b4e25b2` | `fc5c106` (só docs + `distribution:store` vs 114) |
| `main.jsbundle` | ~5.84 MB | ~5.84 MB (+139 B) |
| `appEnv` (EXConstants) | preview | production |
| API host no bundle | gestao-no-foco.vercel.app | idêntico |
| Supabase host no bundle | phjskpyuqlijvbgjdkss.supabase.co | idêntico |
| Anon key (presença/hash) | presente / igual | presente / igual |
| OTA no channel | nenhum | nenhum |
| CheckOnLaunch | ERROR_RECOVERY_ONLY | ERROR_RECOVERY_ONLY |

Diff de código mobile 114→116: **apenas** `eas.json` `distribution: "store"`.

---

## Divergências env no código (auditoria)

| Local | Comportamento |
|-------|----------------|
| `secure-session.ts` `isProductionMode()` | Rejeita tokens `mock.*` só em production |
| `session-store.ts` | Idem no boot/login |
| `validate.ts` `getAppEnv()` | Display / parse; fallback invalid → preview |
| `app.config.ts` `extra.appEnv` / `releaseChannel` | Metadados |
| `settings.tsx` | Mostra ambiente |
| `logger.ts` `__DEV__` | Sem debug em release (preview EAS também é release) |

**Nenhuma** feature de Financeiro/CRM/Estoque/Operação/Inteligência condicionada a `preview`.

---

## Correção 32.1.1

1. **`getAccessToken`**: se SecureStore vazio, fallback para `supabase.auth.getSession().access_token` + best-effort rehydrate.
2. **`tenant.tsx`**: falha de `/permissions` **não** grava `[]`; mostra erro recuperável.
3. **Tab layout**: `CRM`/`STOCK`/`OPS` perms em módulos leves (`*/perms.ts`), espelhando finance 31.11.14.
4. **`eas.json`**: `environment` explícito em cada profile.
5. **`runtimeVersion`**: `1.10.0-hotfix-32.1.1` / integrity `32.1.1`.
6. **Testes**: `scripts/phase32-1-1-environment-parity-tests.mjs` + asserts em `mobile:test`.

---

## Build 117

```json
{
  "id": "fa3cd663-1cdc-45ef-9f85-576ce139c683",
  "appVersion": "1.10.0",
  "appBuildVersion": "117",
  "profile": "production",
  "distribution": "STORE",
  "channel": "production",
  "runtimeVersion": "1.10.0-hotfix-32.1.1",
  "gitCommitHash": "954a6773ed2bbbcc90230b7136fd37b9be5d87f4"
}
```

IPA: https://expo.dev/artifacts/eas/Jp3O98HQbKelLCukRLuhhO5_q7MIz3dxF7gGqre-jLY.ipa

**Não** executar `eas submit` nesta sprint — homologar no iPhone primeiro.

### Homologação sugerida no iPhone

1. Remover app anterior (Ad Hoc 114 / TestFlight 116) se possível.
2. Instalar **Build 117** (TestFlight interno quando submetida manualmente, ou IPA store via dispositivo de teste).
3. Login real → selecionar empresa → validar abas: Início, Inteligência, Financeiro, Operação, Estoque, CRM.
4. Em Ajustes: Ambiente `production`, Integrity `32.1.1`.

---

## Smoke produção Web (sessão)

| URL | Resultado |
|-----|-----------|
| `/` | 200 |
| `/api/health` | 200 ok |
| `/api/status` | 200 production |
| `/api/mobile/v1/memberships` sem token | **401** `Token ausente` |
