#!/usr/bin/env node
/** Sprint 26.2 — Signature motion */
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

console.log("\nSignature Motion — Sprint 26.2\n");
const css = readFileSync(join(root, "app/globals.css"), "utf8");
assert(css.includes("--gf-motion-micro"), "micro");
assert(css.includes("--gf-motion-component"), "component");
assert(css.includes("--gf-motion-section"), "section");
assert(css.includes(".gf-enter"), "gf-enter");
assert(css.includes("prefers-reduced-motion"), "reduced motion");
const pm = readFileSync(join(root, "lib/design-system/premium-motion.ts"), "utf8");
assert(pm.includes("signature"), "signature motion export");
assert(pm.includes("SIGNATURE_SPRINT"), "sprint const");
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
