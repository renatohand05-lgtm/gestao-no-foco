#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0;
let fail = 0;
function check(name, cond) {
  if (cond) {
    pass += 1;
    console.log("  PASS", name);
  } else {
    fail += 1;
    console.log("  FAIL", name);
  }
}

console.log("\nPhase 31.2 — quick actions\n");
const src = readFileSync(join(root, "lib/mobile/dashboard-compose.ts"), "utf8");
check("buildQuickActions presente", /buildQuickActions/.test(src));
check("ações Nova OS / CRM / Financeiro / Estoque", /Nova OS/.test(src) && /CRM/.test(src) && /Financeiro/.test(src) && /Estoque/.test(src));
check("ações respeitam permission", /permission:/.test(src) && /enabled:/.test(src));

const home = readFileSync(join(root, "apps/mobile/app/(app)/index.tsx"), "utf8");
check("home abre quick actions via Linking", /Linking\.openURL/.test(home));
check("filtra enabled", /filter\(\(a\) => a\.enabled\)/.test(home));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
