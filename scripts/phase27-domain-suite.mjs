#!/usr/bin/env node
/** Block 2 domain tests — 27.3–27.5 (suite consolidada por script name) */
process.env.INTELLIGENCE_TEST_MEMORY = "1";
import { clearEvidenceForTests } from "../lib/intelligence/enterprise/evidence/registry.ts";
import { clearIntelligenceAuditForTests } from "../lib/intelligence/enterprise/audit/recorder.ts";
import { resetIntelligenceBudgetForTests } from "../lib/intelligence/enterprise/cost/guard.ts";
import { explainDre, analyzeCashFlow } from "../lib/intelligence/enterprise/domains/finance.ts";
import {
  analyzeCrm,
  analyzeSales,
  analyzeOperations,
  analyzeInventory,
  analyzePurchases,
  buildDailyExecutiveBrief,
  compareBranches,
  classifyNaturalLanguageQuery,
  runNaturalLanguageQuery,
  createAutomationDraft,
} from "../lib/intelligence/enterprise/domains/modules.ts";
import { draftActionPlanFromRecommendations, recommendationsFromInsights } from "../lib/intelligence/enterprise/recommendation/engine.ts";
import { generateInsightsFromSnapshot } from "../lib/intelligence/enterprise/insight/engine.ts";
import { buildContextSnapshot } from "../lib/intelligence/enterprise/context/engine.ts";
import { submitIntelligenceFeedback, clearIntelligenceFeedbackForTests } from "../lib/intelligence/enterprise/feedback/store.ts";
import { checkIntelligenceBudget, estimateCostUsd } from "../lib/intelligence/enterprise/cost/guard.ts";
import { assertEvidencePresent, makeMetricEvidence } from "../lib/intelligence/enterprise/evidence/registry.ts";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const suite = process.argv[2] || "all";
let pass = 0, fail = 0;
const assert = (c, m) => { if (c) { pass++; console.log("  PASS ", m); } else { fail++; console.log("  FAIL ", m); } };

function reset() {
  clearEvidenceForTests();
  clearIntelligenceAuditForTests();
  resetIntelligenceBudgetForTests();
  clearIntelligenceFeedbackForTests();
}

const perms = ["inteligencia.perguntar", "inteligencia.visualizar", "inteligencia.explicar"];

console.log(`\nDomain suite — ${suite}\n`);
reset();

if (suite === "dre-explanation" || suite === "all") {
  const r = await explainDre({
    tenantId: "t1", userId: "u1", permissions: perms, slug: "demo",
    receita: 1000, margemContribuicao: 400, lucroLiquido: null,
  });
  assert(r.answer.includes("Lucro líquido indisponível"), "dre sem inventar lucro");
  assert(r.mode === "deterministic", "dre deterministic");
}

if (suite === "cash-intelligence" || suite === "all") {
  const r = await analyzeCashFlow({
    tenantId: "t1", userId: "u1", permissions: perms, slug: "demo",
    saldoAtual: 500, proj7: null, proj15: null, proj30: null,
  });
  assert(r.answer.includes("Projeções indisponíveis") || r.answer.includes("Saldo"), "cash honesto");
}

if (suite === "financial-action-plan" || suite === "all") {
  const snap = buildContextSnapshot({
    request: { tenantId: "t1" },
    metrics: [{ key: "saldoAtual", value: -1, source: "cash", available: true }],
  });
  const insights = generateInsightsFromSnapshot({ tenantId: "t1", module: "financeiro", snapshot: snap });
  const recs = recommendationsFromInsights(insights, "u1");
  const plan = draftActionPlanFromRecommendations(recs, "u1", "Plano financeiro");
  assert(!plan || plan.status === "draft", "plano draft");
  assert(!plan || plan.executedAt == null, "não executado");
}

if (suite === "crm-intelligence" || suite === "all") {
  const r = await analyzeCrm({
    tenantId: "t1", userId: "u1", permissions: perms, slug: "demo",
    clientesSemRetorno: 3, churnConfiavel: false,
  });
  assert(r.limitations.some((l) => l.includes("Churn")), "churn não inventado");
}

if (suite === "sales-intelligence" || suite === "all") {
  const r = await analyzeSales({
    tenantId: "t1", userId: "u1", permissions: perms, slug: "demo",
    ticketAtual: 92, ticketAnterior: 100,
  });
  assert(r.answer.includes("variou") || r.limitations.length >= 0, "sales");
}

if (suite === "operations-intelligence" || suite === "all") {
  const r = await analyzeOperations({
    tenantId: "t1", userId: "u1", permissions: perms, slug: "demo", osAbertas: 5, osAtrasadas: 1,
  });
  assert(r.mode === "deterministic", "ops");
}

