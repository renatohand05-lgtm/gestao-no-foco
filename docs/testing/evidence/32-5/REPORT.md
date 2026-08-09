# Sprint 32.5 — Dashboard cold-start + consolidação tab bar

**Data:** 2026-08-09  
**Classificação:** **BLOQUEADA** para distribuição — código e gates PASS; **Build 120 não gerada** (cota EAS Free iOS)

## Causa raiz (Dashboard)

No cold start / upgrade, `restoreFromMetadata` restaurava `tenantId`/`branchId` mas **não** as permissões.  
`permissions: []` → `canExec === false` → `href: null` na aba **Início** (Dashboard) → tela sumia silenciosamente.

## Correções (commit `788f066`)

1. Hydrate RBAC no boot (`hydrateTenantPermissions`) + cache AsyncStorage  
2. Tabs só filtram após `permissionsStatus` autoritativo  
3. Home mostra skeleton (não deny) enquanto hidrata  
4. Labels curtas: Ops / Financ. / Estoq. / Mais; contraste inactive reforçado  
5. Runtime `1.10.0-fix-32.5` / integrity `32.5`

## Gates

| Gate | Resultado |
|------|-----------|
| Doctor | 20/20 |
| lint | PASS |
| typecheck | PASS |
| mobile:test | 45/0 |
| test:rbac | 92/0 |
| phase32-2 | 28/0 |
| phase32-1-1 | 19/0 |
| expo export iOS | PASS |
| HEAD == origin/main | SIM (`788f066`) |

## Build

| Campo | Valor |
|-------|-------|
| Baseline | 119 (`8c5c68d1-…`) |
| Nova build necessária | **SIM** (runtime) |
| Build gerada | **NÃO** |
| Motivo | EAS Free plan: cota mensal de builds iOS esgotada (reset ~2026-09-01) |
| Contador remoto EAS | já em **120** (incrementou antes da falha de cota); próxima build bem-sucedida tende a ser **121** |
| Profile alvo | production / STORE / production |
| TestFlight | **NÃO ENVIAR** |

## Como regenerar (quando cota/plano liberar)

```powershell
cd apps\mobile
npx eas-cli@latest build --platform ios --profile production --clear-cache --non-interactive
```

Procurar Build **120** · production · STORE.

## Homologação iPhone (após Build 120)

1. Matar app → reabrir (cold start) — **Início** deve permanecer na tab bar  
2. Perfil: permissões ≠ `—`  
3. Dashboard/Início carrega (ou empty/error explícito)  
4. Tab bar: ativo gold / inativo legível; labels Ops/Financ./Estoq. sem reticências  
5. Regressão: login, Inteligência, Financeiro, Ops, Estoque, CRM, Perfil, Ajustes/Mais, offline  

## Próxima ação

🟡 TESTAR NO IPHONE PRIMEIRO — **após** gerar Build 120 (cota EAS).
