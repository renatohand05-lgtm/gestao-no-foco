#!/usr/bin/env node
/** Sprint 26.1 — Executive narrative (Brief) */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) {
    pass++;
    console.log(`  PASS  ${msg}`);
  } else {
    fail++;
    console.log(`  FAIL  ${msg}`);
  }
}

console.log("\nExecutive Narrative — Sprint 26.1\n");
assert(existsSync(join(root, "lib/dashboard/executive-brief.ts")), "brief builder");
assert(existsSync(join(root, "components/dashboard/premium/executive-brief.tsx")), "brief UI");
const map = readFileSync(join(root, "lib/dashboard/executive-brief.ts"), "utf8");
assert(map.includes("buildExecutiveBrief"), "buildExecutiveBrief export");
assert(map.includes("narrative"), "narrative field");
assert(!map.includes("Math.random"), "sem random");
const ui = readFileSync(
  join(root, "components/dashboard/premium/executive-brief.tsx"),
  "utf8",
);
assert(ui.includes('data-dashboard-block="executive-brief"'), "brief block marker");
assert(ui.includes("data-brief-headline"), "headline slot");
assert(ui.includes("data-brief-narrative"), "narrative slot");
assert(ui.includes("data-brief-cta"), "cta slot");
assert(ui.includes("data-brief-chips"), "chips slot");
const ecc = readFileSync(
  join(root, "components/dashboard/executive-command-center/executive-command-center.tsx"),
  "utf8",
);
assert(ecc.includes('data-command-center-compact="1"'), "command center compact");
assert(ecc.includes("<details"), "details for secondary panels");
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
