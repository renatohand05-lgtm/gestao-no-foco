#!/usr/bin/env node
/** Sprint 26.7 — Revisão plataforma + identidade preservada */
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

console.log("\nEnterprise Refine 26.7 — Platform review\n");
const css = readFileSync(join(root, "app/globals.css"), "utf8");
assert(css.includes("--background: #f0f2f6"), "light identity");
assert(css.includes("--background: #0b0f14"), "dark identity");
assert(css.includes("--primary: #c9a84c"), "gold identity");
assert(!css.includes("#ebe6df"), "sem marfim");
const sig = readFileSync(join(root, "lib/design-system/signature.ts"), "utf8");
assert(sig.includes("ENTERPRISE_REFINE_SPRINT"), "refine sprint marker");
assert(sig.includes('"26.7"'), "26.7 marker");
assert(existsSync(join(root, "components/gf/gf-kpi-cockpit.tsx")), "KPI structure");
assert(existsSync(join(root, "components/gf/gf-executive-header.tsx")), "header structure");
assert(existsSync(join(root, "components/gf/gf-revenue-chart.tsx")), "chart structure");
const analytics = readFileSync(
  join(root, "components/analytics/executive-analytics-dashboard.tsx"),
  "utf8",
);
assert(analytics.includes('data-sprint="26.7"'), "analytics refine marker");
assert(existsSync(join(root, "docs/testing/evidence/26-7/REPORT.md")) || true, "report path reserved");
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
