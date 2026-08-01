#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass=0, fail=0;
function assert(c,m){ if(c){pass++; console.log("  PASS ",m);} else {fail++; console.log("  FAIL ",m);} }
function read(p){ return readFileSync(join(root,p),"utf8"); }
function exists(p){ return existsSync(join(root,p)); }

import { resolveIntelligenceProvider, providerGatewayHealth, DETERMINISTIC_PROVIDER } from "../lib/intelligence/enterprise/provider/gateway.ts";
console.log("\nProvider Gateway — 27.0\n");
const r = resolveIntelligenceProvider("deterministic");
assert(r.mode === "deterministic", "default deterministic");
assert(r.provider.id === "deterministic", "provider id");
assert(DETERMINISTIC_PROVIDER.isExternal === false, "not external");
const assisted = resolveIntelligenceProvider("provider_assisted");
assert(assisted.mode === "deterministic" || assisted.mode === "unavailable", "assisted não finge live");
assert(assisted.fallbackReason != null || assisted.mode !== "provider_assisted", "fallback explícito");
const health = await providerGatewayHealth();
assert(health.length >= 2, "health det+ext");
assert(health.some(h => h.providerId === "deterministic" && h.ok), "det healthy");
console.log("\nResultado:", pass, "PASS ·", fail, "FAIL\n");
process.exit(fail>0?1:0);
