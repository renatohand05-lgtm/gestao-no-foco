#!/usr/bin/env node
/** Sprint 25.6 — Executive experience markers */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; console.log(`  PASS  ${msg}`); }
  else { fail++; console.log(`  FAIL  ${msg}`); }
}

console.log("\nExecutive Experience — Sprint 25.6\n");

const paths = [
  "components/dashboard/executive/executive-ai-card.tsx",
  "components/dashboard/executive/executive-intelligence-center.tsx",
  "components/dashboard/executive-command-center/executive-header.tsx",
  "components/executive/action-center/executive-action-card.tsx",
  "components/dashboard/premium/premium-disclosure.tsx",
];

for (const p of paths) {
  assert(existsSync(join(root, p)), `existe ${p}`);
}

const eic = readFileSync(join(root, "components/dashboard/executive/executive-intelligence-center.tsx"), "utf8");
assert(eic.includes("<details"), "painéis colapsáveis EIC");
assert(eic.includes("bg-card"), "EIC tema token");

const action = readFileSync(join(root, "components/executive/action-center/executive-action-card.tsx"), "utf8");
assert(action.includes("dark:bg-card") || action.includes("bg-card"), "action card tema");

const stream = readFileSync(join(root, "components/dashboard/dashboard-streaming.tsx"), "utf8");
assert(stream.includes("PremiumDashboardView"), "stream premium");
assert(!/Math\.random/.test(stream), "sem random");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
