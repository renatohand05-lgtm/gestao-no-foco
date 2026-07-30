#!/usr/bin/env node
/** Sprint 25.6.1 — Dashboard layout final contract */
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

console.log("\nDashboard Layout Final — Sprint 25.6.1\n");

const globals = readFileSync(join(root, "app/globals.css"), "utf8");
assert(globals.includes("--dashboard-max-width"), "token max-width");
assert(globals.includes("--dashboard-gutter"), "token gutter");
assert(globals.includes("--dashboard-gap"), "token gap");
assert(globals.includes("--kpi-min-width"), "token kpi-min-width");
assert(globals.includes("--panel-min-height"), "token panel-min-height");
assert(globals.includes("--gold-primary"), "token gold-primary");
assert(globals.includes("--surface-1"), "token surface-1");
assert(globals.includes("--surface-2"), "token surface-2");
assert(globals.includes("--surface-3"), "token surface-3");

assert(
  existsSync(join(root, "lib/design-system/dashboard-layout.ts")),
  "dashboard-layout helper",
);

const shell = readFileSync(
  join(root, "components/dashboard/executive/executive-dashboard-shell.tsx"),
  "utf8",
);
assert(shell.includes("--dashboard-max-width"), "shell usa max-width token");
assert(shell.includes('data-dashboard-layout="shell"'), "shell layout marker");

const strip = readFileSync(
  join(root, "components/dashboard/premium/premium-kpi-strip.tsx"),
  "utf8",
);
assert(strip.includes("2xl:grid-cols-6"), "KPI 2xl 6 cols (desktop largo)");
assert(strip.includes("lg:grid-cols-3"), "KPI lg 3 cols");
assert(strip.includes("md:grid-cols-2"), "KPI md 2 cols");
assert(strip.includes("grid-cols-1"), "KPI sm 1 col");
assert(strip.includes('data-dashboard-layout="kpi-grid"'), "kpi grid marker");

const main = readFileSync(
  join(root, "components/dashboard/premium/premium-main-row.tsx"),
  "utf8",
);
assert(main.includes("2xl:col-span-7"), "gráfico 7 cols (2xl)");
assert(main.includes("2xl:col-span-3"), "inteligência 3 cols");
assert(main.includes("2xl:col-span-2"), "fluxo 2 cols");
assert(main.includes("lg:col-span-5"), "notebook gráfico full");
assert(main.includes("lg:col-span-3"), "notebook intel ~60%");
assert(main.includes("lg:col-span-2"), "notebook fluxo ~40%");
assert(main.includes("2xl:grid-cols-12"), "grid 12 no desktop largo");
assert(main.includes('data-dashboard-layout="main-row"'), "main-row marker");
assert(main.includes("slice(0, 3)"), "máx 3 insights");
assert(main.includes("Ver todos"), "link ver todos");
assert(!main.includes("max-h-[28rem]"), "intel sem scroll estreito padrão");
assert(!main.includes("DashboardDualBarChart"), "fluxo sem DualBar legado");
assert(main.includes("data-cash-panel"), "cash panel marker");
assert(main.includes("overflow-x-hidden"), "cash sem overflow-x");
assert(main.includes("formatCurrencyCompact"), "fluxo usa moeda compacta");

const view = readFileSync(
  join(root, "components/dashboard/premium/premium-dashboard-view.tsx"),
  "utf8",
);
assert(view.includes("data-dashboard-premium-v2561"), "marker 25.6.1");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
