# Sprint 31.5 — REPORT Estoque / Compras Mobile

## Classificação

**SPRINT 31.5 APROVADA COM RESSALVAS**

### Ressalvas

1. Device QA Android/iOS **não executado** (não homologar store).
2. Expo Doctor **19/20** — drift pré-existente (`react-native-gesture-handler` major + patch Expo); não introduzido pelo compose/telas 31.5.
3. Tipos de movimentação nativos Web: `entrada` | `saida` | `ajuste` (transferência/inventário como fluxo = web / origem).
4. Cold/Warm/Lista ms: **não medidos** em device (ver PERFORMANCE.md).
5. Mutações / importações / contagem inventário: somente leitura mobile → web.

## Resumo técnico

Tab **Estoque** no Expo espelhando padrão 31.3/31.4: Bearer + membership + RBAC → `stock-compose` reusando `EstoqueDashboardService`, `EstoqueService`, `ProdutoService`, `listPurchaseOrders`, inventário supply, `FornecedorService`, `suggestReposicao`. Offline RO no home; listas online com infinite scroll.

## Arquitetura / APIs

Ver `docs/architecture/PHASE_31_5_STOCK_MOBILE.md` e `MOBILE_STOCK_API.md`.

11 rotas sob `/api/mobile/v1/tenants/:tenantId/estoque/`.

## Gates (sessão)

| Gate | Resultado |
|------|-----------|
| homolog-31-5 | **8 PASS · 0 FAIL** |
| mobile:lint | 0 |
| mobile:typecheck | 0 |
| mobile:test | 2 PASS |
| lint (root) | 0 errors (28 warnings pré-existentes em scripts) |
| build | 0 — rotas estoque listadas |
| test:rbac | 92 PASS |
| test:release-candidate | 65 PASS |
| Expo Doctor | **19/20** |

## Offline / RBAC / Performance

- Snapshot `@gof/cache/stock-summary/{tenantId}`
- Listas/detalhe online-only
- RBAC via `estoque.*` / `produtos.*` / `compras.*` / `fornecedores.*` / `supply.dashboard.visualizar` / `dashboard.estoque`
- Performance device: não medida

## Sem commit / push / deploy / EAS
