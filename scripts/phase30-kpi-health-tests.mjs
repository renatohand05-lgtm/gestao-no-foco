#!/usr/bin/env node
import { buildKpiHealth } from "../lib/analytics/decision-center/compose.ts";

let pass = 0;
let fail = 0;
function check(name, cond) {
  if (cond) {
    pass += 1;
    console.log("  PASS", name);
  } else {
    fail += 1;
    console.log("  FAIL", name);
  }
}

console.log("Phase 30.6 — kpi-health\n");

const health = buildKpiHealth({
  kpis: [
    {
      definitionId: "fin.ebitda",
      name: "EBITDA",
      value: -10,
      formatted: "-10",
      availability: "available",
    },
    {
      definitionId: "vendas.faturamento",
      name: "Faturamento",
      value: 200,
      formatted: "200",
      availability: "available",
    },
  ],
  metrics: [],
  comparisons: [
    {
      definitionId: "vendas.faturamento",
      current: 200,
      previous: 100,
      delta: 100,
      deltaPercent: 1,
      trend: "up",
      tone: "positive",
      polarity: "higher_is_better",
      explanation: "Dobrou",
    },
  ],
  alerts: [
    {
      id: "c1",
      dedupeKey: "c1",
      title: "EBITDA negativo",
      description: "x",
      severity: "critical",
      impact: -10,
      relatedMetricIds: ["fin.ebitda"],
      recommendation: "y",
      responsibleHint: "Financeiro",
    },
  ],
  insights: [],
  trends: [],
  targets: [],
  context: {
    tenantSlug: "demo",
    filters: { period: { label: "30d", from: "", to: "", preset: "last_30" } },
  },
});

check("crítico no ebitda", health.find((h) => h.metricId === "fin.ebitda")?.level === "critico");
check("excelente faturamento", health.find((h) => h.metricId === "vendas.faturamento")?.level === "excelente");
check("motivo presente", health.every((h) => h.reason.length > 0));
check("histórico hint", health.every((h) => h.historyHint.length > 0));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
