#!/usr/bin/env node
/**
 * Sprint 26.7 — Enterprise Tax Intelligence Platform tests
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildExecutiveTaxDashboard,
  buildTaxAlerts,
  buildTaxAiRecommendations,
  buildTaxDrillDown,
  buildTaxEnterpriseReport,
  buildTaxIntelligenceBundle,
  computeAssessments,
  createTaxEngine,
  DEFAULT_SUPPLIER_WEIGHTS,
  describeTaxIntegrationArchitecture,
  getTaxFeatureFlags,
  isTaxIntelligenceEnabled,
  listRequiredKeysHint,
  prepareTaxReportExport,
  projectTaxCashflow,
  rankTaxSuppliers,
  requireNumberParameter,
  resolveActiveRuleVersion,
  simulateTaxScenario,
  validateRuleVersionShape,
} from "../lib/finance/tax-intelligence/index.ts";
import { isFinanceError } from "../lib/finance/shared/errors.ts";

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

console.log("\nEnterprise Tax Intelligence — Sprint 26.7\n");

const requiredFiles = [
  "lib/finance/tax-intelligence/types.ts",
  "lib/finance/tax-intelligence/tax-engine.ts",
  "lib/finance/tax-intelligence/tax-rule-registry.ts",
  "lib/finance/tax-intelligence/tax-feature-flags.ts",
  "lib/finance/tax-intelligence/tax-dashboard-service.ts",
  "lib/finance/tax-intelligence/tax-simulator-service.ts",
  "lib/finance/tax-intelligence/tax-supplier-ranking-service.ts",
  "lib/finance/tax-intelligence/tax-cashflow-service.ts",
  "lib/finance/tax-intelligence/tax-alerts-service.ts",
  "lib/finance/tax-intelligence/tax-reports-service.ts",
  "lib/finance/tax-intelligence/tax-ai-service.ts",
  "lib/finance/tax-intelligence/tax-integration-architecture.ts",
  "lib/finance/tax-intelligence/tax-intelligence-service.ts",
  "lib/finance/tax-intelligence/tax-intelligence-actions.ts",
  "lib/finance/tax-intelligence/providers/parametric-core.ts",
  "lib/finance/tax-intelligence/providers/builtin-providers.ts",
  "lib/finance/tax-intelligence/index.ts",
  "components/finance/tax-intelligence/executive-tax-dashboard.tsx",
  "app/(app)/[tenant]/financeiro/tributos/page.tsx",
  "supabase/migrations/20260811_enterprise_tax_intelligence.sql",
  "scripts/enterprise-tax-tests.mjs",
];

for (const f of requiredFiles) {
  assert(existsSync(join(root, f)), `Arquivo: ${f}`);
}

assert(
  read("package.json").includes("test:enterprise-tax"),
  "package.json script test:enterprise-tax",
);
assert(
  read("app/(app)/[tenant]/financeiro/tributos/page.tsx").includes(
    "requireFinancePagePermission",
  ),
  "RBAC page gate: tributos",
);
assert(
  read("components/finance/finance-navigation.tsx").includes("tributos"),
  "Nav item tributos",
);
assert(
  read("lib/rbac/permissions.ts").includes("financeiro.tributos.visualizar"),
  "Permissão tributos.visualizar no catálogo",
);
assert(
  read("lib/finance/shared/types.ts").includes("financeiro.tributos.visualizar"),
  "FinancePermission inclui tributos",
);

// —— Anti-hardcode: código do motor não embute alíquotas legais ——
const engineSrc = read("lib/finance/tax-intelligence/providers/parametric-core.ts");
const registrySrc = read("lib/finance/tax-intelligence/tax-rule-registry.ts");
assert(
  !/0\.06|0\.12|0\.17|alíquota\s*=\s*0\./i.test(engineSrc),
  "parametric-core sem alíquotas hardcoded típicas",
);
assert(
  registrySrc.includes("Sem hardcode") ||
    registrySrc.includes("sem hardcode") ||
    registrySrc.includes("Configure"),
  "registry exige configuração explícita",
);
assert(
  listRequiredKeysHint("cbs").includes("rate_effective"),
  "CBS exige rate_effective parametrizado",
);
assert(
  listRequiredKeysHint("ibs").includes("credit_rate"),
  "IBS exige credit_rate parametrizado",
);

const tenantId = "tenant-tax-1";
const asOf = "2026-07-15";

/** Fixtures de teste — taxas só aqui, nunca no código de produção. */
const ruleSN = {
  id: "rule-sn-1",
  tenantId,
  regimeCode: "simples_nacional",
  versionLabel: "SN-fixture-v1",
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  status: "active",
  parameters: { rate_effective: 0.06, base_multiplier: 1 },
};

