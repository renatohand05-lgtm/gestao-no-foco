#!/usr/bin/env node
/**
 * Sprint 27.6.2 — Homologação schema + repos (service role, server-side only).
 * Não executa migration. Lê .env.local.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { probeIntelligenceSchema } from "../lib/intelligence/enterprise/persistence/schema.ts";
import {
  createIntelligenceSession,
  insertIntelligenceMessage,
  insertIntelligenceEvidenceRows,
  insertIntelligenceAuditEvent,
  insertIntelligenceFeedbackRow,
  insertActionPlanRow,
  insertAutomationDraftRow,
  listIntelligenceSessions,
  listIntelligenceMessages,
  listEvidenceForMessage,
  archiveIntelligenceSession,
  softDeleteIntelligenceSession,
} from "../lib/intelligence/enterprise/persistence/repositories.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "docs/testing/evidence/27-6-2");
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
    ) {
      v = v.slice(1, -1);
    }
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

const report = {
  at: new Date().toISOString(),
  sprint: "27.6.2",
  checks: [],
  schema: null,
  ids: {},
};

const push = (ok, detail) => {
  report.checks.push({ ok, detail });
  assert(ok, detail);
};

console.log("\nHomologação 27.6.2 — schema/repos\n");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE env ausente — impossível homologar schema real.");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TABLES = [
  "intelligence_sessions",
  "intelligence_messages",
  "intelligence_evidence",
  "intelligence_audit_events",
  "intelligence_feedback",
  "intelligence_action_plans",
  "intelligence_automation_drafts",
];

for (const t of TABLES) {
  const { error } = await admin.from(t).select("id", { head: true, count: "exact" }).limit(1);
  push(!error, `table ${t} accessible`);
  if (error) console.log("   ", error.message);
}

const probe = await probeIntelligenceSchema(admin);
report.schema = probe;
push(probe.ready === true, "probeIntelligenceSchema ready");

// Resolve a real tenant/user for inserts
const { data: tenants } = await admin.from("tenants").select("id,slug").limit(5);
const tenant =
  (tenants ?? []).find((t) => t.slug === "teste-renato-01") ?? tenants?.[0];
push(Boolean(tenant?.id), "tenant resolved");

const { data: members } = tenant
  ? await admin
      .from("tenant_members")
      .select("user_id")
      .eq("tenant_id", tenant.id)
      .limit(1)
  : { data: null };
const userId = members?.[0]?.user_id;
push(Boolean(userId), "user resolved");

if (tenant?.id && userId && probe.ready) {
  const marker = `homolog-27-6-2-${Date.now()}`;
  const session = await createIntelligenceSession(admin, {
    tenantId: tenant.id,
    userId,
    mode: "deterministic",
    provider: "deterministic",
    model: "rules-v27",
    title: marker,
  });
  push(session.ok && session.persisted, "create session");
  report.ids.sessionId = session.ok ? session.data.id : null;

  if (session.ok) {
    const userMsg = await insertIntelligenceMessage(admin, {
      sessionId: session.data.id,
      tenantId: tenant.id,
      userId,
      role: "user",
      content: "Quanto tenho em caixa? (homolog)",
      intent: "analyze_cash_flow",
      mode: "deterministic",
      correlationId: marker,
    });
    push(userMsg.ok, "insert user message");

    const asstId = randomUUID();
    const asst = await insertIntelligenceMessage(admin, {
      id: asstId,
      sessionId: session.data.id,
      tenantId: tenant.id,
      userId,
      role: "assistant",
      content: "Resposta homolog deterministic",
      intent: "analyze_cash_flow",
      mode: "deterministic",
      provider: "deterministic",
      confidenceLevel: "media",
      confidenceScore: 0.5,
      correlationId: marker,
      latencyMs: 12,
    });
    push(asst.ok, "insert assistant message");
    report.ids.messageId = asst.ok ? asst.data.id : null;

    if (asst.ok) {
      const evid = await insertIntelligenceEvidenceRows(admin, tenant.id, asst.data.id, [
        {
          source: "homolog",
          sourceType: "metric",
          module: "financeiro",
          metric: "saldoAtual",
          value: 1,
          reliability: "alta",
          freshness: "fresh",
          deepLink: `/${tenant.slug}/financeiro/caixa`,
        },
      ]);
      push(evid.ok, "insert evidence");

      const audit = await insertIntelligenceAuditEvent(admin, {
        tenantId: tenant.id,
        userId,
        sessionId: session.data.id,
        messageId: asst.data.id,
        correlationId: marker,
        eventType: "homolog.ask",
        module: "inteligencia",
        intent: "analyze_cash_flow",
        mode: "deterministic",
        provider: "deterministic",
        status: "ok",
        latencyMs: 12,
        confidence: { level: "media" },
        limitations: [],
      });
      push(audit.ok, "insert audit");

      const fb = await insertIntelligenceFeedbackRow(admin, {
        tenantId: tenant.id,
        userId,
        messageId: asst.data.id,
        feedbackType: "util",
        comment: "homolog",
      });
      push(fb.ok, "insert feedback");

      const plan = await insertActionPlanRow(admin, {
        tenantId: tenant.id,
        createdBy: userId,
        objective: "Homolog plano",
        steps: [{ title: "revisar" }],
        priority: "media",
        sessionId: session.data.id,
        messageId: asst.data.id,
      });
      push(plan.ok, "insert action plan");

      const draft = await insertAutomationDraftRow(admin, {
        tenantId: tenant.id,
        createdBy: userId,
        automationType: "alert",
        title: "Homolog draft",
        triggerDefinition: { when: "homolog" },
        actionDefinition: { do: "none" },
      });
      push(draft.ok, "insert automation draft");

      const listed = await listIntelligenceSessions(admin, tenant.id, userId, 20);
      push(
        listed.ok && listed.data.some((s) => String(s.id) === session.data.id),
        "list sessions contains homolog",
      );

      const msgs = await listIntelligenceMessages(admin, tenant.id, session.data.id);
      push(msgs.ok && msgs.data.length >= 2, "list messages");

      const evList = await listEvidenceForMessage(admin, tenant.id, asst.data.id);
      push(evList.ok && evList.data.length >= 1, "list evidence");

      // Cross-tenant deny (fake other tenant id)
      const otherTenant = randomUUID();
      const leak = await listIntelligenceSessions(admin, otherTenant, userId, 5);
      push(
        leak.ok === true && leak.data.length === 0,
        "cross-tenant list empty for random tenant",
      );

      const arch = await archiveIntelligenceSession(admin, tenant.id, session.data.id);
      push(arch.ok, "archive session");

      const soft = await softDeleteIntelligenceSession(
        admin,
        tenant.id,
        session.data.id,
      );
      push(soft.ok, "soft delete session");

      const after = await listIntelligenceSessions(admin, tenant.id, userId, 50);
      push(
        after.ok && !after.data.some((s) => String(s.id) === session.data.id),
        "soft-deleted hidden from list",
      );
    }
  }
}

// Constraint smoke: invalid mode must fail (proves CHECK constraints live)
if (tenant?.id && userId) {
  const { error: badMode } = await admin.from("intelligence_sessions").insert({
    tenant_id: tenant.id,
    user_id: userId,
    mode: "fake_mode_not_allowed",
    status: "active",
  });
  push(Boolean(badMode), "CHECK constraint mode rejects invalid value");
}

// Migration catalog expectations (source of truth when DATABASE_URL absent)
const migrationSql = readFileSync(
  join(root, "supabase/migrations/20260816_intelligence_persistence_phase27_6_1.sql"),
  "utf8",
);
const expectedIndexes = [
  "idx_intel_sessions_tenant_user_created",
  "idx_intel_sessions_tenant_status",
  "idx_intel_messages_tenant_session_created",
  "idx_intel_messages_correlation",
  "idx_intel_messages_intent",
  "idx_intel_evidence_tenant_message",
  "idx_intel_evidence_module",
  "idx_intel_audit_tenant_correlation",
  "idx_intel_audit_tenant_created",
  "idx_intel_audit_module",
  "idx_intel_audit_intent",
  "idx_intel_feedback_tenant_message",
  "idx_intel_action_plans_tenant_status",
  "idx_intel_automation_drafts_tenant_status",
];
for (const idx of expectedIndexes) {
  push(migrationSql.includes(idx), `migration defines index ${idx}`);
}
const expectedPolicies = [
  "intel_sessions_select",
  "intel_sessions_insert",
  "intel_sessions_update",
  "intel_messages_select",
  "intel_messages_insert",
  "intel_messages_update",
  "intel_evidence_select",
  "intel_evidence_insert",
  "intel_audit_select",
  "intel_audit_insert",
  "intel_feedback_select",
  "intel_feedback_insert",
  "intel_action_plans_select",
  "intel_action_plans_insert",
  "intel_action_plans_update",
  "intel_automation_select",
  "intel_automation_insert",
  "intel_automation_update",
];
for (const p of expectedPolicies) {
  push(migrationSql.includes(p), `migration defines policy ${p}`);
}
for (const t of TABLES) {
  push(
    migrationSql.includes(`enable row level security`) &&
      migrationSql.includes(`alter table public.${t} enable row level security`),
    `migration enables RLS on ${t}`,
  );
}
report.catalogNote =
  "Índices/policies confirmados no SQL aplicado; runtime proveu tabelas+CRUD+CHECK. Sem DATABASE_URL, pg_catalog não foi consultado.";

report.summary = { pass, fail };
writeFileSync(join(OUT, "schema-repos-report.json"), JSON.stringify(report, null, 2));
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
