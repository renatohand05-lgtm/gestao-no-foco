#!/usr/bin/env node
/** Sprint 25.7 — Premium accessibility */
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

console.log("\nPremium Accessibility — Sprint 25.7\n");
const loader = readFileSync(
  join(root, "components/brand/premium-global-loader.tsx"),
  "utf8",
);
assert(loader.includes('role="status"'), "loader status");
assert(loader.includes("sr-only"), "loader sr-only");
assert(loader.includes("aria-live"), "loader aria-live");

const chart = readFileSync(
  join(root, "components/dashboard/premium/premium-revenue-chart.tsx"),
  "utf8",
);
assert(chart.includes("aria-label"), "chart pontos a11y");
assert(chart.includes("tabIndex"), "chart teclado");
assert(chart.includes("role=\"tooltip\"") || chart.includes("role='tooltip'"), "tooltip role");

const disc = readFileSync(
  join(root, "components/dashboard/premium/premium-disclosure.tsx"),
  "utf8",
);
assert(disc.includes("aria-expanded"), "disclosure expanded");
assert(disc.includes("aria-controls"), "disclosure controls");

const css = readFileSync(join(root, "app/globals.css"), "utf8");
assert(css.includes("prefers-reduced-motion"), "reduced motion CSS");

const btn = readFileSync(join(root, "components/ui/button.tsx"), "utf8");
assert(btn.includes("focus-visible:ring"), "botão focus ring");
assert(btn.includes("disabled:"), "botão disabled");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
