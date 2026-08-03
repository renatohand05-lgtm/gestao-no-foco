#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildDecisionItems,
  composeDecisionCenterPack,
  enrichAlerts,
  buildExecutiveReport,
  buildExecutiveBrief,
} from "../lib/analytics/decision-center/compose.ts";

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

console.log("Phase 30.6 — decision-center\n");

const bundle = {
  kpis: [],
  metrics: [],
  comparisons: [
    {
      definitionId: "fin.receita_liquida",
      current: 50,
      previous: 100,
      delta: -50,
      deltaPercent: -0.5,
      trend: "down",
      tone: "negative",
      polarity: "higher_is_better",
      explanation: "Receita caiu pela metade.",
    },
  ],
  alerts: [
    {
      id: "a1",
      dedupeKey: "a1",
      title: "Caixa apertado",
      description: "Saldo baixo",
      severity: "attention",
      impact: 1000,
      relatedMetricIds: ["fin.saldo_consolidado"],
      recommendation: "Revisar fluxo de caixa",
      responsibleHint: "Financeiro",
    },
  ],
  insights: [],
  trends: [],
  targets: [],
  context: {
    tenantSlug: "demo",
    filters: { period: { label: "Trimestre", from: "", to: "", preset: "quarter" } },
  },
  updatedAt: "2026-08-02T12:00:00Z",
};

const decisions = buildDecisionItems(bundle);
check("decisão do alerta", decisions.some((d) => d.problem === "Caixa apertado"));
check("campos obrigatórios", decisions.every((d) => d.impact && d.evidence && d.recommendation && d.href && d.priority));

const alerts = enrichAlerts(bundle);
check("gravidade", alerts[0]?.gravity === "alta");
check("urgência", alerts[0]?.urgency === "alta");
check("prazo", Boolean(alerts[0]?.deadline));
check("impacto financeiro", alerts[0]?.financialImpact === 1000);

const pack = composeDecisionCenterPack(bundle);
check("pack tem brief", Boolean(pack.brief));
check("pack tem report", Boolean(pack.report.markdown));
check("report markdown título", /Relatório Executivo/.test(pack.report.markdown));

const brief = buildExecutiveBrief(bundle);
const report = buildExecutiveReport(bundle, brief, decisions);
check("exportável markdown", report.markdown.includes("## Resumo"));

check("UI", existsSync(resolve("components/analytics/decision-center/decision-center-view.tsx")));
const dash = readFileSync(resolve("components/analytics/executive-analytics-dashboard.tsx"), "utf8");
check("dashboard monta DecisionCenterView", /DecisionCenterView/.test(dash));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
