#!/usr/bin/env node
/** Sprint 26.5 — Lighthouse / performance contract (static + optional live) */
import { readFileSync, existsSync } from "node:fs";
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

console.log("\nLighthouse Contract — Sprint 26.5\n");

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
assert(Boolean(pkg.scripts["test:enterprise-refine-26-5"]), "script refine 26.5");
assert(Boolean(pkg.scripts["test:lighthouse-contract"]), "script lighthouse-contract");

const chart = readFileSync(join(root, "components/gf/gf-revenue-chart.tsx"), "utf8");
assert(chart.includes("dynamic("), "bundle split chart");
assert(chart.includes("loading:"), "chart loading UI");

const nextConfigCandidates = [
  "next.config.ts",
  "next.config.mjs",
  "next.config.js",
];
const nextCfg = nextConfigCandidates.find((f) => existsSync(join(root, f)));
assert(Boolean(nextCfg), "next config presente");

// Heurísticas de budget estático (sem rede)
assert(!chart.includes("from \"recharts\""), "sem recharts no chart wrapper");
const mainRow = readFileSync(
  join(root, "components/dashboard/premium/premium-main-row.tsx"),
  "utf8",
);
assert(mainRow.includes("GFRevenueChart"), "main-row usa chart lazy wrapper");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
