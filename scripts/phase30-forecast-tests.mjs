#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildForecastPanel } from "../lib/analytics/decision-center/compose.ts";
import { projectFromTrend } from "../lib/analytics/core/trend-engine.ts";

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

console.log("Phase 30.6 — forecast\n");

const points = [
  { period: "2026-05", value: 100 },
  { period: "2026-06", value: 110 },
  { period: "2026-07", value: 120 },
];
const proj = projectFromTrend({
  definitionId: "fin.receita_liquida",
  points,
  horizonDays: 30,
  scenario: "base",
});
check("projeção não nula", proj.projected != null);
check("metodologia", /tendência|média|linear|determin/i.test(proj.methodology) || proj.methodology.length > 0);
check("limitações presentes", Array.isArray(proj.limitations));

const panel = buildForecastPanel({
  kpis: [],
  metrics: [],
  comparisons: [],
  alerts: [],
  insights: [],
  trends: [
    {
      definitionId: "fin.receita_liquida",
      points,
      movingAverage: 110,
      linearSlope: 10,
      methodology: "linear",
      confidence: "medium",
      dataPoints: 3,
      limitations: [],
      updatedAt: "2026-08-02",
    },
  ],
  targets: [],
  context: {
    tenantSlug: "demo",
    filters: { period: { label: "30d", from: "", to: "", preset: "last_30" } },
  },
});
check("receita prevista label", panel.some((p) => /Receita prevista/i.test(p.label)));
check("sem certeza absoluta", panel.every((p) => p.limitations || p.confidence));

const src = readFileSync(resolve("lib/analytics/decision-center/compose.ts"), "utf8");
check("usa projectFromTrend", /projectFromTrend/.test(src));
check("sem openai", !/openai|gpt-4|llm/i.test(src));
check("trend engine", existsSync(resolve("lib/analytics/core/trend-engine.ts")));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
