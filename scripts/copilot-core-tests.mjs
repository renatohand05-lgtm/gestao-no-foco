#!/usr/bin/env node
/** Copilot Core — 27.2 */
process.env.INTELLIGENCE_TEST_MEMORY = "1";
import { clearEvidenceForTests } from "../lib/intelligence/enterprise/evidence/registry.ts";
import { clearIntelligenceAuditForTests } from "../lib/intelligence/enterprise/audit/recorder.ts";
import { resetIntelligenceBudgetForTests } from "../lib/intelligence/enterprise/cost/guard.ts";
import {
  runExecutiveCopilot,
  COPILOT_SUGGESTIONS,
  hasIntelligencePermission,
} from "../lib/intelligence/enterprise/copilot/core.ts";

let pass = 0, fail = 0;
const assert = (c, m) => { if (c) { pass++; console.log("  PASS ", m); } else { fail++; console.log("  FAIL ", m); } };

console.log("\nCopilot Core — 27.2\n");
clearEvidenceForTests();
clearIntelligenceAuditForTests();
resetIntelligenceBudgetForTests();

assert(COPILOT_SUGGESTIONS.length >= 8, "sugestões");
assert(hasIntelligencePermission(["inteligencia.perguntar"], "inteligencia.perguntar"), "perm ok");
assert(!hasIntelligencePermission([], "inteligencia.perguntar"), "perm deny");

const forbidden = await runExecutiveCopilot({
  request: {
    tenantId: "t1",
    userId: "u1",
    permissions: [],
    module: "inteligencia",
    intent: "daily_brief",
    correlationId: "c1",
  },
  metrics: [],
});
assert(forbidden.status === "forbidden", "forbidden sem permissão");

const ok = await runExecutiveCopilot({
  request: {
    tenantId: "t1",
    userId: "u1",
    permissions: ["inteligencia.perguntar", "inteligencia.visualizar"],
    module: "inteligencia",
    intent: "identify_risks",
    question: "Qual é meu maior risco?",
    correlationId: "c2",
    requestedMode: "deterministic",
  },
  metrics: [
    { key: "saldoAtual", value: 1000, source: "cash", available: true },
    { key: "estoqueAbaixoMinimo", value: 2, source: "estoque", available: true },
  ],
  slug: "demo",
});
assert(ok.mode === "deterministic", "mode deterministic");
assert(ok.provider.isExternal === false, "não externo");
assert(ok.auditId.length > 0, "audit");
assert(ok.confidence.level !== undefined, "confidence");
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
