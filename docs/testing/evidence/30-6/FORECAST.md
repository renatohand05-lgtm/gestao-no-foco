# Sprint 30.6 — Forecast (matemático)

Fonte: `buildForecastPanel` + `projectFromTrend` (`lib/analytics/core/trend-engine.ts`).

## Escopo

| Item | Método |
|------|--------|
| Receita prevista | tendência / média histórica do series do bundle |
| Lucro previsto | mesma engine sobre métrica de resultado |
| Fluxo de caixa previsto | projeção a partir de séries de caixa |
| Meta prevista | projeção vs target do período |
| Conversão prevista | tendência da conversão disponível |

## Garantias

- Metodologia e limitações sempre preenchidas.
- Sem OpenAI / LLM / copy generativo.
- `null` quando não há histórico suficiente (não inventa).

## Suite

`npm run test:phase30-forecast` → **8 PASS / 0 FAIL**
