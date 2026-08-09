# Sprint 31.11.13 — Homologação Financeiro + CRM + metadados

## Classificação

**APROVADA COM RESSALVAS**

Ressalva: homologação física no iPhone com build **111**. Se CRM ainda mostrar “Indisponível: oportunidades”, é falha real de carga (RLS/API) — não lista vazia mascarada.

---

## 1–5. Financeiro

| # | Item | Resultado |
|---|------|-----------|
| 1 | Causa raiz | Tela/API exigiam `financeiro.visualizar*`; perfil tinha `analytics.financeiro` sem expand reverso |
| 2 | Key exigida antes | `financeiro.visualizar` (literal, sem alias) |
| 3 | Alias correto | `analytics.financeiro` / `dashboard.financeiro` → `financeiro.visualizar` (+ view) |
| 4 | Bypass criado | **NÃO** |
| 5 | Financeiro autorizado corretamente | **SIM** (mesmo critério Web via `expandFinancePermissions` + client aliases) |

Arquivos: `lib/finance/shared/rbac-compat.ts`, `lib/mobile/finance-compose.ts`, `apps/mobile/src/finance/sections.tsx`, `packages/rbac-contracts`.

## 6–8. CRM

| # | Item | Resultado |
|---|------|-----------|
| 6 | Causa | `soft(listAll)` + `!opps.length` → tratava vazio e erro igualmente |
| 7 | Corrigido | **SIM** — `unavailable` só se `oportunidadesLoadFailed` |
| 8 | Dados parciais ainda possíveis | **SIM** apenas se carga falhar de verdade |

## 9–12. Módulos preservados

Operação / Inteligência / Estoque / Perfil: **SIM** (sem regressão intencional; suites PASS).

## 13–15. Metadados

| Campo | Valor |
|-------|--------|
| Versão | `1.10.0` (`nativeApplicationVersion`) |
| Build | **111** (EAS remote, autoIncrement preview) |
| Ambiente | `preview` |

## 16–22. Gates

| Gate | Resultado |
|------|-----------|
| Doctor 20/20 | **SIM** |
| lint / typecheck / test | **SIM** |
| parity + finance-alias 11/0 | **SIM** |
| export iOS | **SIM** |
| segurança (sem service_role mobile) | **SIM** |

## 23–30. Release

| Item | Valor |
|------|--------|
| Commit | `7a18e9735b82768d4a3f7cbb377cfbf0ba7e7016` |
| main = origin/main | **SIM** |
| Vercel Ready | **SIM** (`dpl_EHLG8EYvKCDRPiPLEySk7mX745P1`, Commit `7a18e97`) |
| Smoke prod | **SIM** (`/` `/login` health/status OK; memberships **401**) |
| Build iOS | **SIM** |
| Build ID | `7480e027-201e-4d97-9290-54d19da5dfdb` |
| Build URL | https://expo.dev/accounts/gesto-no-foco/projects/gestao-no-foco/builds/7480e027-201e-4d97-9290-54d19da5dfdb |
| Pronto homologação iPhone | **SIM** |

## 31–32. Pendências / blockers

- Homologar no iPhone: Financeiro abre; CRM sem “Indisponível” falso para lista vazia.
- TestFlight/App Store: **não** nesta sprint.
