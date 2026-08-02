# Fase 29.4 — Inteligência Executiva e Insights Enterprise

**Sprint:** 29.4  
**Pré-requisito:** Sprints 29.0–29.3  
**Escopo:** camada de insights / sinais / scores nomeados / recomendações — **sem** DB, RLS, RBAC, fórmulas financeiras ou mudança de KPIs

---

## Princípios

1. **Não inventar 4º motor de score** — reutilizar Executive AI (18.5) e Business Health (20.2)
2. **Separar** cálculo (engines canônicos) → insight (sinais/heurísticas) → apresentação (UI)
3. **Sem I/O** no package `lib/executive-intelligence` (só séries e resultados já carregados)
4. **Sem LLM** — `ai-hook.ts` prepara contrato futuro com `llmEnabled: false`
5. Evitar colisão de nomes com `buildExecutiveIntelligence` (loaders / commercial EI)

---

## Package `lib/executive-intelligence/`

| Módulo | Papel |
|--------|--------|
| `signals/trend.ts` | crescimento / queda / estável |
| `signals/anomaly.ts` | pico / vale via \|z\| |
| `signals/seasonality.ts` | hint lag-7 |
| `scores.ts` | scores nomeados (saúde, financeiro, comercial, operacional…) |
| `alerts.ts` | indicadores críticos |
| `recommendations.ts` | blueprints reutilizáveis |
| `adapters/from-charts.ts` | DashboardCharts → séries |
| `adapters/from-executive-ai.ts` | diagnósticos → recomendações por domínio |
| `compose.ts` | `composeExecutiveIntelligencePack` |
| `present.ts` | pack → cards de UI |
| `ai-hook.ts` | stub IA futura |
| `index.ts` | API pública intencional |

### Domínios cobertos (via scores + recomendações + séries)

Dashboard · Financeiro · DRE (EBITDA series) · Fluxo de caixa · CRM · Estoque · Ordens (diagnósticos operação)

---

## UI

- `ExecutiveIntelligenceSignalsPanel` no `ExecutiveEnginesShell`
- Cards aditivos em `buildPremiumInsights` quando há `charts`
- Props `charts` opcionais propagadas (sem novo fetch)

---

## Explicitamente fora / backlog 29.5

- Remover aliases `@deprecated` após migração total → ~~29.6~~
- Unificar nomes `buildExecutiveIntelligence` → ~~29.6~~
- Unificar `/inteligencia` GF copilot com a fachada (sem mudar comportamento)
- Remover engines comerciais se produto confirmar obsolescência
- Dívida UX listada em 29.3
- Gate `executive-cockpit-premium` legado

---

## Gate

```bash
npm run lint
npm run build
npm run test:phase29
npm run test:release-candidate
```

Evidências: `docs/testing/evidence/29-4/`
