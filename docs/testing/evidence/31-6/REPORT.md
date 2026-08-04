# Sprint 31.6 — REPORT Operação Mobile

## Classificação

**SPRINT 31.6 APROVADA COM RESSALVAS**

### Ressalvas

1. Device QA Android/iOS **não executado**.
2. Cold/Warm **não medidos**.
3. Mutações nativas fora de escopo (CTA portal).
4. Produtividade no dashboard = média dos KPIs canônicos por mecânico (`MecanicosDashboardService`), não um KPI tenant inventado.

## Dependências

Ver `DEPENDENCY_FIX.md`. Expo Doctor **19/20 → 20/20**.

## Scripts

Inicialmente ausentes. Criados com validações reais e registrados no `package.json`.

## Gates (sessão)

| Gate | Resultado |
|------|-----------|
| Expo Doctor | **20/20** |
| mobile lint/typecheck/test | 0 · 0 · 2 PASS |
| homolog-31-6 | **11 PASS · 0 FAIL** |
| regression dashboard/finance/crm/stock | PASS |
| lint root | 0 errors |
| test:rbac | 92 PASS |
| test:release-candidate | 65 PASS |
| build | 0 (rotas `/operacao/*` listadas) |

## Sem commit / push / deploy / EAS