const ruleLP = {
  id: "rule-lp-1",
  tenantId,
  regimeCode: "lucro_presumido",
  versionLabel: "LP-fixture-v1",
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  status: "active",
  parameters: {
    rate_effective: 0.15,
    presumption_rate: 0.32,
    base_multiplier: 1,
  },
};

const ruleCBS = {
  id: "rule-cbs-1",
  tenantId,
  regimeCode: "cbs",
  versionLabel: "CBS-fixture-v1",
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  status: "active",
  parameters: {
    rate_effective: 0.088,
    credit_rate: 1,
    base_multiplier: 1,
  },
};

const ruleIBS = {
  id: "rule-ibs-1",
  tenantId,
  regimeCode: "ibs",
  versionLabel: "IBS-fixture-v1",
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  status: "active",
  parameters: {
    rate_effective: 0.177,
    credit_rate: 1,
    base_multiplier: 1,
  },
};

assert(validateRuleVersionShape(ruleSN).length === 0, "Shape SN válido");
assert(
  validateRuleVersionShape({
    ...ruleSN,
    parameters: { base_multiplier: 1 },
  }).includes("rate_effective"),
  "Shape SN detecta rate_effective ausente",
);

const company = {
  id: "ent-co",
  tenantId,
  kind: "company",
  name: "Matriz",
  regimeCode: "simples_nacional",
  active: true,
};
const branch = {
  id: "ent-br",
  tenantId,
  kind: "branch",
  name: "Filial SP",
  parentId: "ent-co",
  regimeCode: "simples_nacional",
  active: true,
};

const bases = [
  {
    id: "b1",
    tenantId,
    entityId: "ent-co",
    period: "2026-06",
    kind: "revenue",
    amount: 100_000,
    costCenterId: "cc-ops",
    productMixShare: 0.6,
    serviceMixShare: 0.4,
  },
  {
    id: "b2",
    tenantId,
    entityId: "ent-br",
    period: "2026-06",
    kind: "revenue",
    amount: 40_000,
    costCenterId: "cc-sales",
  },
  {
    id: "b3",
    tenantId,
    entityId: "ent-co",
    period: "2026-07",
    kind: "revenue",
    amount: 120_000,
    costCenterId: "cc-ops",
  },
];

const engine = createTaxEngine();
assert(engine.listProviders().length >= 6, "Providers: SN/LP/LR/CBS/IBS/custom");

const resolved = resolveActiveRuleVersion(
  [ruleSN, ruleLP],
  "simples_nacional",
  asOf,
  tenantId,
);
assert(resolved.id === "rule-sn-1", "resolveActiveRuleVersion SN");

let missingParam = false;
try {
  requireNumberParameter({}, "rate_effective", "x");
} catch (e) {
  missingParam = isFinanceError(e);
}
assert(missingParam, "Parâmetro ausente lança FinanceError (sem fallback)");

const assessment = engine.computeForEntity({
  tenantId,
  asOf,
  entity: company,
  bases: bases.filter((b) => b.entityId === "ent-co" && b.period === "2026-06"),
  ruleVersions: [ruleSN],
});
assert(assessment.totalTax === 6000, `SN 100k * 0.06 = 6000 (got ${assessment.totalTax})`);
assert(
  assessment.components[0].parameterKeysUsed.includes("rate_effective"),
  "Component rastreia parâmetros usados",
);

