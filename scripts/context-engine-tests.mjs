#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass=0, fail=0;
function assert(c,m){ if(c){pass++; console.log("  PASS ",m);} else {fail++; console.log("  FAIL ",m);} }
function read(p){ return readFileSync(join(root,p),"utf8"); }
function exists(p){ return existsSync(join(root,p)); }

import { buildContextSnapshot, summarizeSnapshot } from "../lib/intelligence/enterprise/context/engine.ts";
console.log("\nContext Engine — 27.1\n");
const snap = buildContextSnapshot({
  request: { tenantId: "t1", companyId: null, branchId: null, period: { preset: "30d" } },
  metrics: [
    { key: "saldoAtual", value: 100, source: "cash", available: true },
    { key: "lucro", value: null, source: "dre", available: false },
  ],
});
assert(snap.tenantId === "t1", "tenant");
assert(snap.missingData.includes("lucro"), "missing");
assert(snap.coverage > 0 && snap.coverage < 1, "partial coverage");
assert(Object.isFrozen(snap), "immutable");
assert(summarizeSnapshot(snap).includes("métricas"), "summary");
console.log("\nResultado:", pass, "PASS ·", fail, "FAIL\n");
process.exit(fail>0?1:0);
