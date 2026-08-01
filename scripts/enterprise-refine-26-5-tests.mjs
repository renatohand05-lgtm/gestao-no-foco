#!/usr/bin/env node
/** Sprint 26.5 — Performance */
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

console.log("\nEnterprise Refine 26.5 — Performance\n");
const chart = readFileSync(join(root, "components/gf/gf-revenue-chart.tsx"), "utf8");
assert(chart.includes("next/dynamic"), "chart dynamic import");
assert(chart.includes("data-chart-lazy"), "lazy marker");
assert(chart.includes("ssr: false"), "chart client lazy");
const kpi = readFileSync(join(root, "components/gf/gf-kpi-cockpit.tsx"), "utf8");
assert(kpi.includes("memo(") || kpi.includes("memo(KpiCell"), "KpiCell memo");
assert(existsSync(join(root, "components/gf/gf-virtual-list.tsx")), "GFVirtualList");
const virt = readFileSync(join(root, "components/gf/gf-virtual-list.tsx"), "utf8");
assert(virt.includes("items.length > 40"), "virtualização seletiva");
assert(virt.includes("data-virtualized"), "virtual marker");
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
