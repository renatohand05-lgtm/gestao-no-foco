#!/usr/bin/env node
/**
 * Sprint 23.1 — Analytics Corrections / Homologação Fase 23
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  METRIC_CATALOG,
  analyticsPermissionSatisfied,
  assertPeriodPreset,
  buildAnalyticsAlerts,
  buildAnalyticsCsv,
  buildComparisons,
  buildDrillDown,
  buildExecutiveAnalyticsBundle,
  compareMetricValues,
  csvEscapeCell,
  dedupeAlerts,
  getMetricDefinition,
  isValidIsoDate,
  resolveCatalogMetrics,
  resolveExecutiveProvider,
  resolveMetric,
  resolvePeriodPreset,
  sanitizeMetricFilter,
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

console.log("\nAnalytics Corrections — Sprint 23.1\n");

assert(existsSync(join(root, "scripts/analytics-corrections-tests.mjs")), "Arquivo corrections");
assert(read("package.json").includes("test:analytics-corrections"), "script corrections");

assert(getMetricDefinition("fin.pmr")?.availability === "unavailable", "PMR unavailable");
assert(getMetricDefinition("fin.pmp")?.availability === "unavailable", "PMP unavailable");
assert(getMetricDefinition("clientes.ltv")?.availability === "unavailable", "LTV unavailable");
assert(getMetricDefinition("estoque.curva_abc")?.availability === "unavailable", "Curva ABC unavailable");

const period = resolvePeriodPreset("last_30");
const perms = [
  "analytics.visualizar",
  "analytics.executivo",
  "analytics.financeiro",
  "analytics.vendas",
  "analytics.operacional",
  "analytics.estoque",
  "analytics.tributario",
];

const emptySnap = { tenantId: "t-a", tenantSlug: "a", asOf: "2026-07-29" };
const emptyMetrics = resolveCatalogMetrics(emptySnap, {
  period,
  filters: { period },
  permissions: perms,
});
assert(
  emptyMetrics.every((m) => m.availability !== "available" || m.value != null),
  "Sem dados ⇒ sem métrica inventada",
);
assert(
  emptyMetrics.some((m) => m.formatted === "Dados indisponíveis"),
  "Label Dados indisponíveis",
);

const nanCmp = compareMetricValues({
  definitionId: "x",
  current: Number.NaN,
  previous: 10,
  polarity: "higher_is_better",
});
assert(nanCmp.delta == null && nanCmp.deltaPercent == null, "NaN → comparativo nulo");
const infCmp = compareMetricValues({
  definitionId: "x",
  current: Number.POSITIVE_INFINITY,
  previous: 1,
  polarity: "higher_is_better",
});
assert(infCmp.delta == null, "Infinity → comparativo nulo");
const zeroPrev = compareMetricValues({
  definitionId: "x",
  current: 10,
  previous: 0,
  polarity: "higher_is_better",
});
assert(zeroPrev.deltaPercent == null, "Divisão por zero → pct nulo");
assert(
  compareMetricValues({
    definitionId: "x",
    current: 10,
    previous: null,
    polarity: "higher_is_better",
  }).explanation.includes("indisponível"),
  "Período sem comparação",
);

assert(
  compareMetricValues({
    definitionId: "fin.despesas",
    current: 120,
    previous: 100,
    polarity: "lower_is_better",
  }).tone === "negative",
  "Custo sobe = negativo",
);
assert(
  compareMetricValues({
    definitionId: "fin.receita_bruta",
    current: 120,
    previous: 100,
    polarity: "higher_is_better",
  }).tone === "positive",
  "Receita sobe = positivo",
);

assert(assertPeriodPreset("bogus") === "last_30", "Preset inválido → last_30");
assert(assertPeriodPreset("last_90") === "last_90", "Preset last_90");
assert(isValidIsoDate("2026-07-29") === true, "ISO date válida");
assert(isValidIsoDate("29/07/2026") === false, "ISO date inválida");
assert(
  sanitizeMetricFilter({
    period,
    raw: { empresaIds: ["evil-other-tenant"], period },
    authorizedEmpresaIds: null,
  }).empresaIds === undefined,
  "Filtro empresa manipulado no client ignorado sem allow-list",
);
assert(
  sanitizeMetricFilter({
    period,
    raw: { empresaIds: ["e1", "evil"], period },
    authorizedEmpresaIds: ["e1"],
  }).empresaIds?.[0] === "e1",
  "Filtro empresa intersecta allow-list",
);

assert(
  !analyticsPermissionSatisfied(["analytics.vendas"], "analytics.financeiro"),
  "RBAC: vendas não implica financeiro",
);
assert(
  analyticsPermissionSatisfied(["dashboard.financeiro"], "analytics.financeiro"),
  "Compat dashboard.financeiro",
);
assert(
  resolveMetric(
    { tenantId: "t-a", tenantSlug: "a", asOf: "2026-07-29", finance: { ebitda: 1 } },
    "fin.ebitda",
    { period, filters: { period }, permissions: ["analytics.vendas"] },
  ).availability === "unavailable",
  "RBAC bloqueia métrica financeira",
);

const snapA = {
  tenantId: "t-a",
  tenantSlug: "a",
  asOf: "2026-07-29",
  finance: { ebitda: 100, receitaLiquida: 500, previous: { ebitda: 80 } },
};
const mA = resolveMetric(snapA, "fin.ebitda", {
  period,
  filters: { period },
  permissions: perms,
});
assert(mA.tenantId === "t-a" && mA.value === 100, "Tenant A isolation no resultado");
assert(mA.tenantId !== "t-b", "Cross-tenant: resultado A ≠ tenant B");

const partial = {
  tenantId: "t-a",
  tenantSlug: "a",
  asOf: "2026-07-29",
  finance: { ebitda: -10, receitaLiquida: 100, previous: { margemEbitda: 0.2 } },
  cash: { riskAlertCount: 1, necessidadeCaixa: 500 },
  sourceHealth: {
    finance: { status: "ok", message: "ok" },
    sales: { status: "error", message: "CI offline" },
  },
};
const bundle = buildExecutiveAnalyticsBundle({
  snap: partial,
  permissions: perms,
});
assert(bundle.sourceHealth.sales?.status === "error", "Falha isolada preservada");
assert(
  bundle.metrics.some((m) => m.definitionId === "fin.ebitda" && m.value === -10),
  "Parcial: EBITDA ok",
);
assert(
  !bundle.metrics.some(
    (m) => m.definitionId === "vendas.faturamento" && m.availability === "available",
  ),
  "Parcial: vendas indisponível sem inventar",
);

const drill = buildDrillDown({
  definitionId: "vendas.por_vendedor",
  level: "documento",
  items: [
    { id: "1", label: "A", value: 40, origin: "ci" },
    { id: "2", label: "B", value: 60, origin: "ci" },
  ],
  methodology: "test",
});
assert(drill.total === 100, "Drill total fecha com detalhe");
assert(drill.traceable === true, "Drill rastreável");

const alerts = buildAnalyticsAlerts({
  snap: {
    ...partial,
    metas: { metaFaturamento: 200, realizadoFaturamento: 50 },
    sales: { faturamento: 50 },
    customers: { concentracaoTop: 0.55 },
  },
  metrics: bundle.metrics.concat(
    resolveCatalogMetrics(
      {
        tenantId: "t-a",
        tenantSlug: "a",
        asOf: "2026-07-29",
        sales: { faturamento: 50 },
      },
      { period, filters: { period }, permissions: perms },
    ),
  ),
  period,
});
assert(dedupeAlerts([...alerts, ...alerts]).length === alerts.length, "Alertas deduplicados");
assert(alerts.every((a) => a.autoApplied === false), "Alertas sem ação automática");
assert(alerts.some((a) => a.title.includes("Concentração")), "Alerta concentração com evidência");

const provider = resolveExecutiveProvider();
assert(provider.kind === "deterministic", "Provider externo ausente → determinístico");
assert(
  provider.label.includes("regras") || provider.label.includes("histórico"),
  "Texto obrigatório regras/histórico",
);

assert(csvEscapeCell("=CMD()") === "'=CMD()", "CSV injection =");
assert(csvEscapeCell("+1").startsWith("'"), "CSV injection +");
const csv = buildAnalyticsCsv(
  [{ id: "=HACK", nome: "x", valor: 1 }],
  ["id", "nome", "valor"],
);
assert(csv.startsWith("\uFEFF"), "CSV BOM UTF-8");
assert(csv.includes("'=HACK"), "CSV formula escaped");

assert(bundle.exports.find((e) => e.format === "excel")?.status === "preparing", "Excel preparing");
assert(bundle.exports.find((e) => e.format === "pdf")?.status === "preparing", "PDF preparing");
assert(bundle.exports.find((e) => e.format === "csv")?.status === "ready", "CSV ready");

const ui = read("components/analytics/executive-analytics-dashboard.tsx");
assert(ui.includes("Em preparação"), "UI Excel/PDF Em preparação");
assert(ui.includes("disabled"), "Botões desabilitados");
assert(ui.includes("aria-"), "Acessibilidade aria");
assert(ui.includes("Esc"), "Drill Esc");
assert(ui.includes("focus-visible"), "Foco visível");
assert(!ui.includes("Math.random"), "UI sem random");
assert(ui.includes("getExecutiveAnalyticsDashboard"), "Agregação via server action");

const actions = read("lib/analytics/analytics-actions.ts");
assert(actions.includes("tenantId do client"), "Rejeita tenantId client");
assert(actions.includes("requireTenant"), "requireTenant");
assert(actions.includes("Cross-tenant"), "Assert cross-tenant");

assert(!existsSync(join(root, "supabase/migrations/20260812_enterprise_analytics.sql")), "Sem migration Fase 23");
assert(
  existsSync(join(root, "supabase/migrations/20260811_enterprise_tax_intelligence.sql")),
  "Migration tax 20260811 permanece",
);

assert(
  getMetricDefinition("fin.ebitda")?.formula.includes("DreResumo") ||
    getMetricDefinition("fin.ebitda")?.source.includes("dre"),
  "EBITDA aponta DRE",
);

const comparisons = buildComparisons(snapA, [
  resolveMetric(snapA, "fin.ebitda", { period, filters: { period }, permissions: perms }),
]);
assert(comparisons[0]?.delta === 20, "Fórmula comparativo EBITDA correta");
assert(METRIC_CATALOG.length >= 40, "Catálogo preservado");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