const snap = {
  tenantId,
  tenantSlug: "demo",
  asOf,
  entities: [company, branch],
  ruleVersions: [ruleSN, ruleLP, ruleCBS, ruleIBS],
  bases,
  suppliers: [
    {
      id: "s1",
      name: "Alpha",
      unitCost: 100,
      historicalReliability: 0.9,
      operationalScore: 0.8,
      taxBenefitScore: 0.7,
      regimeCode: "simples_nacional",
      metadata: { location_score: 0.8, regime_affinity: 0.9, tax_impact_score: 0.85 },
    },
    {
      id: "s2",
      name: "Beta",
      unitCost: 150,
      historicalReliability: 0.5,
      operationalScore: 0.4,
      taxBenefitScore: 0.2,
      metadata: { location_score: 0.3, regime_affinity: 0.2, tax_impact_score: 0.2 },
    },
  ],
  projectedAssessments: [],
};

const assessments = computeAssessments(snap);
assert(assessments.length === 2, `2 apurações (got ${assessments.length})`);

const dashboard = buildExecutiveTaxDashboard(snap);
assert(dashboard.consolidatedLoad > 0, "Dashboard carga consolidada > 0");
assert(dashboard.byCompany.length >= 1, "Dashboard por empresa");
assert(dashboard.byBranch.length >= 1, "Dashboard por filial");
assert(dashboard.byCostCenter.length >= 1, "Dashboard por centro de custo");
assert(dashboard.monthlyTrend.length >= 1, "Tendência mensal");
assert(dashboard.efficiency.length >= 1, "Indicadores de eficiência");
assert(
  dashboard.reformImpact.regimesInScope.includes("cbs") ||
    dashboard.reformImpact.regimesInScope.includes("ibs"),
  "Impacto Reforma com CBS/IBS configurados",
);

const drill = buildTaxDrillDown(snap, { dimension: "company" });
assert(drill.items.length >= 1, "Drill-down company");
assert(drill.total > 0, "Drill-down total");

const sim = simulateTaxScenario(
  {
    kind: "revenue_growth",
    label: "+10%",
    factors: { revenue_growth: 0.1 },
    baselineResults: assessments,
  },
  {
    tenantId,
    asOf,
    bases,
    entityIds: ["ent-co", "ent-br"],
  },
);
assert(sim.requiresHumanReview === true, "Simulação exige revisão humana");
assert(sim.simulatedTotal >= sim.baselineTotal, "Crescimento aumenta tributo");

const regimeSim = simulateTaxScenario(
  {
    kind: "regime_change",
    label: "Para Lucro Presumido",
    factors: {},
    baselineResults: assessments.filter((a) => a.entityId === "ent-co"),
    alternateRegimeCode: "lucro_presumido",
    alternateRuleVersion: ruleLP,
  },
  {
    tenantId,
    asOf,
    bases,
    entityIds: ["ent-co"],
  },
);
assert(regimeSim.kind === "regime_change", "Simulação mudança de regime");

const ranking = rankTaxSuppliers(snap.suppliers, DEFAULT_SUPPLIER_WEIGHTS);
assert(ranking[0].supplierId === "s1", "Ranking: Alpha primeiro");
assert(ranking[0].requiresHumanReview === true, "Ranking com revisão humana");
assert(ranking[0].justification.length > 10, "Ranking com justificativa");

const cashflow = projectTaxCashflow({
  tenantId,
  assessments,
  scenario: "conservative",
  months: 3,
  dueDayOfMonth: 20,
  seasonality: [1, 1.1, 0.9],
});
assert(cashflow.points.length === 3, "Cashflow 3 meses");
assert(cashflow.totalTaxOutflow > 0, "Cashflow outflow > 0");

