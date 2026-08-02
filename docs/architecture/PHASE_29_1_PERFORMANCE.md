# Fase 29.1 — Performance Enterprise

**Sprint:** 29.1  
**Pré-requisito:** Sprint 29.0 concluída  
**Escopo:** desempenho sem alteração de regras de negócio, banco, RBAC ou KPIs

---

## Princípios

1. Preferir `React.cache` (por request) — **não** `unstable_cache` em dados financeiros ao vivo
2. Paralelizar awaits independentes com `Promise.all` (mesmo resultado)
3. `next/dynamic` em Client Components pesados (OS workspace, cash, treasury, CRM, analytics)
4. Isolar re-renders de chrome (DemoMode) da árvore da página
5. Não alterar fórmulas, queries de cálculo, policies ou seeds RBAC

---

## Entregas 29.1

| Área | Mudança |
|------|---------|
| Layout tenant | `Promise.all` auth/tenant/profile |
| Dashboard | `React.cache` em `fetchDashboardFilterOptions` + `createDashboardService` |
| Fluxo de Caixa | Finance Core + legado em paralelo |
| CFO | Cash Intelligence + aging em paralelo |
| OS detalhe | `perms.has` em paralelo; recursos/mecânicos/recorrência em paralelo; workspace lazy |
| Descontos | duas leituras `desconto_eventos` em paralelo |
| Financeiro / Caixa / CRM / Analytics | lazy wrappers `*-lazy.tsx` |
| AppShell | `PageSlot` memoizado sob DemoMode |

---

## Cache recusado (mantido)

Sem `unstable_cache` em DRE / Fluxo / CR / CP / saldos / estoque / KPIs — ver [PERFORMANCE.md](./PERFORMANCE.md).

---

## Gate

```bash
npm run lint
npm run build
npm run test:phase29
npm run test:release-candidate
```

Evidências: `docs/testing/evidence/29-1/`

## Backlog 29.2+

- Batch único de `tenant_role_permissions` (API `hasMany`) sem mudar regras
- Deep-imports em massa de `@/components/executive` em clients
- Lazy de wizards de importação / NFe conferência
- Agregações SQL/RPC para rankings (quando houver sprint de dados)
