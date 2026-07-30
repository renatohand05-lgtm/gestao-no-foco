#!/usr/bin/env node
/** Sprint 25.6.1 — Sem overflow horizontal no dashboard premium */
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

console.log("\nNo Horizontal Overflow — Sprint 25.6.1\n");

const main = readFileSync(
  join(root, "components/dashboard/premium/premium-main-row.tsx"),
  "utf8",
);
assert(main.includes("overflow-x-hidden"), "cash panel overflow-x-hidden");
assert(main.includes("min-w-0"), "colunas min-w-0");
assert(!main.includes("overflow-x-auto"), "main-row sem overflow-x-auto");
assert(!main.includes("min-w-[28rem]"), "main-row sem min-w 28rem");
assert(main.includes("CashSpark") || main.includes("data-cash-spark"), "spark próprio");
assert(main.includes("data-intel-panel"), "intel panel");
assert(!main.includes("overflow-y-auto"), "intel sem scroll vertical padrão");

const charts = readFileSync(
  join(root, "components/dashboard/dashboard-charts.tsx"),
  "utf8",
);
assert(!charts.includes("min-w-[28rem]"), "charts sem min-w 28rem");
assert(!charts.includes("overflow-x-auto"), "charts sem overflow-x-auto");

const header = readFileSync(
  join(root, "components/layout/app-header.tsx"),
  "utf8",
);
assert(header.includes("overflow-x-hidden"), "header overflow-x-hidden");
assert(header.includes("Mais ações") || header.includes("MoreHorizontal"), "menu Mais");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
