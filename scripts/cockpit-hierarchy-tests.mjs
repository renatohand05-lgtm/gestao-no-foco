#!/usr/bin/env node
/** Sprint 26.1 — Cockpit hierarchy contract */
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

console.log("\nCockpit Hierarchy — Sprint 26.1\n");
const view = readFileSync(
  join(root, "components/dashboard/premium/premium-dashboard-view.tsx"),
  "utf8",
);
assert(view.includes('data-dashboard-premium-v261=""'), "marker v26.1");
assert(view.includes('data-cockpit-hierarchy="brief-kpi-chart-ops"'), "hierarchy order marker");
assert(view.includes("ExecutiveBrief"), "Executive Brief wired");
assert(view.includes("PremiumKpiStrip"), "KPI strip");
assert(view.includes("dominant"), "dominant KPI prop");
assert(view.includes("PremiumMainRow"), "main row");
assert(view.includes("PremiumOpsStrip"), "ops strip");
assert(existsSync(join(root, "components/dashboard/premium/executive-brief.tsx")), "executive-brief.tsx");
assert(existsSync(join(root, "lib/dashboard/executive-brief.ts")), "executive-brief map");
const idxBrief = view.indexOf("<ExecutiveBrief");
const idxKpi = view.indexOf("<PremiumKpiStrip");
const idxMain = view.indexOf("<PremiumMainRow");
const idxOps = view.indexOf("<PremiumOpsStrip");
assert(idxBrief > 0 && idxBrief < idxKpi, "Brief before KPIs");
assert(idxKpi < idxMain, "KPIs before main row");
assert(idxMain < idxOps, "main row before ops");
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