const alerts = buildTaxAlerts({
  dashboard: { ...dashboard, monthlyTrend: [
    { period: "2026-05", realized: 1000, projected: 1000 },
    { period: "2026-06", realized: 1500, projected: 1000 },
  ]},
  assessments,
  cashflow,
  loadSpikeThreshold: 0.2,
  ebitdaProxy: 50_000,
});
assert(alerts.some((a) => a.kind === "load_spike"), "Alerta load spike");
assert(alerts.every((a) => a.autoApplied === false), "Alertas nunca auto-aplicados");
assert(
  alerts.every((a) => a.requiresHumanReview === true),
  "Alertas com revisão humana",
);

const ai = buildTaxAiRecommendations({ dashboard, assessments, alerts });
assert(ai.length >= 1, "IA gera recomendações");
assert(ai.every((r) => r.autoExecuted === false), "IA nunca auto-executa");
assert(ai.every((r) => r.requiresHumanReview === true), "IA com revisão humana");
assert(ai.every((r) => r.origin && r.confidence), "IA com origem e confiança");

const report = buildTaxEnterpriseReport({
  tenantId,
  dashboard,
  alerts,
  cashflow,
  ai,
  simulations: [sim],
});
assert(report.sections.length >= 8, "Relatório com seções enterprise");
assert(
  report.exportFormatsPrepared.includes("pdf") &&
    report.exportFormatsPrepared.includes("excel") &&
    report.exportFormatsPrepared.includes("print"),
  "Export PDF/Excel/print preparado",
);
const exportMeta = prepareTaxReportExport(report, "pdf");
assert(exportMeta.ready === true, "Export PDF ready metadata");

const integrations = describeTaxIntegrationArchitecture();
assert(integrations.connectors.length >= 5, "Arquitetura com 5+ conectores");
assert(
  integrations.connectors.every((c) => c.status === "disabled" || c.status === "preparing"),
  "Conectores preparing/disabled (sem fake live)",
);

const bundle = buildTaxIntelligenceBundle(snap, {
  cashflowScenario: "neutral",
  ebitdaProxy: 80_000,
});
assert(bundle.dashboard.tenantId === tenantId, "Bundle dashboard");
assert(bundle.alerts.length >= 1, "Bundle alerts");
assert(bundle.integrations.version === "26.7", "Bundle integrations 26.7");

assert(isTaxIntelligenceEnabled() === true, "Flag tax intelligence default on");
assert(getTaxFeatureFlags().externalAi === false, "IA externa default off");
assert(
  getTaxFeatureFlags().externalIntegrations === false,
  "Integrações externas default off",
);

// Sem regra → sem inventar cálculo
const emptyDash = buildExecutiveTaxDashboard({
  tenantId,
  tenantSlug: "demo",
  asOf,
  entities: [company],
  ruleVersions: [],
  bases,
});
assert(emptyDash.emptyReason != null, "Empty state sem regras");
assert(emptyDash.consolidatedLoad === 0, "Sem hardcode: carga 0 sem regras");

// Migration idempotente e sem seed de alíquota
const mig = read("supabase/migrations/20260811_enterprise_tax_intelligence.sql");
assert(mig.includes("create table if not exists public.tax_rule_versions"), "Migration tax_rule_versions");
assert(mig.includes("enable row level security"), "Migration RLS");
assert(!/insert into public\.tax_rule_versions/i.test(mig), "Migration sem seed de alíquotas");
assert(mig.includes("NÃO executada automaticamente") || mig.includes("aplicar manualmente"), "Migration manual");

// Reuso Finance / sem regressão estrutural de módulos citados
assert(existsSync(join(root, "lib/finance/cash-intelligence/index.ts")), "Cash Intelligence intacto");
assert(existsSync(join(root, "lib/finance/reconciliation/index.ts")), "Conciliação intacta");
assert(existsSync(join(root, "lib/import-engine")), "Import Engine intacto");
assert(
  read("lib/finance/index.ts").includes("tax-intelligence"),
  "Finance barrel exporta tax-intelligence",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
