# Sprint 31.11.14 — Hotfix iOS Build 111 não abre

## Classificação

**CORREÇÃO IMPLEMENTADA — AGUARDANDO HOMOLOGAÇÃO NO IPHONE**

Não declarar RESOLVIDO até a build corrigida abrir no mesmo iPhone.

---

## Checklist obrigatório

| # | Item | Resultado |
|---|------|-----------|
| 1 | Build 110 funcional (baseline) | **SIM** — ID `5e8f4169-3a9f-434d-869e-b65e0ccc5d37`, commit `2b2b15f` |
| 2 | Build 111 falha de startup | **SIM** — ID `7480e027-201e-4d97-9290-54d19da5dfdb`, commit `7a18e97` |
| 3 | Commits/diff 110→111 | `2b2b15f` → `7a18e97`. Diff mobile: settings, eas.json autoIncrement, FINANCE_VIEW_PERMS, rbac-contracts; server finance/CRM |
| 4 | Causa raiz EXATA | **`.easignore` na raiz usava o padrão `app/` (sem `/` inicial), que pelo sintaxe gitignore também excluía `apps/mobile/app/` (todo o Expo Router).** O upload EAS das Builds 111+ **não continha as rotas mobile**; o Hermes `main.jsbundle` ficou **SHA256-idêntico ao da Build 110** (JS da 31.11.13 nunca embarcou). Agravante: mesmo `runtimeVersion` `1.10.0` + novo `app.manifest` id + `CheckOnLaunch=ALWAYS` no upgrade 110→111 |
| 5 | Arquivo/linha responsável | `.easignore` linhas `app/` / `components/` (agora `/app/` / `/components/`); evidência: `ignore().ignores('apps/mobile/app/_layout.tsx') === true` antes do fix |
| 6 | Por que testes anteriores não detectaram | Gates validam árvore git local, não o conteúdo do arquivo EAS. Nenhum teste comparava hash do `main.jsbundle` do IPA nem simulava `.easignore` |
| 7 | Correção implementada | (a) `.easignore`: `/app/` `/components/` `/public/uploads/` `/data/`; (b) `runtimeVersion` `1.10.0-startup-31.11.14`; (c) `updates.checkAutomatically: ON_ERROR_RECOVERY`; (d) `finance/perms.ts` leve no tab layout; (e) import mid-file removido em finance-compose |
| 8 | Teste de regressão | `scripts/phase31-11-14-startup-regression-tests.mjs` + `apps/mobile/test/startup-regression.test.mjs` (+ prova ignore) |
| 9 | RBAC Financeiro preservado | **SIM** |
| 10 | CRM preservado | **SIM** |
| 11 | Doctor 20/20 | **SIM** |
| 12 | lint | **PASS** |
| 13 | typecheck | **PASS** |
| 14 | tests | **PASS** |
| 15 | startup regression | **PASS** |
| 16 | parity Web/Mobile | **PASS** |
| 17 | expo export iOS | **PASS** |
| 18 | security | **PASS** |
| 19 | commit SHA | `b4e25b2` (easignore) / hotfix base `8ff0808` |
| 20 | HEAD == origin/main | **SIM** |
| 21 | Build homologação gerada | **SIM** — **Build 114** (112/113 inválidas: JS ainda = 110) |
| 22 | Build ID | `7165e858-ae78-4030-8f30-3d0b2087c369` |
| 23 | Build URL | https://expo.dev/accounts/gesto-no-foco/projects/gestao-no-foco/builds/7165e858-ae78-4030-8f30-3d0b2087c369 |
| 24 | versão | `1.10.0` |
| 25 | build number | **114** |
| 26 | ambiente | `preview` |
| 27 | pendências | Instalar **Build 114** no iPhone (apagar app anterior recomendado) e confirmar abertura |

---

## Evidência IPA 110 × 111 × 112 × 113

| Build | `main.jsbundle` SHA256 | Nota |
|-------|------------------------|------|
| 110 | `1D2530372D9F9158A8E7E7C47DE32962F642E2A889F923754286D20BB1D9B745` | baseline funcional |
| 111 | **idêntico** | só Info.plist 111 + signature + updates manifest |
| 112 | **idêntico** | config nativa nova (`runtimeVersion`/`ON_ERROR_RECOVERY`), JS ainda cacheado |
| 114 | `B58EFD14FC788F0DC63B17CBD5CF7776F275C30D08F080FFC24B3567F4630C75` (~5.8 MB) | **JS novo** — easignore corrigido; homologar esta |

Prova local do ignore (antes):

```
IGNORE apps/mobile/app/(app)/settings.tsx
IGNORE apps/mobile/app/_layout.tsx
keep    packages/rbac-contracts/src/index.ts
```

Depois do fix (`/app/`):

```
keep    apps/mobile/app/(app)/settings.tsx
keep    apps/mobile/app/_layout.tsx
IGNORE app/layout.tsx
```

---

## Builds intermediárias (não usar na homologação final)

| Build | ID | Uso |
|-------|-----|-----|
| 112 | `fdae072f-0547-4310-90c9-854a8351664b` | config updates ok; **JS ainda = 110** |
| 113 | `bfde3545-7ebb-4b7a-ab04-0cf1ad5860aa` | clear-cache; **JS ainda = 110** |

## Build válida para homologação

| Campo | Valor |
|-------|--------|
| Build | **114** |
| ID | `7165e858-ae78-4030-8f30-3d0b2087c369` |
| URL | https://expo.dev/accounts/gesto-no-foco/projects/gestao-no-foco/builds/7165e858-ae78-4030-8f30-3d0b2087c369 |
| Versão | 1.10.0 |
| runtimeVersion | `1.10.0-startup-31.11.14` |
| Commit | `b4e25b2` |
| `main.jsbundle` | SHA ≠ 110; tamanho ~5.8 MB (antes ~2.2 MB cacheado) |
