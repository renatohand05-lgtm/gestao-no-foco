#!/usr/bin/env node
/** Sprint 26.2 — Signature chart */
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

console.log("\nSignature Chart — Sprint 26.2\n");
assert(
  existsSync(join(root, "components/gf/gf-revenue-chart.tsx")),
  "gf-revenue-chart",
);
const g = readFileSync(
  join(root, "components/gf/gf-revenue-chart.tsx"),
  "utf8",
);
assert(g.includes("data-gf-revenue-chart"), "marker");
assert(g.includes("PremiumRevenueChart"), "reusa série real");
assert(g.includes("origem"), "origem");
assert(g.includes("confianca"), "confiança");
const chart = readFileSync(
  join(root, "components/dashboard/premium/premium-revenue-chart.tsx"),
  "utf8",
);
assert(chart.includes("Origem · Dashboard"), "tooltip origem");
assert(chart.includes("premium-chart-line"), "draw motion");
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
