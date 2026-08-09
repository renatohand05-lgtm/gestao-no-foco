# Sprint 31.11.14 — Hotfix iOS Build 111 não abre

## Classificação

**CORREÇÃO IMPLEMENTADA — AGUARDANDO HOMOLOGAÇÃO NO IPHONE**

Não declarar RESOLVIDO até a Build 112 abrir no mesmo iPhone.

---

## Checklist obrigatório

| # | Item | Resultado |
|---|------|-----------|
| 1 | Build 110 funcional (baseline) | **SIM** — ID `5e8f4169-3a9f-434d-869e-b65e0ccc5d37`, commit `2b2b15f`, abria no iPhone |
| 2 | Build 111 falha de startup | **SIM** — ID `7480e027-201e-4d97-9290-54d19da5dfdb`, commit `7a18e97`, instala e não abre |
| 3 | Commits/diff 110→111 | `2b2b15f` → `7a18e97` (+ docs `092ff6f`). Mobile: `settings.tsx`, `eas.json` autoIncrement, `FINANCE_VIEW_PERMS`, `packages/rbac-contracts`. Server: `rbac-compat`, `finance-compose`, `crm-compose` |
| 4 | Causa raiz EXATA | **Build 111 embarcou o mesmo `main.jsbundle` da Build 110 (SHA256 idêntico)** e só alterou `CFBundleVersion` 110→111, assinatura nativa e `EXUpdates.bundle/app.manifest` (novo update id) sob o **mesmo `runtimeVersion` `1.10.0`** com `EXUpdatesCheckOnLaunch=ALWAYS`. O JS da Sprint 31.11.13 **não entrou** no IPA; o upgrade iOS ficou com shell nativo novo + namespace de updates conflitando com o cache da 110 |
| 5 | Arquivo/linha responsável | Pipeline EAS / `expo-updates`: `apps/mobile/app.config.ts` (`runtimeVersion` policy `appVersion` + updates on launch); evidência IPA: `main.jsbundle` 110≡111; `Info.plist` `CFBundleVersion`; `EXUpdates.bundle/app.manifest` id distinto |
| 6 | Por que testes anteriores não detectaram | Suites unitárias validam fonte/git, não o artefato IPA. Nenhum gate comparava hash do Hermes embarcado nem isolamento de `runtimeVersion` entre builds preview |
| 7 | Correção implementada | (a) `runtimeVersion` explícito `1.10.0-startup-31.11.14` (marketing continua `1.10.0`); (b) `updates.checkAutomatically: ON_ERROR_RECOVERY`; (c) `extra.startupIntegrity`; (d) `FINANCE_VIEW_PERMS` em `finance/perms.ts` leve no tab layout; (e) import mid-file removido em `finance-compose.ts` |
| 8 | Teste de regressão | `scripts/phase31-11-14-startup-regression-tests.mjs` + `apps/mobile/test/startup-regression.test.mjs` |
| 9 | RBAC Financeiro preservado | **SIM** |
| 10 | CRM preservado | **SIM** |
| 11 | Doctor 20/20 | **SIM** |
| 12 | lint | **PASS** |
| 13 | typecheck | **PASS** |
| 14 | tests | **PASS** (`mobile:test` 29/0; finance-alias 11/0; startup 15/0) |
| 15 | startup regression | **PASS** |
| 16 | parity Web/Mobile | **PASS** (17/0) |
| 17 | expo export iOS | **PASS** |
| 18 | security | **PASS** (gate aponta `logger.ts` para `sanitizeForLog`) |
| 19 | commit SHA | _(preenchido após commit)_ |
| 20 | HEAD == origin/main | _(preenchido após push)_ |
| 21 | Build 112 gerada | _(preenchido após EAS)_ |
| 22 | Build ID | _(preenchido após EAS)_ |
| 23 | Build URL | _(preenchido após EAS)_ |
| 24 | versão | `1.10.0` (marketing) |
| 25 | build number | `112` (esperado via autoIncrement remote) |
| 26 | ambiente | `preview` |
| 27 | pendências restantes | Instalar Build 112 no iPhone (preferir apagar app anterior uma vez para limpar cache de updates) e confirmar abertura; TestFlight **não** |

---

## Evidência IPA 110 × 111

| Artefato | Relação |
|----------|---------|
| `main.jsbundle` | **SHA256 idêntico** |
| `EXConstants.bundle/app.config` | **idêntico** |
| `Expo.plist` | **idêntico** (`CheckOnLaunch=ALWAYS`, runtime `1.10.0`) |
| `embedded.mobileprovision` | **idêntico** |
| `GestonoFoco` (binário) | diferente (assinatura / metadados) |
| `Info.plist` | `CFBundleVersion` 110 → 111 |
| `EXUpdates.bundle/app.manifest` | novo `id` / `commitTime`, mesmos 22 assets |

---

## Homologação física

Após instalar a Build 112: se abrir normalmente → promover classificação para **RESOLVIDO**.  
Se ainda falhar: extrair crash log do iPhone (Ajustes → Privacidade → Análise) / Console macOS filtrando `GestonoFoco` / `ExpoUpdates`.
