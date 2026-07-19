# Executive Intelligence Presentation Layer

Sprint 13.9 — apresentação, narrativa e prioridade visual.

## Escopo

Camada **somente de apresentação**. Não cria motores, cálculos, loaders, fetches, RPCs ou dados simulados.

Toda frase, score, insight, risco, oportunidade, ação e confiança exibidos vêm de payloads já produzidos por:

- Business Intelligence (`BusinessSummary`, risks, opportunities, causes, KPI explanations, comparator)
- Executive Intelligence (score, health, insights, diagnosis, action)
- Action Center / Action Plan / Prediction / Timeline / Copilot
- Commercial panel (`confianca`, `confianca_motivo`, projeção, status)
- Dashboard primary (comparisons / KPIs)

## Regras de apresentação

1. Máximo duas frases no resumo executivo (`headline` + `executiveSummary`).
2. Baixa confiança: destacar motivo existente; sem conclusão forte.
3. Prioridade visual = classificação já existente (critico / atenção / info).
4. Impacto / ganho / esforço só quando o campo já existir no tipo.
5. Progressive disclosure para metodologia, métricas de suporte e recomendações longas.
6. Sem zeros falsos: métricas ausentes → ocultar ou “Não disponível”.

## Composição da narrativa

`composeExecutiveNarrative` (`lib/executive-presentation/`) apenas:

- copia `headline` / `executiveSummary`;
- mapeia `BusinessStatus` → contexto / prioridade visual;
- marca baixa confiança quando `confianca === "baixa"` ou status `dados_insuficientes` / `periodo_futuro`.

**Não recalcula** atingimento, gap, score ou projeções.

## Níveis de prioridade (UI)

| UI | Origem |
|----|--------|
| Crítico | status `critico`, severity alta, insight `critical`, Action CRITICA |
| Alta | atenção / recuperação / important / ALTA |
| Média | no ritmo / excelente / positive / oportunidade |
| Informativo | demais |

Prioridade percebida por posição (Hero), tamanho (Action Center), badge e tipografia — não só cor.

## Narrativa do preset CEO

Ordem padrão já no Layout Engine:

1. Hero (+ narrativa BI embutida)
2. KPIs
3. Action Center (próxima ação)
4. Performance
5. Business (riscos / oportunidades)
6. Timeline → Heatmap → Rankings → Prediction → Monthly → Daily
7. Intelligence / Copilot / Action Plan (ocultos no CEO por padrão; personalização preservada)

## Progressive disclosure

- `ExecutiveDisclosure` (details/summary)
- Tooltips de confiança
- Recomendação de insight sob “Ver detalhes”
- Comparator note no painel BI

## Estados insuficientes

| Situação | Comportamento |
|----------|----------------|
| Sem meta / poucos dados / futuro | contexto informativo + note de confiança |
| Sem risco/oportunidade | painéis omitidos no Hero (sem placeholders vazios) |
| Sem vendas | Empty state existente no stream |
| Sem período anterior | comparação/KPI não inventa variação |

## Componentes

`components/executive/presentation/`

- ExecutiveSummary
- ExecutiveInsightView / Grid
- ExecutiveEvidence / Impact / Confidence
- ExecutivePriorityBadge
- ExecutiveDisclosure
- ExecutiveSourceInfo

## Limites

- Layout / DnD / persistência intactos
- Motores não importam UI; UI não chama banco
- CTA Action Center: label preferido de `intelligence.action.actionLabel` (campo já existente), sem alterar o engine

## Confirmação

Nenhum cálculo novo. Nenhum KPI novo. Nenhum dado inventado.
