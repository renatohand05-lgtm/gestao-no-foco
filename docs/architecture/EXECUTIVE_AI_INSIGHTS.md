# Executive AI Insights — Deterministic Intelligence Layer (Sprint 13.14)

Camada de **composição determinística** de insights executivos. Sem OpenAI, LLM, APIs externas, mocks ou texto aleatório.

## Objetivo

Responder com evidência já existente:

1. o que está acontecendo;
2. por que importa;
3. qual o impacto;
4. o que exige atenção;
5. qual ação tomar primeiro.

## Auditoria inicial (resumo)

| Fonte | Já expõe | Problema |
| --- | --- | --- |
| Business Intelligence | summary, cause, risks, opportunities, priorities | Textos de risco/projeção repetidos |
| Executive Intelligence | score, health, insights, action, diagnosis | Mesmos temas de ritmo/projeção |
| Prediction | summary, recommendation | Headline de gap repetida |
| Action Center | decision + CTA | Pode ecoar o mesmo tema |
| Timeline | eventos compostos | Reemite EI/BI/Prediction |
| Presentation 13.9 | narrative no Hero | Não deduplicava painel de negócio |

**Decisão:** nova composição sob o slot `business` (sem novo bloco de Layout Engine / sem redesenhar Hero/KPIs). BI original permanece em disclosure.

## Arquitetura

```
lib/executive-insights/
  types · rules · confidence · priority · ranking · deduplication · mappers · formatters · engine

composeExecutiveInsights({ business, intelligence, predictions, action, confidence… })
  → ExecutiveInsightsPack
```

- Zero fetch / loader / RPC / banco
- Zero recálculo financeiro
- Não altera motores existentes

## Estrutura do insight

Campos: id, tipo, categoria, prioridade, severidade, título, resumo, evidência, impacto, recomendação, CTA, confiança (+ motivo), fontes, regra, período, métricas, horizonte, status, themeKey.

## Regras / temas

`INSIGHT_THEME_RULES` agrupa mensagens semanticamente (`projecao_abaixo_meta`, `ritmo_abaixo`, `meta_atingida`, `poucos_dados`, …) usando **apenas** textos já produzidos pelos motores. Thresholds novos **não** são inventados.

## Confiança

Faixas: `baixa | media | alta` (já existentes no painel).

Na consolidação, prevalece a **menor** confiança. Com confiança baixa:

- conclusões fortes viram **informational**;
- CTA não é forçado.

## Ranking e Top

Ordem: criticidade → impacto textual existente → ação disponível → confiança → id estável.

Top UI: 1 prioridade · ≤2 riscos · ≤2 oportunidades · ≤2 positivos · ≤2 informativos · demais em disclosure.

## Deduplicação

Por `themeKey`. Mantém maior prioridade, agrega fontes, preserva evidência/impacto mais longos.

## Integração Dashboard

- Slot `business` → `ExecutiveInsightsSection`
- Design Freeze: Hero / KPI Grid / Layout Engine / presets / DnD **intactos**
- BI detalhado em “Detalhamento das fontes”

## Limites

- Não inventa causas, valores, riscos ou percentuais
- Não é IA generativa
- Se não houver ação confiável, mostra só diagnóstico

## Performance

Composição síncrona leve no mesmo `PremiumExecutiveBlock` — sem fetch extra, sem Client Component da página.
