#!/usr/bin/env node
/** Output validation + tenant isolation — 27.2 */
import { clearEvidenceForTests, makeMetricEvidence } from "../lib/intelligence/enterprise/evidence/registry.ts";
import {
  validateIntelligenceOutput,
  safeBlockedResponse,
} from "../lib/intelligence/enterprise/output/validation.ts";

let pass = 0, fail = 0;
const assert = (c, m) => { if (c) { pass++; console.log("  PASS ", m); } else { fail++; console.log("  FAIL ", m); } };

console.log("\nOutput Validation — 27.2\n");
clearEvidenceForTests();
const ev = makeMetricEvidence({
  tenantId: "t1",
  module: "financeiro",
  source: "cash",
  metric: "saldo",
  value: 10,
});

const base = {
  id: "1",
  tenantId: "t1",
  mode: "deterministic",
  status: "ok",
  answer: "Saldo ok",
  summary: "s",
  evidence: [ev],
  confidence: {
    level: "media",
    score: 0.5,
    coverage: 0.5,
    freshness: 1,
    consistency: 1,
    sampleSize: 1,
    sourceCount: 1,
    missingSources: [],
    explanation: "x",
  },
  limitations: [],
  recommendations: [
    {
      id: "r1",
      title: "t",
      summary: "s",
      rationale: "r",
      priority: "media",
      impact: "baixo",
      effort: "baixo",
      urgency: "baixa",
      confidence: {
        level: "media",
        score: 0.5,
        coverage: 0.5,
        freshness: 1,
        consistency: 1,
        sampleSize: 1,
        sourceCount: 1,
        missingSources: [],
        explanation: "x",
      },
      sourceEvidenceIds: [ev.id],
      module: "financeiro",
      requiresApproval: true,
    },
  ],
  actions: [],
  createdAt: new Date().toISOString(),
  provider: {
    id: "deterministic",
    label: "det",
    kind: "deterministic",
    model: null,
    isExternal: false,
  },
  model: null,
  tokenUsage: null,
  latencyMs: 1,
  auditId: "a",
  correlationId: "c",
};

assert(validateIntelligenceOutput(base, "t1").ok, "valid ok");
assert(!validateIntelligenceOutput(base, "t2").ok, "tenant mismatch");
const bad = {
  ...base,
  answer: "Receita R$ 999999",
  evidence: [],
  recommendations: [],
};
assert(!validateIntelligenceOutput(bad, "t1").ok, "numeric without evidence");
const blocked = safeBlockedResponse(bad, ["numeric_claim_without_evidence"]);
assert(blocked.status === "error", "blocked status");
assert(!blocked.answer.includes("999999"), "sem número inventado");
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
