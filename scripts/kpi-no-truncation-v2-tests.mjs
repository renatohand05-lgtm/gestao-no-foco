#!/usr/bin/env node
/** Sprint 26.2.1 — KPI no truncation v2 (cockpit + metric) */
import { readFileSync } from "node:fs";
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

console.log("\nKPI No Truncation v2 — Sprint 26.2.1\n");

const cockpit = readFileSync(
  join(root, "components/gf/gf-kpi-cockpit.tsx"),
  "utf8",
);
const metric = readFileSync(join(root, "components/gf/gf-metric.tsx"), "utf8");
const sig = readFileSync(
  join(root, "lib/design-system/signature.ts"),
  "utf8",
);

assert(cockpit.includes("data-gf-kpi-cockpit"), "cockpit marker");
assert(cockpit.includes("GFMetric"), "usa GFMetric");
assert(cockpit.includes("2xl:grid-cols-6"), "6 cols desktop");
assert(metric.includes("data-kpi-no-truncation"), "marker no-truncation");
assert(metric.includes("whitespace-nowrap"), "nowrap no valor");
assert(metric.includes("overflow-visible"), "overflow visible");
assert(!/truncate/.test(metric), "metric sem truncate");
assert(sig.includes("clamp("), "clamp tipográfico");
assert(
  !cockpit.includes("overflow-x-clip") && !metric.includes("overflow-x-clip"),
  "sem overflow-x-clip",
);
assert(cockpit.includes("bg-card") || cockpit.includes("bg-[var(--card)]"), "cockpit card contraste");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
