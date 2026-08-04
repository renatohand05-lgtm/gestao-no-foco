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

console.log("\nPhase 31.2 — alerts mobile\n");
const src = readFileSync(join(root, "lib/mobile/dashboard-compose.ts"), "utf8");
check("reusa buildCockpitAlerts", /buildCockpitAlerts/.test(src));

const ui = readFileSync(join(root, "apps/mobile/src/dashboard/sections.tsx"), "utf8");
check("AlertsSection ordena por prioridade", /PRIORITY_ORDER/.test(ui));
check("categorias via badge", /alert\.category/.test(ui));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
