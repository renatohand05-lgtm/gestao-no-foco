#!/usr/bin/env node
/** Sprint 26.6 — Padronização módulos */
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

console.log("\nEnterprise Refine 26.6 — Standardization\n");
assert(existsSync(join(root, "components/gf/gf-filter-bar.tsx")), "GFFilterBar");
const idx = readFileSync(join(root, "components/gf/index.ts"), "utf8");
assert(idx.includes("GFFilterBar"), "barrel filter");
assert(idx.includes("GFVirtualList"), "barrel virtual");
assert(idx.includes("GFEmptyState"), "barrel empty");
const table = readFileSync(join(root, "components/ui/table.tsx"), "utf8");
assert(table.includes("gf-motion-micro"), "table row motion");
const execEmpty = readFileSync(
  join(root, "components/executive/ExecutiveEmptyState.tsx"),
  "utf8",
);
assert(execEmpty.includes("border-border"), "executive empty border");
assert(execEmpty.includes('data-sprint="26.6"'), "executive empty marker");
const analytics = readFileSync(
  join(root, "components/analytics/executive-analytics-dashboard.tsx"),
  "utf8",
);
assert(analytics.includes("GFFilterBar"), "analytics filter bar");
assert(analytics.includes("GFSkeletonBlock"), "analytics skeleton GF");
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
