#!/usr/bin/env node
/** Insight Engine — 27.2 */
import { clearEvidenceForTests } from "../lib/intelligence/enterprise/evidence/registry.ts";
import { buildContextSnapshot } from "../lib/intelligence/enterprise/context/engine.ts";
import { generateInsightsFromSnapshot } from "../lib/intelligence/enterprise/insight/engine.ts";

let pass = 0, fail = 0;
const assert = (c, m) => { if (c) { pass++; console.log("  PASS ", m); } else { fail++; console.log("  FAIL ", m); } };

console.log("\nInsight Engine — 27.2\n");
clearEvidenceForTests();
const snap = buildContextSnapshot({
  request: { tenantId: "t1" },
  metrics: [
    { key: "saldoAtual", value: -10, source: "cash", available: true },
    { key: "estoqueAbaixoMinimo", value: 3, source: "estoque", available: true },
  ],
});
const insights = generateInsightsFromSnapshot({
  tenantId: "t1",
  module: "inteligencia",
  snapshot: snap,
  slug: "demo",
});
assert(insights.length >= 1, "insights gerados");
assert(insights.every((i) => i.evidenceIds.length > 0), "todos com evidência");
assert(insights.some((i) => i.title.includes("negativo")), "risco caixa");
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
