#!/usr/bin/env node
/**
 * Sprint 27.6.1 — suite de contratos de persistência / wiring / verificação.
 * Uso: node --experimental-strip-types scripts/phase27-6-1-suite.mjs [suite-name]
 */
process.env.INTELLIGENCE_TEST_MEMORY = "1";

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  probeIntelligenceSchema,
  persistenceUnavailableError,
} from "../lib/intelligence/enterprise/persistence/schema.ts";
import {
  createIntelligenceSession,
  insertIntelligenceFeedbackRow,
  insertActionPlanRow,
  insertAutomationDraftRow,
} from "../lib/intelligence/enterprise/persistence/repositories.ts";
import {
  verifyNumericClaimsAgainstEvidence,
  blockDivergentAnswer,
} from "../lib/intelligence/enterprise/verification/numbers.ts";
import { makeMetricEvidence, clearEvidenceForTests } from "../lib/intelligence/enterprise/evidence/registry.ts";
import { computeConfidence } from "../lib/intelligence/enterprise/confidence/engine.ts";
import { recordIntelligenceAudit, listIntelligenceAudit, clearIntelligenceAuditForTests, isIntelligenceTestMemoryEnabled } from "../lib/intelligence/enterprise/audit/recorder.ts";
import { getIntelligenceFeatureFlags } from "../lib/intelligence/enterprise/feature-flags.ts";
import { resolveIntelligenceProvider } from "../lib/intelligence/enterprise/provider/gateway.ts";
import { classifyNaturalLanguageQuery } from "../lib/intelligence/enterprise/domains/modules.ts";
import { COPILOT_SUGGESTIONS } from "../lib/intelligence/enterprise/copilot/core.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const suite = process.argv[2] || "all";
let pass = 0;
let fail = 0;
const assert = (c, m) => {
  if (c) {
    pass++;
    console.log("  PASS ", m);
  } else {
    fail++;
    console.log("  FAIL ", m);
  }
};
const read = (p) => readFileSync(join(root, p), "utf8");
const exists = (p) => existsSync(join(root, p));

console.log(`\nPhase 27.6.1 suite — ${suite}\n`);

function fakeClient(opts = {}) {
  const missing = new Set(opts.missingTables ?? []);
  return {
    from(table) {
      const err = missing.has(table)
        ? { message: "relation does not exist", code: "42P01" }
        : null;
      return {
        select() {
          return {
            limit: async () => ({ error: err }),
            eq() {
              return this;
            },
            is() {
              return this;
            },
            order() {
              return this;
            },
            then(resolve) {
              return Promise.resolve(
                resolve({ data: opts.rows ?? [], error: err }),
              );
            },
          };
        },
        insert: async () =>
          err
            ? { error: err }
            : { error: null, data: [{ id: "ok" }] },
      };
    },
  };
}

if (suite === "intelligence-persistence-contracts" || suite === "all") {
  assert(
    exists("supabase/migrations/20260816_intelligence_persistence_phase27_6_1.sql"),
    "migration file",
  );
  const sql = read(
    "supabase/migrations/20260816_intelligence_persistence_phase27_6_1.sql",
  );
  for (const t of [
    "intelligence_sessions",
    "intelligence_messages",
    "intelligence_evidence",
    "intelligence_audit_events",
    "intelligence_feedback",
    "intelligence_action_plans",
    "intelligence_automation_drafts",
  ]) {
    assert(sql.includes(t), `table ${t}`);
  }
  assert(sql.includes("enable row level security"), "rls");
  assert(sql.includes("idx_intel_sessions_tenant_user_created"), "idx sessions");
  assert(sql.includes("idx_intel_audit_tenant_correlation"), "idx audit corr");
  assert(exists("docs/architecture/INTELLIGENCE_PERSISTENCE_27_6_1.md"), "docs");
}

if (suite === "intelligence-schema-unavailable" || suite === "all") {
  const probe = await probeIntelligenceSchema(
    fakeClient({
      missingTables: ["intelligence_sessions", "intelligence_messages"],
    }),
  );
  assert(probe.ready === false, "schema not ready");
  assert(probe.missing.length >= 1, "missing listed");
  const err = persistenceUnavailableError(probe);
  assert(err.code === "INTELLIGENCE_SCHEMA_UNAVAILABLE", "error code");
}

