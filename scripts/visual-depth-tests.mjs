#!/usr/bin/env node
/** Sprint 26.1 — Visual depth */
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

console.log("\nVisual Depth — Sprint 26.1\n");
const css = readFileSync(join(root, "app/globals.css"), "utf8");
assert(css.includes("--gf-depth-1"), "depth-1 token");
assert(css.includes("--gf-depth-2"), "depth-2 token");
assert(css.includes("--gf-depth-3"), "depth-3 token");
assert(css.includes("Sprint 26.1"), "sprint 26.1 css block");
assert(css.includes("--gf-light-wash"), "light wash");
const pm = readFileSync(join(root, "lib/design-system/premium-motion.ts"), "utf8");
assert(pm.includes("gfAuthorial"), "gfAuthorial surface helper");
assert(pm.includes("gfRaised"), "gfRaised surface helper");
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
