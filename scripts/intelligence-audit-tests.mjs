#!/usr/bin/env node
process.env.INTELLIGENCE_TEST_MEMORY = "1";

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass=0, fail=0;
function assert(c,m){ if(c){pass++; console.log("  PASS ",m);} else {fail++; console.log("  FAIL ",m);} }
function read(p){ return readFileSync(join(root,p),"utf8"); }
function exists(p){ return existsSync(join(root,p)); }

import { recordIntelligenceAudit, listIntelligenceAudit, clearIntelligenceAuditForTests } from "../lib/intelligence/enterprise/audit/recorder.ts";
console.log("\nAudit — 27.0\n");
clearIntelligenceAuditForTests();
const e = recordIntelligenceAudit({
  correlationId: "abc", userId: "u1", tenantId: "t1", module: "inteligencia",
  intent: "daily_brief", mode: "deterministic", providerId: "deterministic",
  confidenceLevel: "media", limitations: [], sources: ["cash"], answer: "secret sk-abcdefghijklmnop",
  recommendationCount: 0, latencyMs: 10, status: "ok",
});
assert(e.auditId.length > 0, "audit id");
assert(!e.answerPreview.includes("sk-"), "sem secret no preview");
assert(listIntelligenceAudit({ tenantId: "t1" }).length === 1, "list tenant");
assert(listIntelligenceAudit({ tenantId: "other" }).length === 0, "isolation");
console.log("\nResultado:", pass, "PASS ·", fail, "FAIL\n");
process.exit(fail>0?1:0);
