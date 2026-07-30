#!/usr/bin/env node
/** Sprint 25.7 — Visual consistency */
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

console.log("\nVisual Consistency — Sprint 25.7\n");
const view = readFileSync(
  join(root, "components/dashboard/premium/premium-dashboard-view.tsx"),
  "utf8",
);
assert(view.includes("data-dashboard-premium-v257"), "dashboard v257");
assert(view.includes("--border-premium") || view.includes("border-premium"), "border premium");
assert(view.includes("--surface-raised") || view.includes("surface-raised"), "surface raised");

const kpi = readFileSync(
  join(root, "components/dashboard/premium/premium-kpi-strip.tsx"),
  "utf8",
);
assert(kpi.includes("--shadow-card") || kpi.includes("shadow-card"), "KPI shadow token");
assert(kpi.includes("tabular-nums"), "KPI tabular-nums");

const decision = readFileSync(
  join(root, "components/dashboard/executive-decision-center/decision-center-panel.tsx"),
  "utf8",
);
assert(decision.includes("data-premium-v257"), "decision marker");

const css = readFileSync(join(root, "app/globals.css"), "utf8");
assert(css.includes("--background: #eef1f5"), "tema claro sofisticado");
assert(css.includes(".dark"), "tema escuro");
assert(!css.includes("#F4F1EA"), "sem cream genérico");

const loader = readFileSync(
  join(root, "components/brand/premium-global-loader.tsx"),
  "utf8",
);
assert(loader.includes("icon192"), "loader G oficial");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
