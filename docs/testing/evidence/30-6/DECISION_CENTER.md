# Sprint 30.6 — Decision Center

Fonte: `composeDecisionCenterPack` / `buildDecisions` / alertas enriquecidos.

## Card de decisão

| Campo | Descrição |
|-------|-----------|
| Problema | Título derivado do alerta/insight |
| Impacto | Texto de impacto (financeiro quando houver número) |
| Evidência | Explicação da comparação/alerta |
| Recomendação | Ação sugerida determinística |
| Prioridade | critica / alta / media / baixa |
| Link | Rota Analytics/área relacionada |

## Alertas executivos (enriquecidos)

- impacto financeiro
- gravidade
- urgência
- categoria
- responsável
- prazo

## Relatório

`ExecutiveReportDoc.markdown` exportável (botão Download na UI).

## Suite

`npm run test:phase30-decision-center` → **12 PASS / 0 FAIL**  
`npm run test:phase30-intelligence` → **9 PASS / 0 FAIL**
