#!/usr/bin/env node
/** Sprint 25.7 — Motion system */
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

console.log("\nMotion System — Sprint 25.7\n");
assert(existsSync(join(root, "lib/design-system/premium-motion.ts")), "premium-motion.ts");
const css = readFileSync(join(root, "app/globals.css"), "utf8");
assert(css.includes("--motion-fast"), "token motion-fast");
assert(css.includes("--motion-normal"), "token motion-normal");
assert(css.includes("--motion-slow"), "token motion-slow");
assert(css.includes("--ease-premium"), "token ease-premium");
assert(css.includes(".premium-enter"), "class premium-enter");
assert(css.includes("premium-enter-delay-5"), "stagger delays");
assert(css.includes(".premium-kpi-lift"), "kpi lift");
assert(css.includes(".premium-chart-line"), "chart draw");
assert(css.includes("@media (prefers-reduced-motion: reduce)"), "reduced motion");
const pm = readFileSync(join(root, "lib/design-system/premium-motion.ts"), "utf8");
assert(pm.includes("dashboardEntranceMs"), "entrance duration band");
assert(pm.includes("450") && pm.includes("850"), "450-850ms band");
const view = readFileSync(
  join(root, "components/dashboard/premium/premium-dashboard-view.tsx"),
  "utf8",
);
assert(view.includes("data-premium-motion"), "dashboard entrance marker");
assert(view.includes("premium-enter-delay-1"), "header stagger");
assert(view.includes("premium-enter-delay-2"), "kpi stagger");
assert(view.includes("premium-enter-delay-3"), "main row stagger");
const chart = readFileSync(
  join(root, "components/dashboard/premium/premium-revenue-chart.tsx"),
  "utf8",
);
assert(chart.includes("premium-chart-line"), "chart motion class");
assert(chart.includes("pathLength"), "pathLength draw");
const kpi = readFileSync(
  join(root, "components/dashboard/premium/premium-kpi-strip.tsx"),
  "utf8",
);
assert(kpi.includes("premium-kpi-lift"), "KPI hover lift");
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
