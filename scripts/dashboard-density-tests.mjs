#!/usr/bin/env node
/** Sprint 25.6 — Dashboard density */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; console.log(`  PASS  ${msg}`); }
  else { fail++; console.log(`  FAIL  ${msg}`); }
}

console.log("\nDashboard Density — Sprint 25.6\n");

const view = readFileSync(join(root, "components/dashboard/premium/premium-dashboard-view.tsx"), "utf8");
assert(view.includes("space-y-5"), "espaçamento reduzido");
assert(view.includes("PremiumDisclosure"), "disclosure");
assert(view.includes("defaultOpen: false") || view.includes("defaultOpen: alertCount"), "painéis sob demanda");
assert(view.includes("PremiumKpiStrip"), "KPI linha 1");
assert(view.includes("PremiumMainRow"), "main linha 2");
assert(view.includes("PremiumOpsStrip"), "ops linha 3");

const disc = readFileSync(join(root, "components/dashboard/premium/premium-disclosure.tsx"), "utf8");
assert(disc.includes("aria-expanded"), "a11y disclosure");
assert(disc.includes("prefers-reduced-motion") || disc.includes("motion-reduce"), "reduced motion");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
