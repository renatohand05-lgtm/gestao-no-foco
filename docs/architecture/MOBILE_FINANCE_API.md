# Mobile Finance API

Base: `/api/mobile/v1/tenants/:tenantId/financeiro`

## Autenticação

- Bearer token (usuário)
- Membership ativa no tenant
- RBAC via `resolveMobilePermissions`
- Tenant/filial **não** confiados apenas do body do app

## Endpoints

| Método | Path | Compose |
|--------|------|---------|
| GET | `/summary` | `composeFinanceSummary` |
| GET | `/cash-flow` | `composeCashFlow` |
| GET | `/accounts-payable?page&status` | `composeAccountsPayable` |
| GET | `/accounts-receivable?page&status` | `composeAccountsReceivable` |
| GET | `/dre` | `composeDreMobile` |
| GET | `/approvals` | `composeFinanceApprovals` |
| GET | `/transactions/:id?kind=pagar\|receber` | `composeFinanceDetail` |

## Contratos

- Valores monetários já formatados (`formatCurrencyCompact`)
- Campos sem fonte → `null` + `unavailable[]` (nunca zero falso)
- Paginação limitada (page ≤ 100, perPage 30)
- Erros sanitizados (`mapDatabaseErrorToUserMessage`)

## Permissões canônicas

- `financeiro.visualizar`
- `financeiro.ver_saldos`
- `financeiro.ver_fluxo_caixa`
- `financeiro.ver_dre`
- `financeiro.aprovar`
