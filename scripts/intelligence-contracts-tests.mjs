#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass=0, fail=0;
function assert(c,m){ if(c){pass++; console.log("  PASS ",m);} else {fail++; console.log("  FAIL ",m);} }
function read(p){ return readFileSync(join(root,p),"utf8"); }
function exists(p){ return existsSync(join(root,p)); }

console.log("\nIntelligence Contracts — 27.0\n");
const t = read("lib/intelligence/enterprise/types.ts");
for (const k of ["IntelligenceRequest","IntelligenceResponse","EvidenceItem","ConfidenceResult","Recommendation","ActionPlan","SimulationScenario","IntelligenceMode"]) {
  assert(t.includes(k), k);
}
assert(t.includes('"deterministic"'), "mode deterministic");
assert(t.includes('"provider_assisted"'), "mode provider");
assert(t.includes('"unavailable"'), "mode unavailable");
console.log("\nResultado:", pass, "PASS ·", fail, "FAIL\n");
process.exit(fail>0?1:0);
