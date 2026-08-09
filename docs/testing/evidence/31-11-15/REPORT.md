# Sprint 31.11.15 — Homologação final Build 114

**Data/hora:** 2026-08-09 ~16:45 UTC (13:45 UTC−3)  
**Branch:** `main`  
**HEAD (antes do commit deste relatório):** `9352050`  
**Após commit deste sprint:** ver git log  
**origin/main:** sincronizado após push  

## Classificação

**PRONTO PARA TESTFLIGHT** — Build **114** permanece candidata final.  
Nova build iOS: **NÃO** (apenas ajuste de suite de teste + evidência docs).

---

## Aceite manual iPhone (já confirmado)

| Tela | Resultado |
|------|-----------|
| Abertura Build 114 | PASS |
| Versão / build / env / integrity | 1.10.0 / 114 / preview / 31.11.14 |
| Início | PASS |
| Inteligência | PASS |
| Financeiro (sem Access Denied) | PASS |
| Operação | PASS |
| Estoque | PASS |
| CRM (pipeline vazio = válido) | PASS |
| Perfil | PASS |
| Ajustes | PASS |

---

## A. Git / repositório

| Check | Resultado |
|-------|-----------|
| `main == origin/main` | SIM (pré-commit `9352050`) |
| Working tree suja indevida | NÃO (só fix de teste desta sprint) |
| `app.json` raiz versionado | NÃO — `/app.json` no `.gitignore`; lixo local removido |
| `.easignore` `/app/` root-only | PASS (Expo Router `apps/mobile/app` incluído) |
| Secrets versionados | NENHUM encontrado |
| Artefatos dist/cache commitados | NÃO |

## B. Qualidade / gates

| Gate | Resultado |
|------|-----------|
| Expo Doctor | **20/20** |
| mobile:lint | PASS (0 warnings) |
| mobile:typecheck | PASS |
| mobile:test | PASS (29/0) |
| test:phase31-mobile (aggregate) | ALL PASS |
| test:phase31-11-10-rbac-parity | 17/0 |
| test:phase31-11-13-finance-alias | 11/0 |
| test:phase31-11-14-startup | 18/0 |
| test:phase31-rc-security | 7/0 |
| test:phase31-rc-permissions | 10/0 |
| test:phase31-finance-rbac-mobile | 7/0 (após alinhamento ao `perms.ts`) |
| test:phase31-finance-api-contracts | 21/0 |
| test:phase31-finance-tenant-isolation | 5/0 |
| test:phase31-crm-rbac | 12/0 |
| test:phase31-crm-api | 30/0 |
| test:phase31-stock-rbac | 17/0 |
| test:phase31-operations-rbac | 15/0 |
| test:phase31-intelligence-rbac | 7/0 |
| test:rbac (web) | 92/0 |
| test:phase31-ios-build | 15/0 |
| homolog-31-11 / 31-11-1 | PASS (readiness; TestFlight não executado) |
| expo export iOS | PASS (~5.8 MB hbc) |
| expo config public | runtime `1.10.0-startup-31.11.14`, integrity `31.11.14`, `ON_ERROR_RECOVERY` |
| Root `npm run lint` | 0 errors · 29 warnings pré-existentes em `scripts/*` (não app) |

## C. Mobile / iOS (regressão 31.11.14)

| Item | Status |
|------|--------|
| `.easignore` não exclui Expo Router | PASS |
| `runtimeVersion` isolado | PASS |
| `checkAutomatically: ON_ERROR_RECOVERY` | PASS |
| `startupIntegrity` | PASS |
| FINANCE_VIEW_PERMS em `finance/perms.ts` | PASS |
| Bundle local export ≠ cache 2.2 MB | PASS (~5.8 MB) |

## D–H. RBAC / Financeiro / CRM / Paridade

- Aliases `analytics.financeiro` / `dashboard.financeiro` → módulo financeiro: PASS (contratos + device).
- CRM: `unavailable` só com `oportunidadesLoadFailed`; lista vazia ≠ parcial: PASS.
- Paridade Web/API/Mobile suites: PASS.
- Sem bypass / grant `*`: PASS.

## I. Produção

| Endpoint | Resultado |
|----------|-----------|
| `/` | 200 |
| `/login` | 200 |
| `/api/health` | 200 |
| `/api/status` | 200 |
| `/api/mobile/v1/memberships` sem token | **401** |
| Vercel alias | READY |

## J. Regressões 31.11.11–14

Fixes de easignore, runtime updates, aliases financeiros e CRM empty-vs-error **presentes** e cobertos por suites.

## Alterações desta sprint

| Arquivo | Motivo |
|---------|--------|
| `scripts/phase31-finance-rbac-mobile-tests.mjs` | Suite apontava `sections.tsx` após extração para `perms.ts` |
| `docs/testing/evidence/31-11-15/REPORT.md` | Evidência |

**Nova build iOS:** NÃO exigida.

## Decisão

| Item | Valor |
|------|--------|
| Build candidata | **114** (`7165e858-ae78-4030-8f30-3d0b2087c369`) |
| Pendências bloqueantes | **NENHUMA** |
| Riscos residuais | Warnings ESLint em scripts legados (não runtime); TestFlight ainda não enviado (próximo passo humano) |
| PRONTO PARA TESTFLIGHT | **SIM** |
