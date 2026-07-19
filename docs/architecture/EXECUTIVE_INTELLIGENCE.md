# Executive Intelligence — Sprint 11.1

Camada determinística que interpreta indicadores **já carregados** no Dashboard Executivo.

## Princípios

- Funções puras em `lib/intelligence/`
- Zero fetch / loader / RPC novos
- Zero IA externa / mock
- Zero alteração de DRE, Fluxo, metas, projeções ou filtros
- UI só consome o resultado tipado

## Arquitetura

```
CommercialPanelData (já no Dashboard)
        │
        ▼
toExecutiveIntelligenceInput()
        │
        ▼
buildExecutiveIntelligence()
   ├─ buildExecutiveScore
   ├─ buildExecutiveHealth
   ├─ buildExecutiveInsights
   ├─ buildExecutiveAction
   ├─ buildExecutiveDiagnosis
   └─ buildExecutiveTimeline
        │
        ▼
ExecutiveIntelligenceSection (UI)
```

Arquivos:

| Arquivo | Função |
|---------|--------|
| `types.ts` | Contratos de entrada/saída |
| `thresholds.ts` | Pesos e faixas |
| `executive-score.ts` | Score 0–100 |
| `executive-health.ts` | Saúde comercial |
| `executive-insights.ts` | 3–6 insights |
| `executive-actions.ts` | Uma próxima ação |
| `executive-diagnosis.ts` | Resumo + causa |
| `executive-timeline.ts` | Marcos do mês |
| `index.ts` | Orquestração + mapper |

A inteligência operacional legada (`health-score.ts`, `alerts/*`) permanece intacta e separada.

## Entrada

Campos derivados de `CommercialPanelData.projecao` + tendência/confiança/probabilidade/ticket — ver `ExecutiveIntelligenceInput`.

## Pesos do score (100 pts)

| Fator | Peso |
|-------|------|
| Projeção vs meta | 25 |
| Ritmo vs esperado | 20 |
| Atingimento | 15 |
| Tendência | 15 |
| Probabilidade | 15 |
| Crescimento | 10 |

### Faixas

| Score | Status |
|-------|--------|
| 0–39 | Crítico |
| 40–59 | Atenção |
| 60–79 | Bom |
| 80–100 | Excelente |

### Estados especiais

- **Sem meta:** score `null`, status `sem_meta` (não penaliza como crítico)
- **Período futuro:** status `periodo_futuro`
- **Baixa confiança:** reduz excelência artificial; pode marcar `dados_insuficientes`
- **Mês encerrado:** usa realizado/projeção finais na narrativa

## Saúde comercial

Reutiliza o score numérico com **razão própria** (ritmo + projeção) e métricas de apoio (atingimento, projeção, confiança).

## Insights

Categorias: `critical` → `important` → `positive` → `informative`  
Máximo: **6** (`EXECUTIVE_INSIGHTS_MAX`)  
Ids únicos evitam repetir o mesmo problema.

Regras cobertas: ritmo crítico/atenção, projeção abaixo, meta atingida, probabilidade alta, tendência, ticket, crescimento, confiança baixa, poucos dados, necessário/dia muito acima, sem meta, período futuro.

## Próxima ação (única)

Prioridade:

1. Sem meta → cadastrar  
2. Período futuro → preparar  
3. Meta atingida → proteger ticket  
4. Ritmo crítico  
5. Necessário/dia ≫ média  
6. Tendência decrescente  
7. Ticket em queda  
8. Confiança baixa  
9. Manter ritmo / acelerar  

## Diagnóstico

`summary` + `findings` + `primaryCause` + `conclusion`  
Com baixa confiança, evita conclusões absolutas.

## Timeline

Milestones apenas com dados existentes: início, hoje/fechamento, meta esperada até hoje, realizado, projeção de fechamento, fim do mês.

## UI

`components/executive/intelligence/*`  
Integração em `dashboard-streaming.tsx` **após o Hero**, antes dos KPIs.  
Insights comerciais duplicados foram removidos do fluxo principal (a inteligência passa a ser a fonte).

## Limitações

- Não usa concentração de ranking salvo se vier no payload (não inventa)
- Não recalcula projeção/meta
- Não há framework de testes no projeto — testes unitários ficam pendentes para quando houver runner
- Score e saúde compartilham base numérica, mas narrativas são distintas

## Exemplos

**Sem meta:** score/saúde informativos; ação = cadastrar meta.  
**Ritmo -30 p.p.:** insight critical + ação para elevar média diária.  
**Meta 100%+:** insight positive + ação de proteção de ticket.

## Próximos passos

- Testes unitários quando houver runner
- Fase 2: correlacionar rankings/centros se o payload expandir
- Contador animado client opcional no score
