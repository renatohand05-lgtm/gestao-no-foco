#!/usr/bin/env node
/** Sprint 26.1 — Premium KPIs v2 (+ 26.2 cockpit) */
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

console.log("\nPremium KPIs v2 — Sprint 26.1 / 26.2\n");
const kpi = readFileSync(
  join(root, "components/dashboard/premium/premium-kpi-strip.tsx"),
  "utf8",
);
const cockpit = readFileSync(
  join(root, "components/gf/gf-kpi-cockpit.tsx"),
  "utf8",
);
assert(kpi.includes("GFKpiCockpit") || cockpit.includes('data-premium-kpis="v2"'), "kpi v2 wired");
assert(cockpit.includes('data-premium-kpis="v2"'), "kpi v2 marker");
assert(cockpit.includes("data-kpi-dominant"), "dominant value marker");
assert(cockpit.includes("featured"), "featured KPI card");
assert(
  cockpit.includes("clamp(1.55rem") || cockpit.includes("metricXl") || kpi.includes("clamp(1.55rem"),
  "dominant clamp typography",
);
assert(cockpit.includes("gf-kpi"), "gf-kpi surface");
assert(!cockpit.includes("ellipsis"), "sem ellipsis no valor");
assert(cockpit.includes("whitespace-nowrap") || kpi.includes("whitespace-nowrap"), "valor em linha única");
const motion = readFileSync(join(root, "lib/design-system/premium-motion.ts"), "utf8");
assert(motion.includes("metricDominant"), "metricDominant token");
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
