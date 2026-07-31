#!/usr/bin/env node
/** Sprint 26.2 — Signature typography */
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

console.log("\nSignature Typography — Sprint 26.2\n");
const sig = readFileSync(join(root, "lib/design-system/signature.ts"), "utf8");
for (const k of [
  "gf-display",
  "gf-page-title",
  "gf-section-title",
  "gf-card-title",
  "gf-metric-xl",
  "gf-metric-lg",
  "gf-body",
  "gf-label",
  "gf-caption",
  "gf-overline",
]) {
  assert(sig.includes(k), k);
}
const css = readFileSync(join(root, "app/globals.css"), "utf8");
assert(css.includes(".gf-metric-xl"), "css metric xl");
assert(css.includes("font-variant-numeric: tabular-nums"), "tabular nums");
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
