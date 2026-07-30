#!/usr/bin/env node
/** Sprint 25.6.1 — KPI sem truncagem / quebra de moeda */
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

console.log("\nKPI No Truncation — Sprint 25.6.1\n");

const strip = readFileSync(
  join(root, "components/dashboard/premium/premium-kpi-strip.tsx"),
  "utf8",
);
const map = readFileSync(
  join(root, "lib/dashboard/premium-dashboard-map.ts"),
  "utf8",
);

assert(strip.includes("PremiumKpiCard"), "KPI card próprio");
assert(strip.includes("whitespace-nowrap"), "valor sem quebra");
assert(strip.includes("tabular-nums"), "tabular-nums");
assert(strip.includes("clamp("), "clamp no valor");
assert(strip.includes('data-kpi-value=""'), "marker valor");
assert(strip.includes('data-kpi-card=""'), "marker card");
assert(strip.includes("min-w-0"), "cards permitem shrink sem overflow");
assert(!/truncate.*data-kpi-value|data-kpi-value[\s\S]{0,80}truncate/.test(strip), "sem truncate no valor");
assert(!strip.includes("ExecutiveKpiCard"), "não usa ExecutiveKpiCard legado no strip");
assert(!/break-all|break-words/.test(strip), "sem break-words no KPI strip");
assert(strip.includes("item.unavailable"), "estado unavailable tipado");
assert(map.includes("Indisponível"), "status Indisponível no map");
assert(strip.includes("2xl:grid-cols-6"), "6 cols no 2xl — desktop largo");
assert(strip.includes("lg:grid-cols-3"), "3x2 no notebook");
assert(map.includes("formatCurrencyCompact"), "map usa moeda compacta");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
