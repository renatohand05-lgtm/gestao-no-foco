#!/usr/bin/env node
/**
 * Sprint 26.10.1 — Workflow + isolation + simulation (service role).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import {
  createTaxRuleDraft,
  createNewVersionFromPublished,
  createTaxSimulation,
  ensureDemoRegime,
  ensureStructuralTaxType,
  getTaxRule,
  listTaxAuditEvents,
  listTaxRules,
  mapRuleRow,
  softDeleteTaxRule,
  transitionTaxRule,
  updateTaxRuleDraft,
} from "../lib/tax/persistence/repositories.ts";
import { resolveTaxRulePrecedence } from "../lib/tax/precedence.ts";
import { runScenarioCalculation, buildScenario } from "../lib/tax/simulation.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "docs/testing/evidence/26-10-1");
mkdirSync(OUT, { recursive: true });

function loadEnvLocal() {
  const p = join(root, ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnvLocal();

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

const report = { at: new Date().toISOString(), checks: [], ids: {} };

console.log("\nHomologação 26.10.1 — workflow/repos\n");

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data: tenants } = await admin.from("tenants").select("id,slug").limit(10);
const tenant =
  (tenants ?? []).find((t) => t.slug === "teste-renato-01") ?? tenants?.[0];
assert(Boolean(tenant?.id), "tenant");

const { data: members } = await admin
  .from("tenant_members")
  .select("user_id")
  .eq("tenant_id", tenant.id)
  .limit(1);
const userId = members?.[0]?.user_id;
assert(Boolean(userId), "user");

const type = await ensureStructuralTaxType(admin);
assert(type.ok, "tax type");
const regime = await ensureDemoRegime(admin, tenant.id);
assert(regime.ok, "demo regime");

const marker = `TESTE-HOMOLOG-26101-${Date.now()}`;
const draft = await createTaxRuleDraft(admin, {
  tenantId: tenant.id,
  createdBy: userId,
  code: marker,
  name: "[TESTE] Regra homologação 26.10.1",
  regimeId: regime.data.id,
  taxTypeId: type.data.id,
  jurisdiction: "BR",
  sourceReference: "HOMOLOG-DOC-26.10.1",
  validFrom: "2026-01-01",
  priority: 50,
  state: null,
});
assert(draft.ok, "create draft");
report.ids.ruleId = draft.ok ? draft.data.id : null;

if (draft.ok) {
  const edited = await updateTaxRuleDraft(admin, {
    tenantId: tenant.id,
    ruleId: draft.data.id,
    actorId: userId,
    patch: { name: "[TESTE] Regra homologação editada", priority: 60 },
  });
  assert(edited.ok, "edit draft");

  for (const [to, label] of [
    ["under_review", "send review"],
    ["approved", "approve"],
    ["published", "publish"],
  ]) {
    const tr = await transitionTaxRule(admin, {
      tenantId: tenant.id,
      ruleId: draft.data.id,
      actorId: userId,
      to,
    });
    assert(tr.ok, label);
  }

  const pub = await getTaxRule(admin, tenant.id, draft.data.id);
  assert(pub.ok && pub.data?.status === "published", "status published");
  assert(pub.data?.environment === "producao", "env producao");

  const blocked = await updateTaxRuleDraft(admin, {
    tenantId: tenant.id,
    ruleId: draft.data.id,
    actorId: userId,
    patch: { name: "should fail" },
  });
  assert(!blocked.ok && blocked.code === "IMMUTABLE", "block edit published");

  const neu = await createNewVersionFromPublished(admin, {
    tenantId: tenant.id,
    ruleId: draft.data.id,
    actorId: userId,
    changeReason: "Homolog nova versão",
  });
  assert(neu.ok, "new version");
  report.ids.newVersionId = neu.ok ? neu.data.id : null;

  const after = await getTaxRule(admin, tenant.id, draft.data.id);
  assert(after.ok && after.data?.status === "superseded", "old superseded");

  // Precedence: general + specific
  const g = await createTaxRuleDraft(admin, {
    tenantId: tenant.id,
    createdBy: userId,
    code: `${marker}-G`,
    name: "[TESTE] geral",
    regimeId: regime.data.id,
    taxTypeId: type.data.id,
    jurisdiction: "BR",
    sourceReference: "HOMOLOG",
    validFrom: "2026-01-01",
    priority: 10,
  });
  const s = await createTaxRuleDraft(admin, {
    tenantId: tenant.id,
    createdBy: userId,
    code: `${marker}-S`,
    name: "[TESTE] SP",
    regimeId: regime.data.id,
    taxTypeId: type.data.id,
    jurisdiction: "BR",
    sourceReference: "HOMOLOG",
    validFrom: "2026-01-01",
    priority: 10,
    state: "SP",
  });
  for (const id of [g.data?.id, s.data?.id].filter(Boolean)) {
    for (const to of ["under_review", "approved", "published"]) {
      await transitionTaxRule(admin, {
        tenantId: tenant.id,
        ruleId: id,
        actorId: userId,
        to,
      });
    }
  }
  const listed = await listTaxRules(admin, tenant.id);
  const mapped = listed.ok ? listed.data.map(mapRuleRow) : [];
  const prec = resolveTaxRulePrecedence(mapped, {
    tenantId: tenant.id,
    state: "SP",
    asOf: "2026-06-01",
    environment: "producao",
  });
  assert(prec.winner?.state === "SP" || prec.winner?.code?.includes("-S"), "specific wins");
  report.precedence = {
    winner: prec.winner?.id ?? null,
    reason: prec.reason,
    candidates: prec.candidates.length,
    decisionOrder: prec.decisionOrder,
  };

  // Simulation isolation
  const scn = buildScenario("sim1", "expected", "esp", {
    revenueGrowthPct: 10,
    rateEffective: 0.1,
  }, ["teste"], [draft.data.id]);
  const calc = runScenarioCalculation({
    scenario: scn,
    baselineRevenue: 1000,
  });
  assert(calc.totalTaxes === 110, "simulation calc");
  const sim = await createTaxSimulation(admin, {
    tenantId: tenant.id,
    createdBy: userId,
    name: "[TESTE] sim 26.10.1",
    baselinePeriod: "2026-01",
    targetPeriod: "2026-12",
    assumptions: ["teste"],
    variables: {},
    results: calc,
    confidence: calc.confidence,
    ruleVersions: [draft.data.id],
  });
  assert(sim.ok, "persist simulation");

  const audit = await listTaxAuditEvents(admin, tenant.id);
  assert(audit.ok && audit.data.length > 0, "audit events");

  // tenant isolation
  const other = randomUUID();
  const leak = await listTaxRules(admin, other);
  assert(leak.ok && leak.data.length === 0, "cross-tenant rules empty");

  // soft delete new version draft
  if (neu.ok) {
    const soft = await softDeleteTaxRule(admin, tenant.id, neu.data.id, userId);
    assert(soft.ok, "soft delete");
  }
}

report.summary = { pass, fail };
writeFileSync(join(OUT, "workflow-report.json"), JSON.stringify(report, null, 2));
console.log(`\nWorkflow: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
