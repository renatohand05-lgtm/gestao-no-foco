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

console.log("\nPhase 31.2 — KPIs mobile\n");
const src = readFileSync(join(root, "lib/mobile/dashboard-compose.ts"), "utf8");
check("KPIs via buildCockpitKpis (web)", /buildCockpitKpis/.test(src));
check("DTO mapeia id/title/value", /title:\s*k\.title/.test(src) && /value:\s*k\.value/.test(src));
check("sem KPI hardcode monetário", !/R\$\s*1[0-9]{3}/.test(src));

const ui = readFileSync(join(root, "apps/mobile/src/dashboard/sections.tsx"), "utf8");
check("KpiGrid renderiza lista", /function KpiGrid/.test(ui));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
