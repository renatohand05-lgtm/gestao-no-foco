#!/usr/bin/env node
/** Sprint 26.2 — Signature analytics narrative */
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

console.log("\nSignature Analytics — Sprint 26.2\n");
const a = readFileSync(
  join(root, "components/analytics/executive-analytics-dashboard.tsx"),
  "utf8",
);
assert(a.includes("data-analytics-sources-panel"), "sources panel");
assert(a.includes("Cobertura de dados"), "cobertura");
assert(a.includes("<details"), "accordion técnico");
assert(a.includes("Ver fontes"), "CTA ver fontes");
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
