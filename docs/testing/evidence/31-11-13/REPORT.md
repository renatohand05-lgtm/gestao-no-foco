# Sprint 31.11.13 — Homologação Financeiro + CRM + metadados

## Classificação

**APROVADA COM RESSALVAS**

Ressalva: CRM “oportunidades” só aparece como indisponível se a carga falhar; lista vazia legítima deixa de ser mascarada como erro. Homologação física pendente na nova build.

---

## 1. Causa raiz Financeiro

A tela/API exigiam chaves canónicas (`financeiro.visualizar`, `ver_saldos`, `ver_fluxo_caixa`, `ver_dre`), mas o perfil efetivo trazia **`analytics.financeiro`** (Enterprise analytics) sem expandir o alias reverso usado na Web (`analytics-engine` mapeia equivalências).

| Item | Valor |
|------|--------|
| Exigido antes | `financeiro.visualizar` (literal) |
| Alias correto | `analytics.financeiro` / `dashboard.financeiro` → `financeiro.visualizar` (+ view keys) |
| Arquivo | `lib/finance/shared/rbac-compat.ts`, `lib/mobile/finance-compose.ts`, `apps/mobile/src/finance/sections.tsx`, `@gof/rbac-contracts` |
| Bypass | **NÃO** |

## 2. CRM oportunidades

**Antes:** `soft(listAll)` + `if (!opps.length) unavailable.push("oportunidades")` — falha técnica e lista vazia eram iguais (“Indisponível”).

**Depois:** `unavailable` só em **falha de carga**; lista vazia = zero/empty sem mascarar erro.

## 3. Metadados

- Versão: `Application.nativeApplicationVersion` / expo config `1.10.0`
- Build: `Application.nativeBuildVersion` (EAS remote)
- Ambiente: `EXPO_PUBLIC_APP_ENV` (`preview`)
- `autoIncrement: true` em profiles `preview`/`internal`

---

## Checklist (preenchido pós-release)

Ver seção final após build.
