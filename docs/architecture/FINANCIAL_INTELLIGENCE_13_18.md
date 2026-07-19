# Financial Intelligence — Sprint 13.18

Camada de **leitura executiva** sobre DRE, Fluxo de Caixa e vendas.  
Não altera regras financeiras, schema, DRE, Fluxo, recorrência ou APIs existentes.

## Rota

`/[tenant]/financeiro/inteligencia`

Entrada no hub Financeiro: **Inteligência Financeira**.

## Princípios

1. **Somente leitura** — `createDreService().getDre()` e `createFluxoCaixaService().getFluxo()`.
2. **Sem duplicar fórmulas** — totais P&L vêm de `DreResumo`; margens/% são derivações de apresentação.
3. **Sem IA externa** — insights determinísticos em `lib/financial-intelligence/insights.ts`.
4. **Drill-down** — links para DRE (linha/detalhe), documento (CP/CR/venda) e Fluxo.
5. **Sem placeholders inventados** — KPIs sem fonte (OS / mecânico / consultor) aparecem como indisponíveis com motivo explícito.

## Arquitetura

```
UI (Server Components)
  └─ FinancialIntelligenceService.getSnapshot()
       ├─ DreService.getDre (atual + anterior)
       ├─ FluxoCaixaService.getFluxo (includeItens: false)
       ├─ vendas (ticket / rankings cliente·centro)
       └─ tendências (DRE mensal 12m + buckets do período + daily fluxo)
```

## Cockpit

Receita Bruta · Receita Líquida · CMV · Lucro Bruto (= margem de contribuição) ·  
Despesas Operacionais · EBITDA · EBIT · Resultado Líquido  

Cada card: valor, período anterior, variação %, tom automático, tooltip, link DRE.

## Despesas

Grupos alinhados à classificação DRE/`dre_detalhe` já existente (locação, utilidades, pessoal, encargos, benefícios, marketing, administrativas, financeiras, tributos, depreciação, outras).

## Performance

- Server Components na página
- `includeItens: false` no fluxo
- memo no grid de KPIs (`FiMetricGrid`)
- loading skeleton na rota
- trends usam `Promise.all` (aceitar custo de leitura agregada; não há writes)

## Limitações

| KPI | Status |
|---|---|
| Receita por OS | Indisponível — sem vínculo no domínio |
| Receita por mecânico | Indisponível — qualidade mede retornos |
| Receita por consultor | Indisponível — ranking comercial vazio |

## Validação

- Nenhuma migration nova
- Nenhum arquivo de `lib/dre/*` composição alterado
- lint / build verdes
