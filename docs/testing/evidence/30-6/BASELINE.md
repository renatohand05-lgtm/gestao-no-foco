# Sprint 30.6 — Baseline Executive Intelligence & Decision Center

**Data:** 2026-08-02  
**HEAD base:** `3e36267` (+ trabalho local 30.5 CRM Premium ainda não commitado)  
**Escopo:** elevar Analytics → Centro de Inteligência Executiva determinística.

---

## Restrições

- Sem IA generativa; regras, estatísticas, tendências e previsões matemáticas.
- Não alterar Financeiro, CRM, DRE, RBAC, Estoque, Compras, Onboarding, Cockpit.
- Sem commit/push/deploy/SQL remoto.

---

## Inventário atual

| Superfície | Estado |
|------------|--------|
| `/analytics/**` | Bundle com KPIs, comparisons, alerts, insights, trends, targets |
| `lib/analytics` | Engines de métrica, trend (`projectFromTrend`), alertas |
| `lib/executive-decision-center` | Engine EDC no dashboard (não é a home Analytics) |
| Insights provider | Determinístico via `resolveExecutiveProvider` |

---

## Gaps → 30.6

1. Brief executivo (melhorou/piorou/risco/oportunidade/próxima ação) na Analytics.
2. Painel de tendências por período com direção explícita.
3. Decision Center na Analytics (problema → evidência → ação).
4. Forecast panel (receita/lucro/caixa/meta/conversão) matemático.
5. KPI Health (excelente/bom/atenção/crítico).
6. Alertas com gravidade/urgência/prazo/categoria.
7. Relatório executivo exportável.
8. Perf Analytics cold ≤2s / warm ≤1s.

---

## Alvos

| Métrica | Alvo |
|---------|------|
| Cold | ≤ 2000 ms |
| Warm | ≤ 1000 ms |
