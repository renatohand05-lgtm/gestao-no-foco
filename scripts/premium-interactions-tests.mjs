#!/usr/bin/env node
/** Sprint 25.7 — Premium interactions */
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

console.log("\nPremium Interactions — Sprint 25.7\n");
const btn = readFileSync(join(root, "components/ui/button.tsx"), "utf8");
assert(btn.includes("success:"), "botão success");
assert(btn.includes("brand-gold"), "botão dourado dark");
assert(btn.includes("focus-visible:ring"), "focus visível");
assert(btn.includes("motion-reduce"), "botão reduced motion");
assert(btn.includes("active:not-aria-[haspopup]:scale-[0.98]"), "press scale");

const disc = readFileSync(
  join(root, "components/dashboard/premium/premium-disclosure.tsx"),
  "utf8",
);
assert(disc.includes("aria-expanded"), "accordion a11y");

const chart = readFileSync(
  join(root, "components/dashboard/premium/premium-revenue-chart.tsx"),
  "utf8",
);
assert(chart.includes("data-chart-tooltip"), "tooltip");
assert(chart.includes("onFocus"), "hover/foco gráfico");
assert(chart.includes("tabIndex"), "teclado");

const header = readFileSync(join(root, "components/layout/app-header.tsx"), "utf8");
assert(header.includes("Mais ações") || header.includes("MoreHorizontal"), "menu Mais");

const kpi = readFileSync(
  join(root, "components/dashboard/premium/premium-kpi-strip.tsx"),
  "utf8",
);
assert(kpi.includes("premium-kpi-lift"), "KPI elevação");
assert(kpi.includes("focus-visible:ring"), "KPI foco");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
