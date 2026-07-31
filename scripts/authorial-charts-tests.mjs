#!/usr/bin/env node
/** Sprint 26.1 — Authorial charts */
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

console.log("\nAuthorial Charts — Sprint 26.1\n");
const chart = readFileSync(
  join(root, "components/dashboard/premium/premium-revenue-chart.tsx"),
  "utf8",
);
assert(chart.includes('data-chart-authorial=""'), "authorial marker");
assert(chart.includes("revStroke"), "gradient stroke");
assert(chart.includes("gf-chart-line"), "gf chart line");
assert(chart.includes("premium-chart-line"), "motion draw retained");
assert(chart.includes("pathLength"), "pathLength draw");
const row = readFileSync(
  join(root, "components/dashboard/premium/premium-main-row.tsx"),
  "utf8",
);
assert(row.includes('data-authorial-charts=""'), "main row authorial");
assert(row.includes('data-chart-panel="authorial"'), "chart panel authorial");
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
