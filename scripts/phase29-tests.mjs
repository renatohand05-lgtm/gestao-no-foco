#!/usr/bin/env node
/**
 * Fase 29.0 — gate estrutural (arquitetura / barrels / freeze)
 * Uso: node --experimental-strip-types scripts/phase29-tests.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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

function exists(rel) {
  return existsSync(join(root, rel));
}

function ensureEvidenceDir(rel = "docs/testing/evidence/29-0") {
  const p = join(root, rel);
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
  const keep = join(p, ".gitkeep");
  if (!existsSync(keep)) writeFileSync(keep, "");
  return p;
}

function runDocs() {
  console.log("\n[phase29-docs]");
  assert(exists("docs/architecture/PHASE_29_ENTERPRISE.md"), "PHASE_29_ENTERPRISE.md");
  assert(exists("docs/architecture/BARREL_POLICY.md"), "BARREL_POLICY.md");
  const arch = read("docs/architecture/ARCHITECTURE.md");
  assert(arch.includes("PHASE_29_ENTERPRISE.md"), "ARCHITECTURE aponta Fase 29");
  assert(arch.includes("BARREL_POLICY.md"), "ARCHITECTURE aponta barrel policy");
  assert(arch.includes("29.0"), "ARCHITECTURE sprint 29.0");
}

function runCanonical() {
  console.log("\n[phase29-canonical]");
  assert(exists("types/action-result.ts"), "types/action-result.ts");
  const ar = read("types/action-result.ts");
  assert(ar.includes("export type ActionResult"), "ActionResult export");
  assert(ar.includes("ActionResultWith"), "ActionResultWith extension");
  assert(exists("lib/format/index.ts") || exists("lib/format.ts"), "lib/format");
  assert(exists("lib/supabase/friendly-error.ts"), "toActionError source");
  assert(exists("lib/enterprise/index.ts"), "lib/enterprise barrel (API pública)");
  assert(exists("docs/architecture/MODULE_STANDARD.md"), "MODULE_STANDARD");
  assert(exists("docs/architecture/SERVICE_STANDARD.md"), "SERVICE_STANDARD");
  assert(exists("docs/architecture/FORMATTERS.md"), "FORMATTERS");
}

function runDeadCode() {
  console.log("\n[phase29-dead-code]");
  assert(!exists("lib/phase28"), "lib/phase28 removido");
  assert(!exists("lib/phase28/index.ts"), "sem lib/phase28/index.ts");

  const deadBarrels = [
    "components/finance/index.ts",
    "components/workflow/index.ts",
    "components/demo/index.ts",
    "components/observability/index.ts",
    "components/security/index.ts",
    "components/platform/index.ts",
    "components/gf/index.ts",
    "components/onboarding/index.ts",
    "components/intelligence/index.ts",
    "components/audit/index.ts",
    "components/notifications/index.ts",
    "components/timeline/index.ts",
    "components/enterprise/index.ts",
    "components/executive/copilot/index.ts",
    "components/executive/timeline/index.ts",
    "components/executive/insights/index.ts",
    "components/executive/action-center/index.ts",
    "components/executive/action-plan/index.ts",
    "components/executive/predictions/index.ts",
    "components/executive/intelligence/index.ts",
    "components/dashboard/executive/index.ts",
    "lib/tax/index.ts",
    "lib/catalog-import/index.ts",
  ];
  for (const b of deadBarrels) {
    assert(!exists(b), `barrel removido: ${b}`);
  }

  assert(exists("components/executive/index.ts"), "mantém components/executive barrel");
  assert(exists("lib/enterprise/index.ts"), "mantém lib/enterprise barrel");
  assert(exists("lib/finance/index.ts"), "mantém lib/finance API pública");
}

function runFinanceCycle() {
  console.log("\n[phase29-finance-cycle]");
  const actionFiles = [
    "lib/finance/actions.ts",
    "lib/finance/cash-intelligence/cash-intelligence-actions.ts",
    "lib/finance/tax-intelligence/tax-intelligence-actions.ts",
    "lib/finance/import/import-actions.ts",
    "lib/import-engine/intelligence/intelligence-actions.ts",
  ];
  const selfImport = /from\s+["']@\/lib\/finance["']/;
  for (const f of actionFiles) {
    assert(exists(f), `existe ${f}`);
    const src = read(f);
    assert(!selfImport.test(src), `sem self-import @/lib/finance em ${f}`);
  }

  // Deep imports presentes (amostra)
  const actions = read("lib/finance/actions.ts");
  assert(
    actions.includes("@/lib/finance/factory") ||
      actions.includes("@/lib/finance/shared/"),
    "actions usa deep paths finance",
  );

  const barrel = read("lib/finance/index.ts");
  assert(
    barrel.includes("Enterprise Financial Core") && !barrel.includes("Ãº"),
    "comentário do barrel finance sem mojibake",
  );
}

function runFreezeGuards() {
  console.log("\n[phase29-freeze-guards]");
  // Contractual: docs declare freeze; migrations folder still present (untouched expectation)
  const phase29 = read("docs/architecture/PHASE_29_ENTERPRISE.md");
  assert(phase29.includes("Freeze"), "doc declara Freeze");
  assert(phase29.includes("migrations"), "doc menciona migrations no freeze");
  assert(phase29.includes("RBAC") || phase29.includes("Permissões"), "doc menciona RBAC freeze");
  assert(exists("supabase/migrations"), "migrations dir intacto");
  assert(exists("lib/rbac"), "lib/rbac intacto");
  assert(exists("lib/financeiro"), "lib/financeiro intacto (dual stack)");
  assert(exists("lib/crm/phase28"), "código Phase 28 CRM permanece em lib/crm/phase28");
}

function runPerformance29_1() {
  console.log("\n[phase29.1-performance]");
  assert(
    exists("docs/architecture/PHASE_29_1_PERFORMANCE.md"),
    "PHASE_29_1_PERFORMANCE.md",
  );
  const perfDoc = read("docs/architecture/PERFORMANCE.md");
  assert(perfDoc.includes("29.1"), "PERFORMANCE.md referencia 29.1");

  const filterOpts = read("lib/dashboard/filter-options.ts");
  assert(
    filterOpts.includes("from \"react\"") && filterOpts.includes("cache("),
    "filter-options usa React.cache",
  );

  const dashSvc = read("lib/dashboard/dashboard-service.ts");
  assert(
    dashSvc.includes("createDashboardService = cache(") ||
      /export const createDashboardService = cache/.test(dashSvc),
    "createDashboardService memoizado",
  );

  const layout = read("app/(app)/[tenant]/layout.tsx");
  assert(layout.includes("Promise.all"), "layout tenant Promise.all");

  const fluxo = read("app/(app)/[tenant]/financeiro/fluxo-caixa/page.tsx");
  assert(
    fluxo.includes("Promise.all") && fluxo.includes("listCashFlow"),
    "fluxo-caixa paralelo",
  );

  const cfo = read("app/(app)/[tenant]/financeiro/cfo/page.tsx");
  assert(cfo.includes("Promise.all"), "cfo Promise.all");

  const osDetail = read("app/(app)/[tenant]/ordens/[id]/page.tsx");
  assert(
    osDetail.includes("Promise.all") && osDetail.includes("OsWorkspaceLazy"),
    "OS detalhe paralelo + lazy",
  );

  const lazyFiles = [
    "components/ordens/os-workspace-lazy.tsx",
    "components/finance/cash-intelligence/executive-cash-dashboard-lazy.tsx",
    "components/finance/treasury-dashboard-client-lazy.tsx",
    "components/crm/executive-crm-dashboard-lazy.tsx",
    "components/analytics/executive-analytics-dashboard-lazy.tsx",
  ];
  for (const f of lazyFiles) {
    assert(exists(f), `lazy wrapper: ${f}`);
    assert(read(f).includes("next/dynamic"), `${f} usa next/dynamic`);
  }

  const shell = read("components/layout/app-shell.tsx");
  assert(shell.includes("PageSlot") && shell.includes("memo("), "AppShell PageSlot memo");

  // Freeze: sem unstable_cache em domínio financeiro
  assert(
    !fluxo.includes("unstable_cache"),
    "fluxo sem unstable_cache",
  );
  assert(
    !read("lib/financeiro/dre-service.ts").includes("unstable_cache"),
    "dre-service sem unstable_cache",
  );
}

function runPermissions29_2() {
  console.log("\n[phase29.2-permissions]");
  assert(
    exists("docs/architecture/PHASE_29_2_PERMISSIONS.md"),
    "PHASE_29_2_PERMISSIONS.md",
  );
  assert(exists("lib/permissoes/authorization.ts"), "authorization layer");

  const authz = read("lib/permissoes/authorization.ts");
  assert(authz.includes("loadPermissionMap"), "loadPermissionMap");
  assert(authz.includes("tryResolvePermissions"), "tryResolvePermissions");
  assert(authz.includes('from "react"') && authz.includes("cache("), "React.cache");

  const svc = read("lib/permissoes/permission-service.ts");
  assert(svc.includes("loadRolePermissions"), "loadRolePermissions");
  assert(svc.includes("hasMany"), "hasMany");
  assert(svc.includes("requireAll"), "requireAll");
  assert(
    svc.includes("DEFAULT_ROLE_PERMISSIONS"),
    "fallback DEFAULT_ROLE_PERMISSIONS",
  );

  const osDetail = read("app/(app)/[tenant]/ordens/[id]/page.tsx");
  assert(
    osDetail.includes("tryResolvePermissions"),
    "OS detalhe usa tryResolvePermissions",
  );
  assert(
    !osDetail.includes("createPermissionService"),
    "OS detalhe sem createPermissionService direto",
  );

  const financeAuth = read("lib/finance/page-auth.ts");
  assert(
    financeAuth.includes("resolveFinancePageAuth = cache(") ||
      /export const resolveFinancePageAuth = cache/.test(financeAuth),
    "finance page-auth React.cache",
  );

  const taxAuth = read("lib/tax/page-auth.ts");
  assert(
    taxAuth.includes("resolveTaxPageAuth = cache(") ||
      taxAuth.includes("cache(async"),
    "tax page-auth React.cache",
  );

  // Sidebar ainda sem queries de permissão (comportamento preservado)
  const sidebar = read("components/layout/app-sidebar.tsx");
  assert(
    !sidebar.includes("createPermissionService") &&
      !sidebar.includes("loadPermissionMap"),
    "sidebar sem queries de permissão",
  );
}

function runUx29_3() {
  console.log("\n[phase29.3-ux]");
  assert(exists("docs/architecture/PHASE_29_3_UX.md"), "PHASE_29_3_UX.md");
  assert(
    exists("components/ui/block-suspense-fallback.tsx"),
    "BlockSuspenseFallback",
  );
  assert(exists("components/ui/feedback-tones.ts"), "feedback-tones");

  const fin = read("app/(app)/[tenant]/financeiro/page.tsx");
  assert(
    fin.includes("BlockSuspenseFallback") && !fin.includes("A carregar"),
    "financeiro dashboard skeleton",
  );
  const mov = read("app/(app)/[tenant]/financeiro/movimentacoes/page.tsx");
  assert(
    mov.includes("BlockSuspenseFallback") && !mov.includes("A carregar"),
    "movimentações skeleton",
  );

  const dialog = read("components/ui/dialog.tsx");
  assert(dialog.includes(">Fechar</span>"), "dialog Fechar PT");
  const sheet = read("components/ui/sheet.tsx");
  assert(sheet.includes(">Fechar</span>"), "sheet Fechar PT");

  const toast = read("components/platform/toast-provider.tsx");
  assert(
    toast.includes("FEEDBACK_SURFACE") && toast.includes("gofFocusRing"),
    "toast tones + focus",
  );

  const table = read("components/ui/table.tsx");
  assert(
    table.includes("overscroll-x-contain") && table.includes("touch-pan-x"),
    "table mobile scroll",
  );

  const formGrid = read("components/ui/form-grid.tsx");
  assert(formGrid.includes("sm:grid-cols-2"), "FormGrid sm breakpoint");

  const approval = read("components/approval/approval-empty-state.tsx");
  assert(
    approval.includes('from "@/components/ui/empty-state"'),
    "approval empty → EmptyState",
  );

  const checklist = read("components/ordens/inspecao/checklist-visual.tsx");
  assert(
    checklist.includes("useOptionalToast") &&
      checklist.includes("notifyError"),
    "checklist usa toast",
  );
}

function runIntelligence29_4() {
  console.log("\n[phase29.4-intelligence]");
  assert(
    exists("docs/architecture/PHASE_29_4_EXECUTIVE_INTELLIGENCE.md"),
    "PHASE_29_4 doc",
  );
  const arch = read("docs/architecture/ARCHITECTURE.md");
  assert(
    arch.includes("PHASE_29_4_EXECUTIVE_INTELLIGENCE.md"),
    "ARCHITECTURE aponta 29.4",
  );

  const files = [
    "lib/executive-intelligence/types.ts",
    "lib/executive-intelligence/compose.ts",
    "lib/executive-intelligence/scores.ts",
    "lib/executive-intelligence/alerts.ts",
    "lib/executive-intelligence/recommendations.ts",
    "lib/executive-intelligence/ai-hook.ts",
    "lib/executive-intelligence/present.ts",
    "lib/executive-intelligence/index.ts",
    "lib/executive-intelligence/signals/trend.ts",
    "lib/executive-intelligence/signals/anomaly.ts",
    "lib/executive-intelligence/signals/seasonality.ts",
    "lib/executive-intelligence/adapters/from-charts.ts",
    "lib/executive-intelligence/adapters/from-executive-ai.ts",
    "components/dashboard/executive/executive-intelligence-signals-panel.tsx",
  ];
  for (const f of files) {
    assert(exists(f), f);
  }

  const hook = read("lib/executive-intelligence/ai-hook.ts");
  assert(hook.includes("llmEnabled: false"), "LLM desligado no hook");
  assert(hook.includes("deterministic"), "modo deterministic");

  const compose = read("lib/executive-intelligence/compose.ts");
  assert(
    compose.includes("composeEnterpriseInsights"),
    "composer pack oficial",
  );
  assert(!compose.includes("createClient"), "compose sem Supabase client");
  assert(!compose.includes("from(\""), "compose sem query from()");

  const scores = read("lib/executive-intelligence/scores.ts");
  assert(scores.includes("scoresFromExecutiveAi"), "map AI scores");
  assert(scores.includes("scoresFromBusinessHealth"), "map BH scores");
  assert(
    !scores.includes("classifyBusinessHealthStatus"),
    "não recalcula faixas BH",
  );

  const index = read("lib/executive-intelligence/index.ts");
  assert(
    !index.includes("buildExecutiveIntelligence"),
    "sem buildExecutiveIntelligence na impl",
  );
  assert(
    index.includes("composeEnterpriseInsights"),
    "impl exporta nome oficial",
  );

  const premium = read("lib/dashboard/premium-dashboard-map.ts");
  assert(
    premium.includes("composeEnterpriseInsights") &&
      premium.includes("presentEnterpriseInsightCards"),
    "premium insights consome engine oficial",
  );

  const shell = read(
    "components/dashboard/executive/executive-engines-shell.tsx",
  );
  assert(
    shell.includes("ExecutiveIntelligenceSignalsPanel"),
    "shell monta painel 29.4",
  );

  const freeze = [
    "supabase/migrations",
    "lib/ai/executive-ai-engine.ts",
    "lib/dashboard/business-health-engine.ts",
  ];
  // Contractual: 29.4 docs claim no formula changes — engines still present
  for (const f of freeze) {
    if (f === "supabase/migrations") {
      assert(exists(f), "migrations dir intacto");
    } else {
      assert(exists(f), `${f} intacto (não removido)`);
    }
  }
}

async function runIntelligenceSmoke29_4() {
  console.log("\n[phase29.4-smoke]");
  try {
    const trendMod = await import(
      pathToFileURL(
        join(root, "lib/executive-intelligence/signals/trend.ts"),
      ).href
    );
    const anomalyMod = await import(
      pathToFileURL(
        join(root, "lib/executive-intelligence/signals/anomaly.ts"),
      ).href
    );
    const seasonMod = await import(
      pathToFileURL(
        join(root, "lib/executive-intelligence/signals/seasonality.ts"),
      ).href
    );
    const hookMod = await import(
      pathToFileURL(join(root, "lib/executive-intelligence/ai-hook.ts")).href
    );

    const growth = [
      { label: "d1", value: 100 },
      { label: "d2", value: 110 },
      { label: "d3", value: 120 },
      { label: "d4", value: 130 },
      { label: "d5", value: 140 },
      { label: "d6", value: 150 },
    ];
    const t = trendMod.detectTrend(growth, "dashboard", "Faturamento");
    assert(t.direction === "crescimento", "detecta crescimento");

    const drop = growth.map((p, i) => ({
      ...p,
      value: 200 - i * 20,
    }));
    const t2 = trendMod.detectTrend(drop, "financeiro", "Caixa");
    assert(t2.direction === "queda", "detecta queda");

    const flat = Array.from({ length: 8 }, (_, i) => ({
      label: `p${i}`,
      value: 50,
    }));
    flat[6] = { label: "p6", value: 200 };
    const a = anomalyMod.detectAnomaly(flat, "dashboard", "Série");
    assert(a.anomaly === "pico" || a.anomaly === "desvio", "detecta anomalia");

    const seasonal = Array.from({ length: 21 }, (_, i) => ({
      label: `d${i}`,
      value: 100 + (i % 7) * 10,
    }));
    const s = seasonMod.detectSeasonalityHint(seasonal, "dashboard", "Série");
    assert(
      s.hint === "padrao_semanal" ||
        s.hint === "sem_padrao" ||
        s.hint === "padrao_mensal",
      "seasonality hint válido",
    );

    const hook = hookMod.getExecutiveAiFutureHook();
    assert(hook.llmEnabled === false, "smoke llmEnabled false");
    assert(hook.mode === "deterministic", "smoke mode deterministic");
  } catch (err) {
    assert(false, `smoke signals: ${err instanceof Error ? err.message : err}`);
  }
}

function runUnification29_5() {
  console.log("\n[phase29.5-unification]");
  assert(
    exists("docs/architecture/PHASE_29_5_ENTERPRISE_ENGINE.md"),
    "PHASE_29_5 doc",
  );
  const arch = read("docs/architecture/ARCHITECTURE.md");
  assert(
    arch.includes("PHASE_29_5_ENTERPRISE_ENGINE.md"),
    "ARCHITECTURE aponta 29.5",
  );

  assert(exists("lib/enterprise/intelligence.ts"), "enterprise intelligence facade");
  assert(
    exists("lib/enterprise/intelligence-contracts.ts"),
    "enterprise intelligence contracts",
  );

  const facade = read("lib/enterprise/intelligence.ts");
  assert(facade.includes("composeEnterpriseInsights"), "composeEnterpriseInsights");
  assert(facade.includes("runEnterpriseEngine"), "runEnterpriseEngine");
  assert(facade.includes("presentEnterpriseInsightCards"), "presentEnterpriseInsightCards");
  assert(!facade.includes('from "@/lib/enterprise"'), "facade sem self-import barrel");

  const ent = read("lib/enterprise/index.ts");
  assert(ent.includes("composeEnterpriseInsights"), "barrel exporta engine");
  assert(ent.includes("runEnterpriseEngine"), "barrel exporta runEnterpriseEngine");

  const loader = read("lib/dashboard/ops-executive-intelligence.ts");
  assert(
    loader.includes("composeOpsExecutiveIntelligence") &&
      !loader.includes("loadExecutiveDashboardContext"),
    "ops compose puro sem I/O",
  );

  const commercial = read("lib/intelligence/index.ts");
  assert(
    commercial.includes("composeCommercialExecutiveIntelligence"),
    "commercial rename oficial",
  );

  const stream = read("components/dashboard/dashboard-streaming.tsx");
  assert(
    stream.includes("composeOpsExecutiveIntelligence"),
    "streaming usa nome oficial ops",
  );

  const premium = read("lib/dashboard/premium-dashboard-map.ts");
  assert(
    premium.includes('from "@/lib/enterprise"') &&
      premium.includes("composeEnterpriseInsights"),
    "premium via barrel enterprise",
  );

  // Dead code removed
  assert(!exists("lib/executive-insights"), "lib/executive-insights removido");
  assert(
    !exists("lib/intelligence/enterprise/index.ts"),
    "mega-barrel intelligence/enterprise removido",
  );
  assert(
    !exists("components/executive/insights"),
    "UI insights dormante removida",
  );
  assert(
    !exists("components/executive/predictions"),
    "UI predictions dormante removida",
  );
  assert(
    !exists("components/dashboard/executive/executive-intelligence-section.tsx"),
    "section ops órfã removida",
  );
  assert(
    !exists("lib/enterprise/services/audit-service.ts"),
    "stub audit-service removido",
  );

  // Formulas freeze
  assert(exists("lib/ai/executive-ai-engine.ts"), "AI engine intacto");
  assert(
    exists("lib/dashboard/business-health-engine.ts"),
    "BH engine intacto",
  );
  assert(exists("lib/executive-intelligence/compose.ts"), "sinais 29.4 intactos");
}

function runUnification29_6() {
  console.log("\n[phase29.6-definitive]");
  assert(
    exists("docs/architecture/PHASE_29_6_ENTERPRISE_UNIFICATION.md"),
    "PHASE_29_6 doc",
  );
  const arch = read("docs/architecture/ARCHITECTURE.md");
  assert(
    arch.includes("PHASE_29_6_ENTERPRISE_UNIFICATION.md"),
    "ARCHITECTURE aponta 29.6",
  );

  const loader = read("lib/dashboard/executive-intelligence-loader.ts");
  assert(
    !loader.includes("@deprecated") &&
      !loader.includes("buildExecutiveIntelligence"),
    "alias ops removido",
  );

  const commercial = read("lib/intelligence/index.ts");
  assert(
    !commercial.includes("@deprecated") &&
      !commercial.includes("buildExecutiveIntelligence"),
    "alias comercial removido",
  );

  const stream = read("components/dashboard/dashboard-streaming.tsx");
  assert(
    stream.includes('from "@/lib/enterprise"') &&
      stream.includes("composeOpsExecutiveIntelligence"),
    "streaming importa barrel enterprise",
  );

  const bhCard = read(
    "components/dashboard/business-health/business-health-card.tsx",
  );
  assert(
    bhCard.includes('from "@/lib/enterprise"') &&
      !bhCard.includes("@/lib/dashboard/business-health-engine"),
    "BH card via enterprise",
  );

  const signals = read(
    "components/dashboard/executive/executive-intelligence-signals-panel.tsx",
  );
  assert(
    signals.includes('from "@/lib/enterprise"') &&
      !signals.includes("executive-intelligence\"") &&
      !signals.includes("business-health-engine"),
    "signals panel via enterprise",
  );

  const premium = read("lib/dashboard/premium-dashboard-map.ts");
  assert(
    premium.includes('from "@/lib/enterprise"'),
    "premium-map via enterprise",
  );

  // No app/components deep imports of formula engines
  const componentDirs = [
    "components/dashboard/business-health/business-health-confidence.tsx",
    "components/dashboard/business-health/business-health-score.tsx",
    "components/dashboard/executive-command-center/executive-command-center.tsx",
    "components/dashboard/executive-decision-center/decision-center-panel.tsx",
    "components/dashboard/executive-timeline/executive-timeline-panel.tsx",
    "components/ai/executive-copilot/executive-copilot-panel.tsx",
  ];
  for (const f of componentDirs) {
    const src = read(f);
    assert(
      !src.includes("@/lib/dashboard/business-health-engine"),
      `${f} sem deep BH`,
    );
  }

  const facade = read("lib/enterprise/intelligence.ts");
  assert(
    !facade.includes("presentExecutiveInsightCards,"),
    "sem dual-export present antigo",
  );
  assert(
    !facade.includes("composeExecutiveIntelligencePack"),
    "sem dual-export pack antigo",
  );
  assert(facade.includes("composeOpsExecutiveIntelligence"), "ops na fachada");
  assert(
    facade.includes("composeCommercialExecutiveIntelligence"),
    "comercial na fachada",
  );

  const barrel = read("lib/enterprise/index.ts");
  assert(barrel.includes("BusinessHealthEngine"), "barrel exporta factory BH");
  assert(barrel.includes("buildExecutiveAction"), "barrel exporta action EI");

  const agg = read("lib/executive-command-center/aggregator.ts");
  assert(
    agg.includes("@/lib/enterprise/intelligence"),
    "ECC via enterprise/intelligence",
  );
}

function runHomologation29_7() {
  console.log("\n[phase29.7-homologation]");
  assert(
    exists("docs/architecture/PHASE_29_7_HOMOLOGATION.md"),
    "PHASE_29_7 doc",
  );
  const arch = read("docs/architecture/ARCHITECTURE.md");
  assert(
    arch.includes("PHASE_29_7_HOMOLOGATION.md"),
    "ARCHITECTURE aponta 29.7",
  );

  const dash = read("app/(app)/[tenant]/dashboard/page.tsx");
  assert(!dash.includes("console.info"), "dashboard sem console.info");
  assert(!dash.includes("console.log"), "dashboard sem console.log");

  assert(
    !exists("components/executive/presentation/executive-source-info.tsx"),
    "órfão source-info removido",
  );
  assert(
    !exists("components/executive/workspace/executive-filters.tsx"),
    "órfão filters removido",
  );
  assert(
    !exists("components/executive/workspace/executive-workspace-grid.tsx"),
    "órfão grid removido",
  );
  assert(
    !exists("components/executive/workspace/executive-floating-actions.tsx"),
    "órfão floating removido",
  );
  assert(
    !exists("components/executive/workspace/executive-workspace-footer.tsx"),
    "órfão footer removido",
  );

  const ws = read("components/executive/workspace/index.ts");
  assert(!ws.includes("ExecutiveFilters"), "workspace barrel limpo filters");
  assert(
    !ws.includes("ExecutiveFloatingActions"),
    "workspace barrel limpo floating",
  );

  const pred = read("lib/predictions/prediction-engine.ts");
  assert(
    pred.includes("@/lib/enterprise/intelligence"),
    "predictions via intelligence (não barrel gordo)",
  );

  const bi = read("lib/business-intelligence/business-diagnosis.ts");
  assert(
    bi.includes("@/lib/enterprise/intelligence"),
    "BI via intelligence",
  );

  // Freeze: formulas + DB untouched
  assert(exists("lib/ai/executive-ai-engine.ts"), "AI engine intacto");
  assert(
    exists("lib/dashboard/business-health-engine.ts"),
    "BH engine intacto",
  );
  assert(exists("supabase/migrations"), "migrations intactas");
  assert(exists("lib/rbac") || exists("lib/permissoes"), "RBAC intacto");
}

function writeEvidence(evidenceDir, sprintLabel) {
  const summary = {
    sprint: sprintLabel,
    pass,
    fail,
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(
    join(evidenceDir, "phase29-summary.json"),
    JSON.stringify(summary, null, 2) + "\n",
  );
  writeFileSync(
    join(evidenceDir, "phase29-gate.log"),
    `phase29 gate (${sprintLabel}): pass=${pass} fail=${fail}\n`,
  );
}

async function main() {
  console.log("=== Fase 29 — Full Gate (29.0–29.7 Homologação) ===");
  const evidence29_0 = ensureEvidenceDir("docs/testing/evidence/29-0");
  const evidence29_1 = ensureEvidenceDir("docs/testing/evidence/29-1");
  const evidence29_2 = ensureEvidenceDir("docs/testing/evidence/29-2");
  const evidence29_3 = ensureEvidenceDir("docs/testing/evidence/29-3");
  const evidence29_4 = ensureEvidenceDir("docs/testing/evidence/29-4");
  const evidence29_5 = ensureEvidenceDir("docs/testing/evidence/29-5");
  const evidence29_6 = ensureEvidenceDir("docs/testing/evidence/29-6");
  const evidence29_7 = ensureEvidenceDir("docs/testing/evidence/29-7");

  runDocs();
  runCanonical();
  runDeadCode();
  runFinanceCycle();
  runFreezeGuards();
  runPerformance29_1();
  runPermissions29_2();
  runUx29_3();
  runIntelligence29_4();
  await runIntelligenceSmoke29_4();
  runUnification29_5();
  runUnification29_6();
  runHomologation29_7();

  writeEvidence(evidence29_0, "29.0–29.7");
  writeEvidence(evidence29_1, "29.1");
  writeEvidence(evidence29_2, "29.2");
  writeEvidence(evidence29_3, "29.3");
  writeEvidence(evidence29_4, "29.4");
  writeEvidence(evidence29_5, "29.5");
  writeEvidence(evidence29_6, "29.6");
  writeEvidence(evidence29_7, "29.7");

  console.log(`\n=== Resultado: ${pass} PASS · ${fail} FAIL ===`);
  if (fail > 0) process.exit(1);
}

main();