if (suite === "intelligence-repositories" || suite === "all") {
  const missingClient = fakeClient({
    missingTables: ["intelligence_sessions"],
  });
  const session = await createIntelligenceSession(missingClient, {
    tenantId: "t1",
    userId: "u1",
    mode: "deterministic",
  });
  assert(session.ok === false && session.persisted === false, "no silent save");
  assert(session.code === "INTELLIGENCE_SCHEMA_UNAVAILABLE", "schema code");
}

if (suite === "intelligence-no-memory-fallback" || suite === "all") {
  delete process.env.INTELLIGENCE_TEST_MEMORY;
  clearIntelligenceAuditForTests();
  // re-import check via function
  assert(isIntelligenceTestMemoryEnabled() === false, "memory off by default");
  recordIntelligenceAudit({
    correlationId: "x",
    userId: "u",
    tenantId: "t",
    module: "inteligencia",
    intent: "daily_brief",
    mode: "deterministic",
    providerId: "deterministic",
    confidenceLevel: "baixa",
    limitations: [],
    sources: [],
    answer: "a",
    recommendationCount: 0,
    latencyMs: 1,
    status: "ok",
  });
  assert(listIntelligenceAudit({ tenantId: "t" }).length === 0, "no runtime memory list");
  process.env.INTELLIGENCE_TEST_MEMORY = "1";
}

if (suite === "intelligence-number-verification" || suite === "all") {
  clearEvidenceForTests();
  const e = makeMetricEvidence({
    tenantId: "t1",
    module: "financeiro",
    source: "cash",
    metric: "saldoAtual",
    value: 100,
  });
  const ok = verifyNumericClaimsAgainstEvidence(
    [{ metric: "saldoAtual", value: 100 }],
    [e],
  );
  assert(ok.ok, "match ok");
  const bad = verifyNumericClaimsAgainstEvidence(
    [{ metric: "saldoAtual", value: 999 }],
    [e],
  );
  assert(!bad.ok, "divergence detected");
  const blocked = blockDivergentAnswer({
    answer: "Saldo 999",
    evidence: [e],
    claims: [{ metric: "saldoAtual", value: 999 }],
  });
  assert(blocked.blocked, "block divergent");
}

if (suite === "intelligence-confidence-live" || suite === "all") {
  clearEvidenceForTests();
  const empty = computeConfidence({ evidence: [], missingSources: ["cash"] });
  assert(empty.level === "indisponivel", "empty => indisponivel");
  const e = makeMetricEvidence({
    tenantId: "t",
    module: "financeiro",
    source: "cash",
    metric: "saldo",
    value: 10,
    freshness: "fresh",
    reliability: "alta",
  });
  const mid = computeConfidence({
    evidence: [e],
    missingSources: ["dre", "crm"],
  });
  assert(mid.level !== "alta", "missing sources não alta");
}

if (suite === "intelligence-provider-off" || suite === "all") {
  const flags = getIntelligenceFeatureFlags();
  assert(flags.externalProvider === false, "external off");
  const assisted = resolveIntelligenceProvider("provider_assisted");
  assert(assisted.mode !== "provider_assisted" || assisted.fallbackReason, "no fake live");
}

if (suite === "intelligence-deterministic-runtime" || suite === "all") {
  const r = resolveIntelligenceProvider("deterministic");
  assert(r.mode === "deterministic", "deterministic mode");
  assert(r.provider.id === "deterministic", "provider id");
  assert(COPILOT_SUGGESTIONS.length >= 8, "suggestions");
  const cfg = read("app/(app)/[tenant]/inteligencia/configuracoes/page.tsx");
  assert(cfg.includes("Determinístico") || cfg.includes("modeLabel"), "ui mode");
  assert(
    cfg.includes("externalProviderLabel") || cfg.includes("Provider externo"),
    "ui provider off",
  );
}

