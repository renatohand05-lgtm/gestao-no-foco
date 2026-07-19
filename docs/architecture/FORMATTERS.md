# Formatadores — Sprint 9.8.1

Fonte canônica: `@/lib/format` (e reexports nos módulos de domínio).

---

## Unificados (saída idêntica verificada)

| Função | Local canônico | Aliases de domínio |
|--------|----------------|--------------------|
| `formatCurrency` | `lib/format/currency.ts` | financeiro, vendas, produtos, dashboard |
| `formatNumber` | `lib/format/number.ts` | dashboard |
| `formatPercent` (pontos, 1 casa default) | `lib/format/percent.ts` | dashboard, produtos |
| `formatQuantity` | `lib/format/quantity.ts` | produtos, vendas, estoque |
| `formatDateTime` | `lib/format/date.ts` | `formatFinanceiroDate`, `formatProdutoDate`, `formatVendaDateTime`, `formatMovimentacaoDate`, `formatClienteDate` |
| `formatDateOnly` | `lib/format/date.ts` | financeiro; base de `formatVendaDate` |
| `formatVariationPct` | `lib/format/variation.ts` | dashboard |

---

## Não unificados (divergência funcional)

| Função | Motivo |
|--------|--------|
| `formatPercent` financeiro (= `formatPercentTaxa`) | 2–4 casas via `style: "percent"`; ex. `12.34` → `12,34%` vs `12,3%` |
| `formatDataReferencia` (clientes) | `dateStyle: "long"` + `T00:00:00` |
| Labels/máscaras de domínio | `get*Label`, `formatDocumento`, `formatVendaNumero`, etc. |
| `formatCompact` / `formatTrend` | **Não existem** no código |

---

## Regra

Unificar somente com entrada/saída/locale/arredondamento idênticos.  
Novos módulos: importar de `@/lib/format`. Imports antigos via `lib/<modulo>/format` permanecem válidos.
