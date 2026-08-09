# Sprint 32.5 — Dashboard cold-start + consolidação tab bar

**Data:** 2026-08-09  
**Classificação:** APROVADA COM RESSALVAS (homologação física Build 120 pendente)

## Causa raiz (Dashboard)

No cold start / upgrade, `restoreFromMetadata` restaurava `tenantId`/`branchId` mas **não** as permissões.  
`permissions: []` → `canExec === false` → `href: null` na aba **Início** (Dashboard) → tela sumia silenciosamente.

## Correções

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

## Build

| Campo | Valor |
|-------|-------|
| Baseline | 119 |
| Nova build | **120** (pending EAS) |
| Profile | production |
| TestFlight | NÃO ENVIAR |

## Próxima ação

🟡 TESTAR NO IPHONE PRIMEIRO
