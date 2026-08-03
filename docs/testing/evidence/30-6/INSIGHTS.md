# Sprint 30.6 — Business Insights

Fonte: `buildBusinessInsights` em `lib/analytics/decision-center/compose.ts`.

## Modelo

Cada insight tem: `title`, `ruleId`, `evidence`, `impactLabel`, `tone`, `href`.

Sem texto inventado — só dispara se a comparação/alerta/métrica existir no bundle.

## Regras cobertas (exemplos)

| Regra | Condição típica |
|-------|-----------------|
| Receita caiu | `fin.receita_*` com delta% negativo |
| Margem aumentou | margem com trend up / tone positive |
| CMV piorou | CMV com tendência adversa |
| Conversão melhorou | conversão/vendas com trend up |
| Pipeline parado | alerta/insight de pipeline parado |
| Estoque parado | métrica/alerta de estoque |
| Clientes inativos | clientes com sinal negativo |
| Follow-ups atrasados | alerta CRM de follow-up (quando presente no bundle) |

## Suite

`npm run test:phase30-insights` → **3 PASS / 0 FAIL**
