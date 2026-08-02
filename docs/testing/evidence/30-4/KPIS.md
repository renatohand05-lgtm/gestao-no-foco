# KPIs — Sprint 30.4

Fonte: `lib/dashboard/cockpit-v2/kpis.ts` (reusa `buildPremiumTopKpis` + dados reais).

| KPI | Origem | Contexto |
|-----|--------|----------|
| Faturamento | `hoje.mes` / primary | variação vs período / vs ontem |
| Lucro | — | **Indisponível** → DRE (não inventado) |
| Caixa | `primary.kpis.saldo_bancario` | saldo consolidado |
| EBITDA | `primary.kpis.ebitda` | período filtrado |
| Margem | `primary.kpis.margem_media` | DRE/contribuição |
| Clientes | `quantidade_clientes` | movimento no período |
| Ordens | `intelligence.saudeOperacao` | label por segmento |
| Pendências | `cockpit.vencidas` | CR+CP vencidos |
| Meta | `hoje.mes.meta` | % realizado |

Cada KPI exige: valor · comparação · cor/tone · drill-down (dialog).
