# Business Intelligence Engine — Sprint 11.2

Camada determinística que **explica o contexto do negócio** a partir dos indicadores já carregados no Dashboard Executivo.

Responde automaticamente:

1. O que aconteceu?
2. Por que aconteceu?
3. Onde aconteceu?
4. Qual impacto?
5. O que fazer agora?

## Princípios

- Funções puras em `lib/business-intelligence/`
- Consome exclusivamente `CommercialPanelData` (via `toExecutiveIntelligenceInput`)
- Zero fetch / loader / RPC / mock / IA externa
- Zero alteração de banco, SQL, DRE, Fluxo, metas, projeções ou CRUD
- Nenhuma regra de negócio dentro de componentes React
- Nunca inventa dados nem afirma sem suporte factual
- Confiança baixa / poucos dados / sem meta → narrativa adaptada

## Arquitetura

```
CommercialPanelData (já no Dashboard)
        │
        ▼
toExecutiveIntelligenceInput()   ← lib/intelligence (reuso)
        │
        ▼
buildBusinessIntelligence()
   ├─ buildBusinessSummary        → o que aconteceu
   ├─ buildBusinessCause          → por que / causa principal
   ├─ buildBusinessRisks          → impactos / riscos (≤5)
   ├─ buildBusinessOpportunities  → alavancas (≤5, inclui “onde” via centros)
   ├─ buildBusinessPriorities     → o que fazer agora (ranking)
   ├─ buildBusinessKpiExplanations→ tooltips / origem / fatores
   └─ buildMonthOverMonthComparator → comparadoes (arquitetura)
        │
        ▼
BusinessInsightsPanel (UI)
```

### Arquivos

| Arquivo | Responsabilidade |
|---------|------------------|
| `types.ts` | Contratos de saída |
| `business-summary.ts` | Headline + resumo + status + tom |
| `business-causes.ts` | Principal causa com confiança e métricas |
| `business-risks.ts` | Até 5 riscos por severidade |
| `business-opportunities.ts` | Até 5 oportunidades |
| `business-priorities.ts` | Ranking Alta → Média → Baixa (dedupe) |
| `kpi-explanations.ts` | Explicação estática dos KPIs |
| `comparators.ts` | Mês anterior ativo; resto tipado/unavailable |
| `business-diagnosis.ts` | Orquestração |
| `index.ts` | Barrel público |

UI em `components/executive/intelligence/`:

- `BusinessSummaryCard`
- `BusinessCauseCard`
- `BusinessRiskCard`
- `BusinessOpportunityCard`
- `BusinessPriorityCard`
- `BusinessInsightsPanel`

## Ordem no Dashboard

```
Hero
→ Inteligência Executiva (11.1)
→ Inteligência de Negócio (11.2)
→ KPIs (hints/tooltips BI)
→ Performance
→ Gráficos
→ Heatmap
→ Rankings
```

## Algoritmos

### Summary

Narrativa condicionada (sem frases genéricas):

- Período futuro / sem meta / baixa confiança
- Meta atingida / recuperação (tendência crescente + ritmo baixo)
- Ritmo crítico / crescimento vs ritmo / padrão no ritmo

### Causas

Candidatos ponderados (maior peso vence):

| Causa | Gatilho |
|-------|---------|
| Ritmo abaixo da meta | `diferencaRitmoPp` ≤ faixas de atenção/crítico |
| Ticket em queda | variação ≤ faixa de queda |
| Crescimento negativo | crescimento ≤ 0 (faixa) |
| Poucos dias/vendas | amostra pequena |
| Receita acumulada baixa | necessário/dia ≫ média útil |
| Sem meta / período futuro | estados especiais |

### Riscos (≤5)

Ordenados Alta → Média → Baixa. Exemplos:

- Projeção abaixo da meta (gap projetado)
- Ritmo crítico
- Confiança baixa
- Ticket em queda / tendência decrescente
- Ticket estável (risco baixo informativo)

### Oportunidades (≤5)

Só com suporte:

- Elevar média diária útil (delta necessário − média)
- Proteger ganho de ticket
- Tendência crescente
- Subir probabilidade via ritmo
- Reforçar centro líder (`panel.centros`)
- Cadastrar meta (quando ausente)

### Prioridades

Deduplicação por título. Fonte:

1. Ação executiva (11.1)
2. Riscos alta/média
3. Oportunidades chave (média diária, centro, meta)
4. Fallback de acompanhamento

Ordenação: Alta → Média → Baixa.

## Explicação dos KPIs

Cada chave (`receita`, `meta`, `atingimento`, `projecao`, `gap`, `necessario`, `ritmo`, `probabilidade`, `ticket`, `confianca`) expõe:

- `tooltip` / `explanation` / `origin` / `factors`

Consumidos pelos hints do `ExecutiveKpiGrid` (sem alterar fórmulas).

## Comparadores

| Dimensão | Status |
|----------|--------|
| `mes_anterior` | Implementado (crescimento + ticket do payload) |
| `semana` / `trimestre` / `ano` / `centro` / `filial` | Arquitetura tipada; `available: false` |

Não há UI de seletor nesta sprint — só a API.

## Limitações

- Não recalcula projeção, DRE ou ticket
- Não gera causa “onde” inventada: só usa centros já no painel
- Não cria comparativos sem payload
- Baixa confiança deve aparecer na narrativa e nos riscos
- Camada 11.1 (score/saúde/insights) permanece independente e intacta

## Performance

- Pure functions em memória
- Um `buildBusinessIntelligence` por render do bloco premium
- Zero Suspense/fetch adicional
