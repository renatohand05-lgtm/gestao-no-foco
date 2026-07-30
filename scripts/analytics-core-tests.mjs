#!/usr/bin/env node
/**
 * Fase 23 — Analytics Core tests
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  METRIC_CATALOG,
  analyticsPermissionSatisfied,
  buildAnalyticsAlerts,
  buildComparisons,
  buildExecutiveAnalyticsBundle,
  buildMetricTrend,
  compareMetricValues,
  createDefaultAnalyticsLayout,
  dedupeAlerts,
  getMetricDefinition,
  listAvailableMetrics,
  movingAverage,
  previousPeriodOf,
  projectFromTrend,
  resolveCatalogMetrics,
  resolveExecutiveProvider,
  resolveMetric,
  resolvePeriodPreset,
  deterministicExecutiveProvider,
} from "../lib/analytics/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    pass += 1;
    console.log(`  PASS  ${msg}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${msg}`);
  }
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

console.log("\nAnalytics Core — Fase 23\n");

const files = [
  "lib/analytics/core/metric-types.ts",
  "lib/analytics/core/metric-registry.ts",
  "lib/analytics/core/analytics-engine.ts",
  "lib/analytics/core/filter-engine.ts",
  "lib/analytics/core/comparison-engine.ts",
  "lib/analytics/core/trend-engine.ts",
  "lib/analytics/core/drill-down-engine.ts",
  "lib/analytics/insights/alert-engine.ts",
  "lib/analytics/providers/executive-intelligence-provider.ts",
  "lib/analytics/analytics-orchestrator.ts",
  "lib/analytics/index.ts",
  "scripts/analytics-core-tests.mjs",
];

for (const f of files) {
  assert(existsSync(join(root, f)), `Arquivo: ${f}`);
}

assert(read("package.json").includes("test:analytics-core"), "script test:analytics-core");
assert(METRIC_CATALOG.length >= 40, `Catálogo >= 40 (got ${METRIC_CATALOG.length})`);
assert(
  METRIC_CATALOG.some((m) => m.availability === "unavailable"),
  "Catálogo marca métricas unavailable",
);
assert(getMetricDefinition("clientes.ltv")?.availability === "unavailable", "LTV unavailable");
assert(getMetricDefinition("fin.ebitda")?.availability === "available", "EBITDA available");
assert(
  getMetricDefinition("fin.despesas")?.polarity === "lower_is_better",
  "Despesas lower_is_better",
);

const period = resolvePeriodPreset("last_30");
assert(period.from <= period.to, "Período last_30 válido");
const prev = previousPeriodOf(period);
assert(prev.to < period.from, "Período anterior termina antes do atual");

const upCost = compareMetricValues({
  definitionId: "fin.despesas",
  current: 120,
  previous: 100,
  polarity: "lower_is_better",
});
assert(upCost.tone === "negative", "Aumento de custo = negativo");
const upRev = compareMetricValues({
  definitionId: "fin.receita_bruta",
  current: 120,
  previous: 100,
  polarity: "higher_is_better",
});
assert(upRev.tone === "positive", "Aumento de receita = positivo");

const snap = {
  tenantId: "t1",
  tenantSlug: "demo",
  asOf: "2026-07-29",
  finance: {
    receitaBruta: 100000,
    receitaLiquida: 90000,
    ebitda: 15000,
    margemEbitda: 0.166,
    ebit: 12000,
    lucroLiquido: 8000,
    despesas: 40000,
    cmv: 35000,
    previous: {
      receitaBruta: 90000,
      receitaLiquida: 80000,
      ebitda: 14000,
      margemEbitda: 0.175,
      despesas: 30000,
      cmv: 32000,
    },
    topCentros: [{ id: "cc1", label: "Ops", value: 50000 }],
  },
  cash: {
    entradas: 50000,
    saidas: 40000,
    saldoConsolidado: 25000,
    capitalGiro: 10000,
    necessidadeCaixa: 2000,
    fluxoRealizadoNet: 10000,
    fluxoPrevistoNet: 5000,
    fluxoProjetadoClosing: 20000,
    contasPagar: 8000,
    contasReceber: 12000,
    inadimplencia: 1500,
    riskAlertCount: 1,
  },
  sales: {
    faturamento: 100000,
    quantidade: 40,
    ticketMedio: 2500,
    conversao: 0.35,
    cancelamentos: 2,
    descontos: 500,
    previousFaturamento: 85000,
    bySeller: [{ id: "v1", label: "Ana", value: 40000 }],
  },
  customers: {
    ativos: 200,
    novos: 12,
    recorrentes: 80,
    inativos: 30,
    frequencia: 2.1,
    ticketMedio: 1800,
    receitaPorCliente: 450,
    emRisco: 5,
  },
  operations: {
    quantidade: 50,
    abertas: 10,
    concluidas: 30,
    tempoMedio: 4.5,
    retrabalho: 0.05,
    conversao: 0.7,
    faturamento: 60000,
  },
  inventory: {
    valor: 80000,
    giro: 3.2,
    cobertura: 45,
    ruptura: 3,
    excesso: 12000,
  },
  tax: {
    carga: 9000,
    previsto: 8500,
    impactoCaixa: 9000,
    eficiencia: 0.09,
    oportunidades: 500,
    riscos: 1,
  },
  metas: {
    metaFaturamento: 120000,
    realizadoFaturamento: 100000,
    projecaoFaturamento: 110000,
    attainment: 0.83,
    probabilidadeLabel: "média",
  },
  series: {
    "fin.receita_liquida": [
      { period: "2026-04", value: 70 },
      { period: "2026-05", value: 80 },
      { period: "2026-06", value: 90 },
      { period: "2026-07", value: 100 },
    ],
  },
};

const perms = [
  "analytics.visualizar",
  "analytics.executivo",
  "analytics.financeiro",
  "analytics.vendas",
  "analytics.operacional",
  "analytics.estoque",
  "analytics.tributario",
];

const ebitda = resolveMetric(snap, "fin.ebitda", {
  period,
  filters: { period },
  permissions: perms,
});
assert(ebitda.value === 15000, "Resolve EBITDA da fonte");
assert(ebitda.availability === "available", "EBITDA available");

const ltv = resolveMetric(snap, "clientes.ltv", {
  period,
  filters: { period },
  permissions: perms,
});
assert(ltv.value === null, "LTV sem inventar valor");
assert(ltv.availability === "unavailable", "LTV unavailable");

const denied = resolveMetric(snap, "fin.ebitda", {
  period,
  filters: { period },
  permissions: ["analytics.vendas"],
});
assert(denied.availability === "unavailable", "RBAC bloqueia financeiro");

assert(
  analyticsPermissionSatisfied(["dashboard.financeiro"], "analytics.financeiro"),
  "Compat dashboard.financeiro → analytics.financeiro",
);

const metrics = resolveCatalogMetrics(snap, {
  period,
  filters: { period },
  permissions: perms,
});
assert(metrics.some((m) => m.definitionId === "fin.ebitda" && m.value === 15000), "Catálogo resolve");
assert(
  metrics.every((m) => m.availability !== "available" || m.value != null),
  "Available sempre com valor",
);

const comparisons = buildComparisons(snap, metrics);
assert(comparisons.some((c) => c.definitionId === "fin.despesas" && c.tone === "negative"), "Comparativo despesas");

const trend = buildMetricTrend({
  definitionId: "fin.receita_liquida",
  points: snap.series["fin.receita_liquida"],
  updatedAt: snap.asOf,
});
assert(trend.dataPoints === 4, "Trend data points");
assert(movingAverage(snap.series["fin.receita_liquida"]) != null, "Moving average");
const proj = projectFromTrend({
  definitionId: "fin.receita_liquida",
  points: snap.series["fin.receita_liquida"],
  horizonDays: 30,
  scenario: "base",
});
assert(proj.projected != null, "Projeção base");
assert(proj.methodology.includes("Não é certeza") || proj.limitations.length > 0, "Projeção com limitações");

const alerts = buildAnalyticsAlerts({ snap, metrics, period });
assert(alerts.some((a) => a.kind === undefined || a.title.length > 0), "Alertas gerados");
assert(alerts.every((a) => a.autoApplied === false), "Alertas nunca auto");
assert(alerts.every((a) => a.requiresHumanReview === true), "Alertas revisão humana");
const duped = dedupeAlerts([
  ...alerts,
  ...alerts,
]);
assert(duped.length === alerts.length, "Dedupe de alertas");

const provider = resolveExecutiveProvider();
assert(provider.kind === "deterministic", "Provider default determinístico");
assert(
  provider.label.includes("regras") || provider.label.includes("histórico"),
  "Label sem IA externa fingida",
);

const insights = deterministicExecutiveProvider.explain({
  metrics,
  comparisons,
  alerts,
  context: {
    tenantId: "t1",
    tenantSlug: "demo",
    userId: null,
    permissions: perms,
    filters: { period },
    asOf: snap.asOf,
  },
});
assert(insights.length >= 1, "Insights determinísticos");
assert(insights.every((i) => i.autoExecuted === false), "Insights não executam");

const emptySnap = { tenantId: "t1", tenantSlug: "demo", asOf: "2026-07-29" };
const emptyMetrics = resolveCatalogMetrics(emptySnap, {
  period,
  filters: { period },
  permissions: perms,
});
assert(
  emptyMetrics.filter((m) => m.availability === "available").length === 0,
  "Sem dados ⇒ nenhuma métrica inventada",
);

const bundle = buildExecutiveAnalyticsBundle({
  snap,
  permissions: perms,
  periodPreset: "last_30",
});
assert(bundle.kpis.length > 0, "Bundle KPIs");
assert(bundle.exports.some((e) => e.format === "excel" && e.status === "preparing"), "Excel preparing");
assert(bundle.exports.some((e) => e.format === "pdf" && e.status === "preparing"), "PDF preparing");
assert(createDefaultAnalyticsLayout().widgets.length >= 4, "Layout default");

assert(
  read("lib/analytics/core/metric-registry.ts").includes("lib/financeiro/dre-service"),
  "Fórmulas referenciam fontes",
);
assert(!read("lib/analytics/core/analytics-engine.ts").includes("Math.random"), "Sem random em engine");

assert(listAvailableMetrics().length < METRIC_CATALOG.length, "Available < total (há unavailable)");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
