#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass=0, fail=0;
function assert(c,m){ if(c){pass++; console.log("  PASS ",m);} else {fail++; console.log("  FAIL ",m);} }
function read(p){ return readFileSync(join(root,p),"utf8"); }
function exists(p){ return existsSync(join(root,p)); }

import { makeMetricEvidence, assertEvidencePresent, clearEvidenceForTests, getEvidence } from "../lib/intelligence/enterprise/evidence/registry.ts";
console.log("\nEvidence Engine — 27.1\n");
clearEvidenceForTests();
const e = makeMetricEvidence({ tenantId: "t1", module: "financeiro", source: "cash", metric: "saldo", value: 10, deepLink: "/x" });
assert(getEvidence(e.id)?.value === 10, "registered");
assert(assertEvidencePresent("ok", [e.id]).ok, "present");
assert(!assertEvidencePresent("bad", []).ok, "required");
console.log("\nResultado:", pass, "PASS ·", fail, "FAIL\n");
process.exit(fail>0?1:0);
