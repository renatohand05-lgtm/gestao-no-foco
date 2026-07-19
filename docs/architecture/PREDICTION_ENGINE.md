# Prediction & Scenario Engine — Sprint 11.3

Camada determinística de **previsão e simulação de cenários** para o Dashboard Executivo.

Responde:

- O que acontece se o ritmo atual continuar?
- Quanto precisa crescer para atingir a meta?
- Qual impacto de aumentar a média diária / ticket?
- Qual cenário oferece melhor relação ganho × esforço?
- Qual cenário apresenta maior risco?

## Princípios

- Funções puras em `lib/predictions/`
- Consome apenas `CommercialPanelData` já carregado
- Zero fetch / loader / RPC / mock / IA externa
- Zero alteração de banco, DRE, Fluxo, metas CRUD ou regras financeiras
- Reusa `resolveProbabilidade` do painel para estimativas simuladas
- Cenário base usa a probabilidade **oficial** já calculada (sem recalcular)

## Arquitetura

```
CommercialPanelData
        │
        ▼
toPredictionInput()
        │
        ▼
buildPredictionEngine()
   ├─ buildBaseScenario              → ritmo atual
   ├─ buildRequiredForMeta           → necessário para a meta
   ├─ buildDefaultScenarios (3–5)    → cards comparáveis
   ├─ recommendBestScenario          → destaque
   └─ runCustomSimulations           → simulador local (UI)
        │
        ▼
PredictionSection (UI)
```

### Arquivos

| Arquivo | Função |
|---------|--------|
| `types.ts` | Contratos |
| `thresholds.ts` | Faixas de viabilidade / esforço / risco |
| `confidence.ts` | Confiança e viabilidade |
| `projection-math.ts` | Helpers (gap, attainment, vendas restantes) |
| `revenue-simulator.ts` | Base + recuperação de dias |
| `daily-target-simulator.ts` | Média diária |
| `ticket-simulator.ts` | Ticket médio |
| `required-for-meta.ts` | Meta necessária |
| `scenario-builder.ts` | 3–5 cenários padrão |
| `scenario-comparator.ts` | Esforço / impacto / risco 0–100 |
| `scenario-recommendation.ts` | Melhor cenário |
| `prediction-engine.ts` | Orquestração |
| `index.ts` | Barrel |

## Premissas e fórmulas

### Base (ritmo atual)

```
projectedRevenue = periodoEncerrado ? realizado : projecaoDiasUteis
projectedAttainment = projectedRevenue / meta * 100
projectedGap = meta − projectedRevenue
probability = probabilidade oficial do painel
```

### Média diária

```
newDaily = media + Δabs   OU   media × (1 + Δ% / 100)   (≥ 0)
projected = realizado + newDaily × diasUteisRestantes
increment = (newDaily − media) × diasUteisRestantes
```

### Ticket (volume constante)

```
remainingSales ≈ (vendas / diasDecorridos) × diasRestantes
               OU (media × diasRestantes) / ticket   se não houver base
newTicket ≥ 0
estimatedRevenue = realizado + remainingSales × newTicket
```

### Recuperação de N dias

```
dailyTarget = necessarioDiaUtil OU media
liftedDaily = dailyTarget × (1 + lift% / 100)
projected = realizado
          + liftedDaily × N
          + media × (diasRestantes − N)
```

### Meta necessária

```
requiredDailyAverage = necessario_por_dia_util (painel) OU gap / diasRestantes
requiredDailyGrowth% = (required − media) / media × 100
additionalSales = gap / ticketAtual
requiredTicket = gap / remainingSales   (volume constante)
requiredVolume = remainingSales OU gap / ticket
```

Valores extremos **não são ocultados** — recebem alerta de viabilidade.

## Viabilidade

| Classificação | Critério (crescimento de média \|%\|) |
|---------------|----------------------------------------|
| Viável | ≤ 15% |
| Agressivo | ≤ 50% |
| Improvável | ≤ 150% |
| Impossível | > 150% |
| Dados insuficientes | poucos dias/vendas, futuro, sem meta |

Também considera cobertura `projeção / meta`.

## Esforço / Impacto / Risco (0–100)

**Esforço**

- Base: 5
- Média diária: `\|%\| × 2.2`
- Ticket: `\|%\| × 1.8`
- Recuperação: `dias × 8 + lift% × 1.2`
- Necessário meta: growth% × 2.2 (cap 100)

**Impacto**

- Com gap > 0: `incremento / gap × 100`
- Sem meta: incremento relativo à receita base

**Risco**

- Confiança baixa/média/alta: +35 / +18 / +5
- Viabilidade: +0 / +20 / +40 / +55 / +45
- Incremento negativo: +15

## Recomendação

Score composto:

```
impacto×0.35 + (100−esforço)×0.25 + (100−risco)×0.2
+ confiança×0.1 + proximidade_meta×0.1
− penalidade(viabilidade)
```

Prefere cenários com incremento positivo; avisa se confiança baixa ou viabilidade improvável/impossível.

## Cenários padrão (3–5)

1. Mantendo o ritmo atual  
2. Média diária +10% (se há dias restantes)  
3. Ticket +5% (se há base de vendas)  
4. Recuperar até 3 dias acima da meta diária  
5. Necessário para atingir a meta (se growth ≠ ~10%)

Redundâncias são descartadas.

## UI

`components/executive/predictions/`

- Resumo + recomendação em destaque  
- Cards de cenários  
- Comparador recolhível (`<details>`)  
- Simulador em dialog (local, sem persistência)

Ordem no Dashboard: Intelligence → Business BI → **Predictions** → KPIs → …

## Casos especiais

| Estado | Comportamento |
|--------|----------------|
| Sem meta | Base sem attainment; necessário bloqueado; cenários de lift sem gap |
| Poucos dados | Confiança baixa + viabilidade dados_insuficientes |
| Mês futuro | Previsão informativa |
| Mês encerrado | Projeção = realizado; recuperação impossível no calendário |
| Meta atingida/superada | Necessário = 0; recomendação pode ficar no base |

## Limitações

- Não recalcula DRE, ticket histórico nem séries diárias
- Volatilidade fixa (0.4) nas simulações — a base usa score oficial
- Não persiste parâmetros do simulador
- Não é garantia de fechamento — toda afirmação traz premissa
- Sem runner de testes no projeto nesta sprint (nenhum framework adicionado)

## Performance

- Zero I/O novo  
- Cálculos em memória  
- Simulador client-side com `PredictionInput` serializado (payload leve)
