#!/usr/bin/env node
/**
 * Sprint 30.6 — Executive Intelligence brief.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildExecutiveBrief } from "../lib/analytics/decision-center/compose.ts";

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

console.log("Phase 30.6 — intelligence\n");

const fixture = {
  kpis: [],
  metrics: [
    {
      definitionId: "fin.receita_liquida",
      name: "Receita líquida",
      value: 120,
      formatted: "120",
      availability: "available",
    },
  ],
  comparisons: [
    {
      definitionId: "fin.receita_liquida",
      current: 120,
      previous: 100,
      delta: 20,
      deltaPercent: 0.2,
      trend: "up",
      tone: "positive",
      polarity: "higher_is_better",
      explanation: "Receita +20% vs período anterior.",
    },
    {
      definitionId: "fin.ebitda",
      current: 10,
      previous: 20,
      delta: -10,
      deltaPercent: -0.5,
      trend: "down",
      tone: "negative",
      polarity: "higher_is_better",
      explanation: "EBITDA -50%.",
    },
  ],
  alerts: [
    {
      id: "a1",
      dedupeKey: "a1",
      title: "EBITDA negativo",
      description: "EBITDA crítico",
      severity: "critical",
      impact: -5,
      relatedMetricIds: ["fin.ebitda"],
      recommendation: "Revisar despesas",
      responsibleHint: "Financeiro",
    },
  ],
  insights: [],
  trends: [],
  targets: [],
  context: {
    tenantSlug: "demo",
    filters: { period: { label: "Últimos 30 dias", from: "", to: "", preset: "last_30" } },
  },
  updatedAt: "2026-08-02T00:00:00Z",
};

const brief = buildExecutiveBrief(fixture);
check("maior crescimento", brief.biggestGrowth?.metricId === "fin.receita_liquida");
check("melhorou length", brief.improved.length >= 1);
check("piorou length", brief.worsened.length >= 1);
check("risco do alerta", brief.biggestRisk != null);
check("próxima ação", brief.nextAction?.priority === "critica");
check("não inventa empty false", brief.empty === false);

check("UI decision center", existsSync(resolve("components/analytics/decision-center/decision-center-view.tsx")));
const ui = readFileSync(resolve("components/analytics/decision-center/decision-center-view.tsx"), "utf8");
check("sem IA generativa copy", /sem IA generativa/i.test(ui));
check("orchestrator wire", /composeDecisionCenterPack/.test(readFileSync(resolve("lib/analytics/analytics-orchestrator.ts"), "utf8")));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
