# Sprint 31.5 — BASELINE Estoque / Compras Mobile

**Data:** 2026-08-04
**Missão:** Experiência Mobile Enterprise reutilizando 100% da lógica Web (sem novas regras/cálculos).

## Git (início da sprint)

| Comando | Resultado |
|---------|-----------|
| `git log -5` | `cec3e22` hotfix dropdown; `20821bc` tenant logout; `d25c45f` docs 31.2/31.3; `ecc1aa1` Dashboard+Finance; `6a60706` invites |
| Working tree | CRM Mobile 31.4 ainda untracked/local (compose, rotas, apps/mobile/crm, scripts 31-4) |
| `git diff --check` | limpo nos tracked |

## Auditoria Web — Estoque

| Área | Fonte | Notas |
|------|-------|-------|
| Dashboard KPIs | `lib/estoque/estoque-dashboard-service.ts` → `EstoqueDashboardService.getData` | produtos, valor, críticos, zerados, entradas/saídas |
| Executive | `lib/estoque/executive-stock-compose.ts` / `executive-stock-service.ts` | KPIs ricos (não obrigatório no mobile se dashboard cobrir) |
| Movimentações | `lib/estoque/estoque-service.ts` → `listMovimentacoes`, `listAlertasEstoqueBaixo` | tipos: entrada · saída · ajuste |
| Reposição | `lib/estoque/abc/abc-curve.ts` → `suggestReposicao` | puro |
| ABC | `classifyAbcCurve` | puro |
| Produtos | `lib/produtos/produto-service.ts` | list/getById; categoria = campo string |
| Categorias | sem service dedicado | distinct via produtos / `porCategoria` do dashboard |
| Inventário | `lib/supply/enterprise/inventory-service.ts` + `inventory-model.ts` | `listInventoryCycles`, `summarizeOpenInventoryDivergences`, `computeInventoryDivergences` |

## Auditoria Web — Compras / Fornecedores

| Área | Fonte | Notas |
|------|-------|-------|
| Pedidos | `lib/supply/enterprise/purchase-service.ts` → `listPurchaseOrders` | status workflow; sem `lib/compras` |
| Requisições | status `solicitacao` no pedido | não há módulo separado |
| Fornecedores | `lib/financeiro/fornecedor-service.ts` | list/getById |
| Supply KPIs/alerts | `lib/supply/enterprise/*` | soft-fail se schema ausente |
| Importações | `lib/import-engine` | web-only nesta sprint (quick action → web) |

## RBAC (existente — não alterar)

- `estoque.*` (visualizar, movimentar, inventariar, transferir, …)
- `produtos.*`
- `compras.*`
- `fornecedores.*`
- `supply.dashboard.visualizar`, `dashboard.estoque`
- **Não existem** namespaces `inventario.*` / `movimentacoes.*` → usar `estoque.inventariar` / `estoque.movimentar`

## Padrão Mobile a espelhar

- Auth: Bearer → membership → permissions (`crm-route-auth` / `finance-route-auth`)
- Compose: instancia services com client (admin se disponível) — **sem service_role string**
- Offline: snapshot RO home + staleTime 60s
- Tab Expo + substack

## Escopo 31.5

APIs `/api/mobile/v1/tenants/:tenantId/estoque/{dashboard,produtos,produtos/:id,categorias,movimentacoes,inventario,compras,fornecedores,alertas,reposicao}`
Telas mobile: home, produtos, produto/:id, movimentacoes, inventario, compras, fornecedores, alertas.
Sem mutações offline. Sem commit/push/deploy/EAS/SQL.
