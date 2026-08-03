# Sprint 30.6 — KPI Health

Fonte: `buildKpiHealth` em `lib/analytics/decision-center/compose.ts`.

## Níveis

| Nível | Uso |
|-------|-----|
| Excelente | tendência favorável forte / meta batida |
| Bom | estável ou leve melhora |
| Atenção | deterioração moderada |
| Crítico | alerta/queda severa |

## Por indicador

Mostra: motivo, hint de histórico, tendência, delta%, valor formatado.

Vazio/indisponível → não classifica (não inventa saúde).

## Suite

`npm run test:phase30-kpi-health` → **4 PASS / 0 FAIL**
