# Mobile Stock API (Sprint 31.5)

Base: `/api/mobile/v1/tenants/:tenantId/estoque`

Auth: `Authorization: Bearer <access_token>` + membership ativa + permissions.

| Método | Path | Compose |
|--------|------|---------|
| GET | `/dashboard` | `composeStockDashboard` |
| GET | `/produtos` | `composeStockProducts` · query: `q`, `categoria`, `marca`, `fornecedor`, `status`, `page` |
| GET | `/produtos/:id` | `composeStockProductDetail` |
| GET | `/categorias` | `composeStockCategories` |
| GET | `/movimentacoes` | `composeStockMovements` · query: `q`, `tipo`, `page` |
| GET | `/inventario` | `composeStockInventory` |
| GET | `/compras` | `composeStockPurchases` · query: `status` |
| GET | `/compras/:id` | `composeStockPurchaseDetail` |
| GET | `/fornecedores` | `composeStockSuppliers` · query: `q`, `page` |
| GET | `/alertas` | `composeStockAlerts` |
| GET | `/reposicao` | `composeStockReposicao` |

## Fontes (sem duplicar matemática)

- `EstoqueDashboardService.getData`
- `EstoqueService.listMovimentacoes` / `listAlertasEstoqueBaixo`
- `ProdutoService.list` / `getById`
- `listPurchaseOrders` / linhas `compras_pedido_itens`
- `listInventoryCycles` / `summarizeOpenInventoryDivergences`
- `FornecedorService.list`
- `suggestReposicao`

## Erros

- `401` unauthorized
- `403` FORBIDDEN_STOCK / membership
- `404` produto/pedido

Sem service role no client mobile; compose pode usar admin client se disponível (mesmo padrão CRM/Finance).