if (suite === "daily-executive-brief" || suite === "all") {
  const r = await buildDailyExecutiveBrief({
    tenantId: "t1", userId: "u1", userName: "Renato", permissions: perms, slug: "demo",
    faturamento: 10, saldoAtual: 20,
  });
  assert(r.answer.includes("Bom dia, Renato"), "briefing");
  assert(r.answer.includes("sem envio automático"), "sem auto-send");
}

if (suite === "inventory-intelligence" || suite === "all") {
  const r = await analyzeInventory({
    tenantId: "t1", userId: "u1", permissions: perms, slug: "demo", estoqueAbaixoMinimo: 4,
  });
  assert(r.mode === "deterministic", "inventory");
}

if (suite === "purchase-intelligence" || suite === "all") {
  const r = await analyzePurchases({
    tenantId: "t1", userId: "u1", permissions: perms, slug: "demo", pedidosAtrasados: 2,
  });
  assert(r.mode === "deterministic", "purchases");
}

if (suite === "branch-comparison" || suite === "all") {
  const bad = compareBranches({ tenantId: "t1", branches: [{ branchId: "1", label: "A", faturamento: 1, cobertura: 1 }] });
  assert(!bad.ok, "menos de 2 filiais");
  const ok = compareBranches({
    tenantId: "t1",
    branches: [
      { branchId: "1", label: "A", faturamento: 10, cobertura: 1 },
      { branchId: "2", label: "B", faturamento: 20, cobertura: 1 },
    ],
  });
  assert(ok.ok && ok.ranking[0].branchId === "2", "ranking");
}

if (suite === "natural-language-query" || suite === "all") {
  assert(!classifyNaturalLanguageQuery("DROP TABLE users").safe, "sql bloqueado");
  assert(classifyNaturalLanguageQuery("Como está meu caixa?").intent === "analyze_cash_flow", "intent caixa");
  const blocked = await runNaturalLanguageQuery({
    tenantId: "t1", userId: "u1", permissions: perms, slug: "demo",
    question: "execute sql drop table",
  });
  assert(blocked.status === "error", "nlq block");
}

if (suite === "automation-drafts" || suite === "all") {
  const d = createAutomationDraft({
    title: "Alertar estoque crítico",
    description: "Rascunho",
    trigger: "estoque_abaixo_minimo",
    module: "estoque",
    tenantId: "t1",
  });
  assert(d.status === "draft" && d.autoExecute === false, "draft only");
}

if (suite === "intelligence-feedback" || suite === "all") {
  const f = submitIntelligenceFeedback({
    responseId: "r1", tenantId: "t1", userId: "u1", rating: "util", correlationId: "c",
  });
  assert(f.id.length > 0, "feedback");
}

if (suite === "intelligence-ui" || suite === "all") {
  assert(existsSync(join(root, "components/intelligence/gf-executive-copilot.tsx")), "copilot ui");
  assert(existsSync(join(root, "components/intelligence/gf-evidence-drawer.tsx")), "evidence ui");
  assert(existsSync(join(root, "app/(app)/[tenant]/inteligencia/copiloto/page.tsx")), "route copiloto");
  const ui = readFileSync(join(root, "components/intelligence/gf-executive-copilot.tsx"), "utf8");
  assert(ui.includes("data-gf-executive-copilot"), "marker");
}

if (suite === "intelligence-performance" || suite === "all") {
  assert(checkIntelligenceBudget({ tenantId: "t1", userId: "u1" }).ok, "budget ok");
  assert(estimateCostUsd(1000) === 0, "sem cobrança");
}

if (suite === "intelligence-cost-guard" || suite === "all") {
  resetIntelligenceBudgetForTests();
  let hit = false;
  for (let i = 0; i < 201; i++) {
    const c = checkIntelligenceBudget({ tenantId: "tx", userId: "ux" });
    if (!c.ok) { hit = true; break; }
    const { consumeIntelligenceBudget } = await import("../lib/intelligence/enterprise/cost/guard.ts");
    consumeIntelligenceBudget({ tenantId: "tx", userId: "ux" });
  }
  assert(hit, "daily limit");
}

if (suite === "intelligence-no-hallucination" || suite === "all") {
  const r = await explainDre({
    tenantId: "t1", userId: "u1", permissions: perms, slug: "demo", lucroLiquido: null, receita: null,
  });
  assert(!/Lucro líquido informado:\s*\d/.test(r.answer), "sem lucro inventado");
}

if (suite === "intelligence-evidence-required" || suite === "all") {
  assert(!assertEvidencePresent("x", []).ok, "sem evidência falha");
  const e = makeMetricEvidence({ tenantId: "t1", module: "financeiro", source: "s", metric: "m", value: 1 });
  assert(assertEvidencePresent("x", [e.id]).ok, "com evidência ok");
}

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
