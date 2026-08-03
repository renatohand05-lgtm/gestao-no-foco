#!/usr/bin/env node
import { buildBusinessInsights } from "../lib/analytics/decision-center/compose.ts";

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

console.log("Phase 30.6 — insights\n");

const insights = buildBusinessInsights({
  kpis: [],
  metrics: [{ definitionId: "fin.receita_liquida", name: "Receita", availability: "available" }],
  comparisons: [
    {
      definitionId: "fin.receita_liquida",
      current: 80,
      previous: 100,
      delta: -20,
      deltaPercent: -0.2,
      trend: "down",
      tone: "negative",
      polarity: "higher_is_better",
      explanation: "Receita caiu 20%.",
    },
  ],
  alerts: [],
  insights: [],
  trends: [],
  targets: [],
  context: {
    tenantSlug: "demo",
    filters: { period: { label: "Mês", from: "", to: "", preset: "month" } },
  },
});

check("receita caiu", insights.some((i) => /Receita caiu/i.test(i.title)));
check("tem evidência", insights.every((i) => i.evidence.length > 0));
check("ruleId", insights[0]?.ruleId === "receita");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
