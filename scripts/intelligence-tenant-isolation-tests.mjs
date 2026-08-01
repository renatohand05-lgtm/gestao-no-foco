#!/usr/bin/env node
/** Tenant isolation — 27.0/27.2 */
process.env.INTELLIGENCE_TEST_MEMORY = "1";
import { clearIntelligenceAuditForTests, recordIntelligenceAudit, listIntelligenceAudit } from "../lib/intelligence/enterprise/audit/recorder.ts";
import { clearEvidenceForTests, makeMetricEvidence, listEvidenceForTenant } from "../lib/intelligence/enterprise/evidence/registry.ts";
import { assertNoCrossTenantPayload } from "../lib/intelligence/enterprise/privacy/redact.ts";

let pass = 0, fail = 0;
const assert = (c, m) => { if (c) { pass++; console.log("  PASS ", m); } else { fail++; console.log("  FAIL ", m); } };

console.log("\nTenant Isolation — 27\n");
clearIntelligenceAuditForTests();
clearEvidenceForTests();
recordIntelligenceAudit({
  correlationId: "1", userId: "u", tenantId: "tenant-a", module: "inteligencia",
  intent: "daily_brief", mode: "deterministic", providerId: "deterministic",
  confidenceLevel: "baixa", limitations: [], sources: [], answer: "a",
  recommendationCount: 0, latencyMs: 1, status: "ok",
});
makeMetricEvidence({ tenantId: "tenant-a", module: "financeiro", source: "s", metric: "m", value: 1 });
assert(listIntelligenceAudit({ tenantId: "tenant-b" }).length === 0, "audit isolado");
assert(listEvidenceForTenant("tenant-b").length === 0, "evidence isolado");
let ok = false;
try { assertNoCrossTenantPayload("tenant-a", "tenant-a"); ok = true; } catch { ok = false; }
assert(ok, "same tenant allowed");
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
