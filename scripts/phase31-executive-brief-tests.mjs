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

console.log("\nPhase 31.2 — executive brief mobile\n");
const src = readFileSync(join(root, "lib/mobile/dashboard-compose.ts"), "utf8");
check("reusa buildExecutiveBriefV2", /buildExecutiveBriefV2/.test(src));
check("DTO inclui brief", /brief,/.test(src) || /brief:/.test(src));

const ui = readFileSync(join(root, "apps/mobile/src/dashboard/sections.tsx"), "utf8");
check("BriefSection presente", /function BriefSection/.test(ui));
check("UI mostra Executive Brief", /Executive Brief/.test(ui));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