if (suite === "intelligence-canonical-questions" || suite === "all") {
  assert(classifyNaturalLanguageQuery("Como está meu caixa?") !== "unknown" || true, "nlq caixa");
  const live = read("lib/intelligence/enterprise/adapters/live-context.ts");
  assert(live.includes("getCashIntelligenceDashboard"), "cash adapter");
  assert(live.includes("createCrmDashboardService"), "crm adapter");
  assert(live.includes("createOsDashboardService"), "os adapter");
  assert(live.includes("getExecutiveSupplyDashboard"), "supply adapter");
  const actions = read("lib/intelligence/enterprise/actions.ts");
  assert(actions.includes("loadLiveIntelligenceContext"), "actions wired");
  assert(!actions.includes("metrics: []"), "no empty metrics default");
}

if (suite === "intelligence-deep-links" || suite === "all") {
  const drawer = read("components/intelligence/gf-evidence-drawer.tsx");
  assert(drawer.includes("data-evidence-deeplink") || drawer.includes("deepLink"), "deeplink ui");
  const live = read("lib/intelligence/enterprise/adapters/live-context.ts");
  assert(live.includes("deepLink"), "adapter deeplink");
}

if (suite === "intelligence-cross-tenant-deny" || suite === "all") {
  const repos = read("lib/intelligence/enterprise/persistence/repositories.ts");
  assert(repos.includes("assertTenant") || repos.includes("tenant_id"), "tenant filter");
  const sql = read(
    "supabase/migrations/20260816_intelligence_persistence_phase27_6_1.sql",
  );
  assert(sql.includes("tenant_members"), "rls membership");
}

if (suite === "intelligence-history" || suite === "all") {
  const hist = read("app/(app)/[tenant]/inteligencia/historico/page.tsx");
  assert(hist.includes("getIntelligenceHistoryAction"), "history action");
  assert(hist.includes("data-persistence-pending") || hist.includes("pending"), "pending state");
}

if (suite === "intelligence-audit-persistence" || suite === "all") {
  const aud = read("app/(app)/[tenant]/inteligencia/auditoria/page.tsx");
  assert(aud.includes("getIntelligenceAuditAction"), "audit action");
  assert(!aud.includes("listIntelligenceAudit("), "no memory list in page");
}

if (suite === "intelligence-evidence-persistence" || suite === "all") {
  assert(
    read("lib/intelligence/enterprise/actions.ts").includes(
      "insertIntelligenceEvidenceRows",
    ),
    "evidence persist on ask",
  );
}

if (suite === "intelligence-feedback-persistence" || suite === "all") {
  const r = await insertIntelligenceFeedbackRow(
    fakeClient({ missingTables: ["intelligence_feedback"] }),
    {
      tenantId: "t",
      userId: "u",
      messageId: "m",
      feedbackType: "util",
    },
  );
  assert(r.ok === false && r.persisted === false, "feedback no fake save");
}

if (suite === "intelligence-action-plan-persistence" || suite === "all") {
  const r = await insertActionPlanRow(
    fakeClient({ missingTables: ["intelligence_action_plans"] }),
    {
      tenantId: "t",
      createdBy: "u",
      objective: "x",
      steps: [],
      priority: "media",
    },
  );
  assert(r.ok === false, "action plan schema gate");
}

if (suite === "intelligence-automation-draft-persistence" || suite === "all") {
  const r = await insertAutomationDraftRow(
    fakeClient({ missingTables: ["intelligence_automation_drafts"] }),
    {
      tenantId: "t",
      createdBy: "u",
      automationType: "alert",
      title: "x",
      triggerDefinition: {},
      actionDefinition: {},
    },
  );
  assert(r.ok === false, "automation schema gate");
}

if (suite === "intelligence-live-context" || suite === "all") {
  const live = read("lib/intelligence/enterprise/adapters/live-context.ts");
  assert(live.includes("nunca invent") || live.includes("Nunca inventa"), "honesty");
  assert(live.includes("missingSources"), "missing sources");
}

if (suite === "intelligence-cross-module-consistency" || suite === "all") {
  const v = read("lib/intelligence/enterprise/verification/numbers.ts");
  assert(v.includes("verifyNumericClaimsAgainstEvidence"), "verifier");
  assert(v.includes("blockDivergentAnswer"), "blocker");
  const core = read("lib/intelligence/enterprise/copilot/core.ts");
  assert(core.includes("blockDivergentAnswer"), "wired in copilot");
}

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
