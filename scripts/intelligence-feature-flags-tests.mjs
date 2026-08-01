#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass=0, fail=0;
function assert(c,m){ if(c){pass++; console.log("  PASS ",m);} else {fail++; console.log("  FAIL ",m);} }
function read(p){ return readFileSync(join(root,p),"utf8"); }
function exists(p){ return existsSync(join(root,p)); }

import { getIntelligenceFeatureFlags } from "../lib/intelligence/enterprise/feature-flags.ts";
console.log("\nFeature Flags — 27.0\n");
const f = getIntelligenceFeatureFlags();
assert(f.deterministic === true, "deterministic default on");
assert(f.externalProvider === false, "external default off");
assert(f.enabled === true, "enabled default on");
assert(typeof f.executiveCopilot === "boolean", "copilot flag");
console.log("\nResultado:", pass, "PASS ·", fail, "FAIL\n");
process.exit(fail>0?1:0);
