# Fase 30.6 — Executive Intelligence & Decision Center

## Objetivo

Transformar o módulo **Analytics** em um **Centro de Inteligência Executiva** determinístico: dados reais, regras, estatísticas, tendências e previsões matemáticas — **sem IA generativa**.

## Princípios

- Nunca inventar números ou conclusões sem evidência no bundle.
- Não alterar Financeiro, CRM, DRE, RBAC, Estoque, Compras, Onboarding ou Cockpit.
- Compose puro a partir do bundle Analytics já existente.

## Arquitetura

```
getExecutiveAnalyticsDashboard (RBAC)
  → loadAnalyticsDomainSnapshot (Promise.all + React.cache + TTL 45s)
  → buildExecutiveAnalyticsBundle
       → composeDecisionCenterPack
  → ExecutiveAnalyticsDashboard (+ DecisionCenterView)
```

| Camada | Path |
|--------|------|
| Types / DTOs | `lib/analytics/decision-center/types.ts` |
| Compose | `lib/analytics/decision-center/compose.ts` |
| Orchestrator | `lib/analytics/analytics-orchestrator.ts` |
| Snapshot | `lib/analytics/snapshot-loader.ts` |
| UI | `components/analytics/decision-center/*` |
| Página | `app/(app)/[tenant]/analytics/**` |

## Blocos do Decision Center

1. **Executive Intelligence** — melhorou, piorou, maior crescimento/queda, risco, oportunidade, crítico, saudável, próxima ação (sempre com `evidence`).
2. **Trend Analysis** — linhas por período (hoje/ontem/semana/mês/trimestre/ano) com variação, %, direção.
3. **Business Insights** — regras determinísticas (receita, margem, CMV, conversão, pipeline, estoque, clientes, follow-ups).
4. **Forecast** — `projectFromTrend` / médias históricas; metodologia e limitações explícitas.
5. **Decision Center** — problema · impacto · evidência · recomendação · prioridade · link.
6. **Alertas executivos** — impacto financeiro, gravidade, urgência, categoria, responsável, prazo.
7. **KPI Health** — excelente / bom / atenção / crítico + motivo + tendência.
8. **Comparativos** — dimensões disponíveis no snapshot (empresa, filial, responsável, equipe, segmento, período).
9. **Executive Report** — markdown exportável (resumo, positivos, críticos, ações, riscos, oportunidades).

## Performance

| Técnica | Uso |
|---------|-----|
| `Promise.all` | 8 fatias de domínio em paralelo |
| `React.cache` | Dedup dentro do request |
| TTL 45s (memória processo) | Warm navigation no mesmo worker |
| Lazy dashboard | `ExecutiveAnalyticsDashboardLazy` |
| Skeleton | `analytics/loading.tsx` |

Metas produto: cold ≤ 2s · warm ≤ 1s.

## Testes

- `test:phase30-intelligence`
- `test:phase30-insights`
- `test:phase30-forecast`
- `test:phase30-kpi-health`
- `test:phase30-decision-center`
- `test:homolog-30-6`

## Evidência

`docs/testing/evidence/30-6/`
