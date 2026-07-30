# Sprint 25.7.2 — Key duplicada no sidebar · Relatório

**Classificação:** **APROVADO EM RUNTIME**  
**Data:** 2026-07-30  
**URL:** http://localhost:3001  
**Evidências:** `docs/testing/evidence/25-7-2/`

---

## Causa raiz

Em `components/layout/app-sidebar.tsx`, a função `groupNav` usava:

```ts
byHref("/analytics")  // inclui .../analytics E .../analytics/relatorios
byHref("/relatorios") // inclui .../analytics/relatorios de novo
```

O item **Relatórios** (`/{tenant}/analytics/relatorios`) entrava **duas vezes** no grupo Inteligência. A key React era `key={item.href}` → warning:

`Encountered two children with the same key: /teste-renato-01/analytics/relatorios`

Não era só a key: havia **duplicação real** na lista renderizada.

### Itens envolvidos

| Label | Grupo | Origem | href final | Problema |
|-------|-------|--------|------------|----------|
| Analytics | Inteligência | `config/navigation.ts` | `/{t}/analytics` | Match amplo também puxava Relatórios |
| Relatórios | Inteligência | `config/navigation.ts` | `/{t}/analytics/relatorios` | Aparecia 2× (analytics + relatorios) |

---

## Correção

1. **`NavItem` com `id` + `group` estáveis** em `config/navigation.ts`  
   - Ex.: `id: "analytics"`, `id: "analytics-reports"`  
   - Agrupamento por `group`, sem `includes` amplo.
2. **Keys:** `key={`${group.id}:${item.id}`}` via `sidebarItemKey` — nunca índice, nunca só href.
3. **Deduplicação defensiva** em `lib/navigation/sidebar-nav-core.mjs`  
   - Detecta `duplicate_id`, `duplicate_href`, `missing_id`, etc.  
   - Dev: `console.warn` detalhado.  
   - Produção: remove duplicata (primeira vence), UI estável.
4. **`isNavItemActive`** — em `/analytics/relatorios`, só Relatórios fica ativo (Analytics não herda falso-positivo).
5. **Mecânicos** voltou ao grupo Operação (antes sumia do `groupNav` legado).
6. **ThemeToggle / ThemeProvider** — preferência via `useSyncExternalStore` (SSR snapshot = default), sem `setState` de preferência em `useEffect` → **0 hydration mismatch**.

---

## Runtime (Playwright)

| Check | Resultado |
|-------|-----------|
| Overlay Build Error | não |
| `reportsMenuCount` | **1** |
| `analyticsMenuCount` | **1** |
| duplicate key no console | **0** |
| hydration mismatch | **0** |
| CssSyntaxError no server | **0** |
| `/analytics` | 200 |
| `/analytics/relatorios` | 200 |
| Theme toggle | ok |

`runtime-report.json`: `fatal: false`, `errors: []`, `warnings: []`.

---

## Testes — 0 FAIL

| Comando | Resultado |
|---------|-----------|
| `test:sidebar-navigation-keys` | 31 PASS |
| `lint` | OK |
| `build` | OK |
| `test:global-css` | OK |
| `test:design-system-final` | OK |
| `test:visual-consistency` | OK |
| `test:responsive-shell` | OK |
| `test:brand-experience` | OK |
| `test:dashboard-premium` | OK |
| `test:rbac` | OK |
| `test:release-candidate` | OK |

---

## Arquivos

**Criados:** `lib/navigation/sidebar-nav.ts`, `lib/navigation/sidebar-nav-core.mjs`, `scripts/sidebar-navigation-keys-tests.mjs`, `scripts/capture-25-7-2-runtime.mjs`, `docs/testing/evidence/25-7-2/*`

**Alterados:** `config/navigation.ts`, `components/layout/app-sidebar.tsx`, `components/brand/theme-provider.tsx`, `components/brand/theme-toggle.tsx`, `package.json` (`test:sidebar-navigation-keys`)

---

## Confirmações

- Sem alteração de regras de negócio / RBAC / tenant  
- Design System preservado  
- Sem migration / SQL / git add / commit / push / deploy  

---

## Classificação final

### APROVADO EM RUNTIME
