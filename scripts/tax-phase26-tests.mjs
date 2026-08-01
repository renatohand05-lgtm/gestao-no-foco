#!/usr/bin/env node
/**
 * Fase 26.8–26.10 — Suite consolidada de testes tributários.
 * Uso: node --experimental-strip-types scripts/tax-phase26-tests.mjs [suite|all]
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  WORKFLOW_ORDER,
  assertTransition,
  canPublish,
  canTransition,
  isImmutableStatus,
  workflowActionsFor,
} from "../lib/tax/workflow.ts";
import {
  resolveTaxRulePrecedence,
  specificityScore,
  isEligibleForProduction,
} from "../lib/tax/precedence.ts";
import {
  detectValidityOverlap,
  findOverlappingRules,
  validateTaxRuleDraft,
  blocksRetroactiveSilentEdit,
} from "../lib/tax/validity.ts";
import { diagnoseTaxRules, publicationGate } from "../lib/tax/conflicts.ts";
import {
  createDraftFromPublished,
  diffTaxRules,
  snapshotVersion,
} from "../lib/tax/versioning.ts";
import {
  assertSimulationIsolation,
  canAffectOfficialCalculation,
} from "../lib/tax/environments.ts";
import {
  recordTaxAudit,
  listTaxAuditMemory,
  clearTaxAuditMemory,
  requiredAuditFields,
} from "../lib/tax/audit.ts";
import {
  runScenarioCalculation,
  compareRegimesLanguage,
  createSimulationShell,
  buildScenario,
  branchIncrementalImpact,
  scenarioKindAvailable,
  computeSimulationConfidence,
} from "../lib/tax/simulation.ts";
import {
  buildTaxCalendar,
  detectTaxAlerts,
  projectTax,
  rankSuppliersTax,
  draftTaxActionPlan,
  listIntegrationProviders,
  answerTaxIntelligence,
  listTaxReportKinds,
  buildExecutiveCockpitSkeleton,
} from "../lib/tax/executive.ts";
import {
  getTaxRuleCache,
  setTaxRuleCache,
  invalidateTaxRuleCacheOnPublish,
  assertCacheTenantIsolation,
  clearTaxCache,
} from "../lib/tax/cache.ts";
import { filterByTenant, denyCrossTenantWrite } from "../lib/tax/tenant.ts";
import { TAX_TABLES } from "../lib/tax/persistence/schema.ts";
import { ALL_PERMISSION_KEYS } from "../lib/rbac/permissions.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const suiteArg = process.argv[2] ?? "all";

let pass = 0;
let fail = 0;
function assert(c, m) {
  if (c) {
    pass++;
    console.log("  PASS ", m);
  } else {
    fail++;
    console.log("  FAIL ", m);
  }
}
function read(p) {
  return readFileSync(join(root, p), "utf8");
}
function exists(p) {
  return existsSync(join(root, p));
}

function baseRule(over = {}) {
  return {
    id: "r1",
    tenantId: "t1",
    companyId: null,
    branchId: null,
    code: "RULE-A",
    name: "Regra A",
    description: null,
    regimeId: "reg1",
    taxTypeId: "tt1",
    jurisdiction: "BR",
    country: null,
    state: null,
    municipality: null,
    cnae: null,
    ncm: null,
    cest: null,
    cfop: null,
    serviceCode: null,
    customerType: null,
    supplierType: null,
    operationType: null,
    origin: null,
    destination: null,
    conditions: {},
    calculationBase: null,
    rateDefinition: null,
    reductionDefinition: null,
    creditDefinition: null,
    retentionDefinition: null,
    exceptions: null,
    priority: 100,
    validFrom: "2026-01-01",
    validTo: null,
    status: "published",
    environment: "producao",
    sourceReference: "doc-interno-1",
    legalReference: null,
    version: 1,
    parentVersionId: null,
    createdBy: "u1",
    reviewedBy: "u2",
    approvedBy: "u2",
    publishedBy: "u2",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    publishedAt: "2026-01-01T00:00:00Z",
    deletedAt: null,
    ...over,
  };
}

const suites = {
  "tax-rule-contracts"() {
    console.log("\n## tax-rule-contracts");
    assert(exists("lib/tax/types.ts"), "types");
    assert(exists("supabase/migrations/20260817_tax_configuration_phase26_8.sql"), "migration");
    const mig = read("supabase/migrations/20260817_tax_configuration_phase26_8.sql");
    for (const t of [
      "tax_regimes",
      "tax_types",
      "tax_rules",
      "tax_rule_version_snapshots",
      "tax_obligation_definitions",
      "tax_calculation_traces",
      "tax_simulations_v2",
      "tax_scenarios",
      "tax_audit_events",
    ]) {
      assert(mig.includes(t), `table ${t}`);
    }
    assert(TAX_TABLES.includes("tax_rules"), "TAX_TABLES");
    assert(mig.includes("enable row level security"), "rls");
    const issues = validateTaxRuleDraft(baseRule({ sourceReference: "" }));
    assert(issues.some((i) => i.code === "SOURCE_REQUIRED" || i.field === "sourceReference"), "fonte obrigatória");
  },

  "tax-rule-versioning"() {
    console.log("\n## tax-rule-versioning");
    const pub = baseRule();
    assert(isImmutableStatus(pub.status), "published immutable");
    const blocked = blocksRetroactiveSilentEdit(pub, { name: "x" });
    assert(blocked?.code === "NO_SILENT_RETROACTIVE", "no silent edit");
    const draft = createDraftFromPublished(pub, {
      createdBy: "u3",
      changeReason: "ajuste escopo",
      patch: { name: "Regra A2" },
    });
    assert(draft.ok && draft.draft.status === "draft", "new draft from published");
    assert(draft.ok && draft.draft.version === 2, "version bump");
    const diff = diffTaxRules(pub, draft.ok ? draft.draft : pub, "ajuste", "u3");
    assert(diff.changedFields.includes("name"), "diff fields");
    const snap = snapshotVersion(pub, {
      changeReason: "pub",
      changeSummary: "v1",
      createdBy: "u1",
    });
    assert(snap.version === 1 && snap.changeReason === "pub", "snapshot");
  },

  "tax-rule-workflow"() {
    console.log("\n## tax-rule-workflow");
    assert(canTransition("draft", "under_review"), "draft→review");
    assert(canTransition("under_review", "approved"), "review→approved");
    assert(canPublish("approved"), "can publish approved");
    assert(!canPublish("draft"), "cannot publish draft");
    assert(!assertTransition("published", "draft").ok, "no published→draft");
    assert(workflowActionsFor("published").includes("criar_nova_versao"), "actions");
    assert(WORKFLOW_ORDER.includes("suspended"), "status suspended");
  },

  "tax-rule-precedence"() {
    console.log("\n## tax-rule-precedence");
    const general = baseRule({ id: "g", priority: 10, state: null });
    const specific = baseRule({
      id: "s",
      priority: 10,
      state: "SP",
      version: 1,
    });
    const ctx = {
      tenantId: "t1",
      state: "SP",
      asOf: "2026-06-01",
      environment: "producao",
    };
    const res = resolveTaxRulePrecedence([general, specific], ctx);
    assert(res.winner?.id === "s", "more specific wins");
    assert(specificityScore(specific) > specificityScore(general), "specificity");
    assert(res.decisionOrder.includes("priority_desc"), "decision order documented");
    assert(canAffectOfficialCalculation(general), "prod published affects official");
    assert(
      !canAffectOfficialCalculation(baseRule({ status: "draft", environment: "configuracao" })),
      "draft does not affect official",
    );
    assert(isEligibleForProduction(general), "eligible production");
  },

  "tax-validity"() {
    console.log("\n## tax-validity");
    const a = baseRule({ id: "a", validFrom: "2026-01-01", validTo: "2026-06-30" });
    const b = baseRule({ id: "b", validFrom: "2026-06-01", validTo: "2026-12-31" });
    assert(detectValidityOverlap(a, b), "overlap detected");
    assert(findOverlappingRules([a, b]).length === 1, "find overlap");
    const bad = validateTaxRuleDraft(baseRule({ validFrom: "2026-12-01", validTo: "2026-01-01" }));
    assert(bad.some((i) => i.code === "INVALID_VALIDITY"), "invalid range");
  },

  "tax-rule-conflicts"() {
    console.log("\n## tax-rule-conflicts");
    const a = baseRule({ id: "a", priority: 50, version: 1 });
    const b = baseRule({ id: "b", priority: 50, version: 1 });
    const diag = diagnoseTaxRules([a, b], {
      tenantId: "t1",
      asOf: "2026-06-01",
      environment: "producao",
    });
    assert(diag.precedenceConflicts.length === 2, "tie conflict");
    const gate = publicationGate(baseRule({ status: "draft", approvedBy: null }));
    assert(gate.some((i) => i.code === "NOT_APPROVED"), "publish gate");
  },

  "tax-admin-rbac"() {
    console.log("\n## tax-admin-rbac");
    const needed = [
      "tax.visualizar",
      "tax.executivo",
      "tax.configurar",
      "tax.criar_regra",
      "tax.editar_draft",
      "tax.revisar",
      "tax.aprovar",
      "tax.publicar",
      "tax.suspender",
      "tax.versionar",
      "tax.simular",
      "tax.comparar_regimes",
      "tax.ver_auditoria",
      "tax.exportar",
      "tax.configurar_integracao",
    ];
    for (const k of needed) assert(ALL_PERMISSION_KEYS.includes(k), k);
    assert(exists("lib/tax/page-auth.ts"), "page-auth");
  },

  "tax-audit"() {
    console.log("\n## tax-audit");
    process.env.TAX_TEST_MEMORY = "1";
    clearTaxAuditMemory();
    const ev = recordTaxAudit({
      tenantId: "t1",
      actorId: "u1",
      action: "rule.publish",
      entityType: "tax_rule",
      entityId: "r1",
      before: null,
      after: { status: "published" },
      correlationId: "c1",
    });
    assert(ev.id && listTaxAuditMemory("t1").length === 1, "audit memory");
    assert(requiredAuditFields().includes("correlationId"), "audit fields");
    delete process.env.TAX_TEST_MEMORY;
  },

  "tax-tenant-isolation"() {
    console.log("\n## tax-tenant-isolation");
    const rows = [baseRule({ tenantId: "t1" }), baseRule({ id: "x", tenantId: "t2" })];
    assert(filterByTenant(rows, "t1").length === 1, "filter tenant");
    assert(denyCrossTenantWrite("t2", "t1").ok === false, "deny cross write");
    const mig = read("supabase/migrations/20260817_tax_configuration_phase26_8.sql");
    assert(mig.includes("tenant_members"), "rls membership");
  },

  "tax-admin-ui"() {
    console.log("\n## tax-admin-ui");
    for (const f of [
      "app/(app)/[tenant]/tributario/page.tsx",
      "app/(app)/[tenant]/tributario/regras/page.tsx",
      "app/(app)/[tenant]/tributario/regras/nova/page.tsx",
      "app/(app)/[tenant]/tributario/regras/[id]/page.tsx",
      "app/(app)/[tenant]/tributario/versoes/page.tsx",
      "app/(app)/[tenant]/tributario/obrigacoes/page.tsx",
      "app/(app)/[tenant]/tributario/auditoria/page.tsx",
      "app/(app)/[tenant]/tributario/configuracoes/page.tsx",
      "components/gf/gf-tax-admin.tsx",
    ]) {
      assert(exists(f), f);
    }
    const hub = read("app/(app)/[tenant]/tributario/page.tsx");
    assert(hub.includes("MIGRATION") || hub.includes("migration"), "migration honesty");
    const nav = read("config/navigation.ts");
    assert(nav.includes("tributario"), "nav item");
  },

  "tax-simulation-contracts"() {
    console.log("\n## tax-simulation-contracts");
    const sim = createSimulationShell({
      tenantId: "t1",
      createdBy: "u1",
      name: "Sim",
      baselinePeriod: "2026-01",
      targetPeriod: "2026-12",
      assumptions: ["crescimento informado"],
      ruleVersions: ["v1"],
    });
    assert(sim.mutatesOfficial === false, "mutatesOfficial false");
    const scn = buildScenario(sim.id, "expected", "Base", { revenueGrowthPct: 10 }, ["a"], ["v1"]);
    assert(scn.type === "expected", "scenario type");
  },

  "tax-simulation-isolation"() {
    console.log("\n## tax-simulation-isolation");
    assertSimulationIsolation(false);
    let threw = false;
    try {
      assertSimulationIsolation(true);
    } catch {
      threw = true;
    }
    assert(threw, "isolation throws");
    const mig = read("supabase/migrations/20260817_tax_configuration_phase26_8.sql");
    assert(mig.includes("mutates_official = false"), "db constraint");
  },

  "tax-regime-comparison"() {
    console.log("\n## tax-regime-comparison");
    const msg = compareRegimesLanguage("Lucro Presumido (premissas)");
    assert(msg.includes("menor impacto estimado"), "language");
    assert(!msg.toLowerCase().includes("melhor regime para"), "no definitive best");
  },

  "tax-branch-simulation"() {
    console.log("\n## tax-branch-simulation");
    const inc = branchIncrementalImpact({
      currentBranchTax: 100,
      newBranchTax: 40,
    });
    assert(inc.consolidated === 140 && inc.incremental === 40 && inc.labeled, "branch labeled");
  },

  "tax-growth-scenarios"() {
    console.log("\n## tax-growth-scenarios");
    const ok = scenarioKindAvailable("revenue_growth", true);
    assert(ok.available, "growth available");
    const no = scenarioKindAvailable("revenue_growth", false);
    assert(!no.available, "unavailable without model");
    const res = runScenarioCalculation({
      scenario: {
        type: "expected",
        variables: { revenueGrowthPct: 10, rateEffective: 0.1 },
        assumptions: ["fonte interna"],
        taxRuleVersionIds: ["rv1"],
      },
      baselineRevenue: 1000,
    });
    assert(res.grossRevenue === 1100 && res.totalTaxes === 110, "growth calc");
  },

  "tax-financial-impact"() {
    console.log("\n## tax-financial-impact");
    const res = runScenarioCalculation({
      scenario: {
        type: "custom",
        variables: {
          rateEffective: 0.15,
          cashFlowDelta: -50,
          ebitdaDelta: -20,
          marginDelta: -0.02,
        },
        assumptions: ["impacto informado"],
        taxRuleVersionIds: ["rv1"],
      },
      baselineRevenue: 2000,
    });
    assert(res.cashFlowImpact === -50, "cash");
    assert(res.EBITDAImpact === -20, "ebitda");
    assert(res.assumptionsVisible.length > 0, "assumptions visible");
  },

  "tax-transition-scenarios"() {
    console.log("\n## tax-transition-scenarios");
    assert(scenarioKindAvailable("rule_transition", true).available, "transition kind");
    assert(scenarioKindAvailable("future_validity", true).available, "future validity");
    const res = runScenarioCalculation({
      scenario: {
        type: "custom",
        variables: {},
        assumptions: [],
        taxRuleVersionIds: [],
      },
      baselineRevenue: null,
    });
    assert(res.confidence === "indisponivel", "no invented rates");
    assert(res.limitations.length > 0, "limitations");
  },

  "tax-simulation-confidence"() {
    console.log("\n## tax-simulation-confidence");
    assert(
      computeSimulationConfidence({
        hasRuleVersions: false,
        assumptionCount: 5,
        hasRevenue: true,
        coverageNotes: [],
      }) === "indisponivel",
      "no rules => indisponivel",
    );
  },

  "tax-simulation-audit"() {
    console.log("\n## tax-simulation-audit");
    process.env.TAX_TEST_MEMORY = "1";
    clearTaxAuditMemory();
    recordTaxAudit({
      tenantId: "t1",
      actorId: "u1",
      action: "simulation.run",
      entityType: "tax_simulation",
      entityId: "s1",
      before: null,
      after: { mutatesOfficial: false },
      correlationId: "c-sim",
    });
    assert(listTaxAuditMemory("t1")[0]?.action === "simulation.run", "sim audit");
    delete process.env.TAX_TEST_MEMORY;
  },

  "tax-simulator-ui"() {
    console.log("\n## tax-simulator-ui");
    for (const f of [
      "app/(app)/[tenant]/tributario/simulador/page.tsx",
      "app/(app)/[tenant]/tributario/simulador/novo/page.tsx",
      "app/(app)/[tenant]/tributario/simulador/[id]/page.tsx",
      "app/(app)/[tenant]/tributario/simulador/comparar/page.tsx",
      "components/gf/gf-tax-simulation.tsx",
    ]) {
      assert(exists(f), f);
    }
  },

  "tax-no-official-mutation"() {
    console.log("\n## tax-no-official-mutation");
    const sim = createSimulationShell({
      tenantId: "t1",
      createdBy: "u1",
      name: "x",
      baselinePeriod: "2026-01",
      targetPeriod: "2026-02",
      assumptions: [],
      ruleVersions: [],
    });
    assert(sim.mutatesOfficial === false, "shell");
    assert(!canAffectOfficialCalculation(baseRule({ status: "draft", environment: "simulacao" })), "sim env");
  },

  "tax-executive-cockpit"() {
    console.log("\n## tax-executive-cockpit");
    const c = buildExecutiveCockpitSkeleton({
      period: "2026-08",
      coveragePct: null,
      lastUpdate: null,
    });
    assert(c.burden == null && c.confidence === "indisponivel", "honest empty");
    assert(exists("app/(app)/[tenant]/tributario/executivo/page.tsx"), "page");
  },

  "tax-calendar"() {
    console.log("\n## tax-calendar");
    const items = buildTaxCalendar({
      obligations: [
        {
          id: "o1",
          tenantId: "t1",
          code: "OB1",
          name: "Obrigação",
          jurisdiction: "BR",
          regime: null,
          frequency: "monthly",
          dueDateRule: {},
          applicability: {},
          source: "",
          validFrom: "2026-01-01",
          validTo: null,
          status: "published",
          version: 1,
        },
      ],
      asOf: "2026-08-01",
      tenantSlug: "demo",
    });
    assert(items[0].status === "indisponivel", "no source => indisponivel");
  },

  "tax-alerts"() {
    console.log("\n## tax-alerts");
    const alerts = detectTaxAlerts({
      rules: [baseRule({ sourceReference: "" })],
      asOf: "2026-08-01",
      tenantSlug: "demo",
    });
    assert(alerts.some((a) => a.code === "rule_without_source"), "source alert");
  },

  "tax-projections"() {
    console.log("\n## tax-projections");
    const empty = projectTax({
      horizonDays: 30,
      historicalMonthly: null,
      assumptions: [],
    });
    assert(empty.method === "unavailable", "no silent linear");
    const ok = projectTax({
      horizonDays: 90,
      historicalMonthly: [10, 12, 11],
      assumptions: ["série informada"],
    });
    assert(ok.method === "historical_average" && ok.projectedAmount != null, "avg method");
  },

  "tax-supplier-ranking"() {
    console.log("\n## tax-supplier-ranking");
    const ranks = rankSuppliersTax({
      period: "2026-08",
      items: [
        {
          supplierId: "s1",
          supplierName: "A",
          totalCost: null,
          taxAmount: null,
          credits: null,
          coverageOk: false,
        },
      ],
    });
    assert(!ranks[0].coverageSufficient, "no best without coverage");
  },

  "tax-reports"() {
    console.log("\n## tax-reports");
    assert(listTaxReportKinds().includes("comparativo_regimes"), "report kinds");
  },

  "tax-intelligence"() {
    console.log("\n## tax-intelligence");
    const noEv = answerTaxIntelligence({
      intent: "explain_tax_burden",
      evidence: [],
      periodComparable: true,
      calcValid: true,
      tenantSlug: "demo",
    });
    assert(noEv.confidence === "indisponivel", "evidence required");
    const ok = answerTaxIntelligence({
      intent: "explain_tax_change",
      evidence: ["trace:1"],
      periodComparable: true,
      calcValid: true,
      burdenDeltaPct: 5,
      ruleId: "r1",
      version: 2,
      tenantSlug: "demo",
    });
    assert(ok.answer.includes("aumentou"), "change language");
  },

  "tax-action-plan"() {
    console.log("\n## tax-action-plan");
    const plan = draftTaxActionPlan({
      objective: "Completar fonte",
      risk: "publicação bloqueada",
      evidence: ["rule:r1"],
      steps: ["preencher sourceReference"],
    });
    assert(plan.autoExecute === false && plan.requiresProfessionalValidation, "no auto");
  },

  "tax-integration-contracts"() {
    console.log("\n## tax-integration-contracts");
    const providers = listIntegrationProviders();
    assert(providers.every((p) => !p.hasRealCredentials && p.status === "nao_configurado"), "no fake active");
  },

  "tax-audit-trace"() {
    console.log("\n## tax-audit-trace");
    assert(exists("app/(app)/[tenant]/tributario/auditoria/page.tsx"), "audit ui");
    assert(requiredAuditFields().length >= 5, "fields");
  },

  "tax-cache-isolation"() {
    console.log("\n## tax-cache-isolation");
    clearTaxCache();
    setTaxRuleCache("t1", "r1", 1, "2026-01-01", { v: 1 });
    assert(getTaxRuleCache("t2", "r1", 1, "2026-01-01") == null, "no cross tenant cache");
    assert(assertCacheTenantIsolation("t1", "t1"), "same tenant");
    invalidateTaxRuleCacheOnPublish("t1", "r1");
    assert(getTaxRuleCache("t1", "r1", 1, "2026-01-01") == null, "invalidate");
  },

  "tax-no-hallucination"() {
    console.log("\n## tax-no-hallucination");
    const res = runScenarioCalculation({
      scenario: {
        type: "baseline",
        variables: {},
        assumptions: [],
        taxRuleVersionIds: ["x"],
      },
      baselineRevenue: 100,
    });
    assert(res.totalTaxes == null, "no invented rate");
    const ui = read("components/gf/gf-tax-simulation.tsx");
    assert(ui.includes("não inventar") || ui.includes("não invent"), "ui honesty");
  },

  "tax-evidence-required"() {
    console.log("\n## tax-evidence-required");
    const ans = answerTaxIntelligence({
      intent: "identify_tax_risks",
      evidence: [],
      periodComparable: false,
      calcValid: false,
      tenantSlug: "demo",
    });
    assert(ans.limitations.some((l) => /evidênc/i.test(l)), "evidence limitation");
  },
};

const names = Object.keys(suites);
const runList =
  suiteArg === "all" ? names : names.filter((n) => n === suiteArg || n.includes(suiteArg));

if (runList.length === 0) {
  console.error("Suite desconhecida:", suiteArg);
  process.exit(1);
}

console.log(`\nTax Phase 26 suite — ${runList.join(", ")}\n`);
for (const n of runList) suites[n]();
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
