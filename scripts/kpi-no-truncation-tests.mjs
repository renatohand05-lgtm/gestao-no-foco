#!/usr/bin/env node
/** Sprint 25.6.1 — KPI sem truncagem / quebra de moeda (+ 26.2 cockpit) */
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

console.log("\nKPI No Truncation — Sprint 25.6.1 / 26.2\n");

const strip = readFileSync(
  join(root, "components/dashboard/premium/premium-kpi-strip.tsx"),
  "utf8",
);
const cockpit = readFileSync(
  join(root, "components/gf/gf-kpi-cockpit.tsx"),
  "utf8",
);
const metric = readFileSync(join(root, "components/gf/gf-metric.tsx"), "utf8");
const map = readFileSync(
  join(root, "lib/dashboard/premium-dashboard-map.ts"),
  "utf8",
);
const src = strip + cockpit + metric;

assert(
  strip.includes("PremiumKpiCard") || cockpit.includes("KpiCell"),
  "KPI card próprio",
);
assert(src.includes("whitespace-nowrap"), "valor sem quebra");
assert(src.includes("tabular-nums"), "tabular-nums");
assert(src.includes("clamp(") || src.includes("metricXl"), "clamp no valor");
assert(src.includes('data-kpi-value=""'), "marker valor");
assert(src.includes('data-kpi-card=""'), "marker card");
assert(src.includes("min-w-0"), "cards permitem shrink sem overflow");
assert(
  !/truncate.*data-kpi-value|data-kpi-value[\s\S]{0,80}truncate/.test(src),
  "sem truncate no valor",
);
assert(!src.includes("ExecutiveKpiCard"), "não usa ExecutiveKpiCard legado no strip");
assert(!/break-all|break-words/.test(cockpit), "sem break-words no KPI strip");
assert(
  strip.includes("item.unavailable") || cockpit.includes("unavailable"),
  "estado unavailable tipado",
);
assert(map.includes("Indisponível"), "status Indisponível no map");
assert(cockpit.includes("2xl:grid-cols-6"), "6 cols no 2xl — desktop largo");
assert(cockpit.includes("lg:grid-cols-3"), "3x2 no notebook");
assert(map.includes("formatCurrencyCompact"), "map usa moeda compacta");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
