# Phase 31.5 — Estoque / Compras Mobile

## Objetivo

Experiência Mobile Enterprise de Estoque e Compras reutilizando **100%** da lógica Web (services existentes). Sem novas regras/cálculos/migrations.

## Arquitetura

```
Expo (tab Estoque)
  → Bearer + SecureStore
  → /api/mobile/v1/tenants/:tenantId/estoque/*
       → authorizeStockRoute (membership + permissions)
       → stock-compose (EstoqueDashboardService, EstoqueService,
                        ProdutoService, listPurchaseOrders,
                        inventory-service, FornecedorService,
                        suggestReposicao)
       → DTO strings formatadas (presentation)
```

## Regras

- Soft-fail em fontes opcionais (`unavailable[]`)
- Offline: snapshot RO do dashboard apenas (`@gof/cache/stock-summary/{tenantId}`)
- Mutações / importações / DnD inventário: web
- RBAC existente: `estoque.*`, `produtos.*`, `compras.*`, `fornecedores.*` (sem namespaces `inventario.*` / `movimentacoes.*`)

## Telas

Home · Produtos · Produto detail · Movimentações · Inventário · Compras · Compra detail · Fornecedores · Alertas

## Relacionado

- `MOBILE_STOCK_API.md`
- Evidence: `docs/testing/evidence/31-5/`
