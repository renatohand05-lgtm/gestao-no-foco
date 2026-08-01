#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass=0, fail=0;
function assert(c,m){ if(c){pass++; console.log("  PASS ",m);} else {fail++; console.log("  FAIL ",m);} }
function read(p){ return readFileSync(join(root,p),"utf8"); }
function exists(p){ return existsSync(join(root,p)); }

import { computeConfidence } from "../lib/intelligence/enterprise/confidence/engine.ts";
console.log("\nConfidence Engine — 27.1\n");
const empty = computeConfidence({ evidence: [] });
assert(empty.level === "indisponivel", "empty => indisponivel");
const ev = [{
  id: "1", source: "s", sourceType: "metric", module: "financeiro", calculatedAt: new Date().toISOString(),
  freshness: "fresh", reliability: "alta", tenantId: "t",
}];
const ok = computeConfidence({ evidence: ev, sampleSize: 5 });
assert(ok.level === "alta" || ok.level === "media", "with evidence");
assert(ok.score != null, "score");
console.log("\nResultado:", pass, "PASS ·", fail, "FAIL\n");
process.exit(fail>0?1:0);
