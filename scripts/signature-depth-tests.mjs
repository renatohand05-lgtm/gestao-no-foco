#!/usr/bin/env node
/** Sprint 26.2.1 — Signature depth / surfaces (sem marfim) */
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

console.log("\nSignature Depth — Sprint 26.2.1\n");
const css = readFileSync(join(root, "app/globals.css"), "utf8");
for (const t of [
  "--gf-space-section",
  "--gf-space-block",
  "--gf-surface-shell",
  "--gf-surface-elevated",
  "--gf-surface-intelligence",
  "--gf-border-subtle",
  "--gf-shadow-elevated",
  "--gf-glow-gold",
  "--gf-motion-micro",
]) {
  assert(css.includes(t), t);
}
assert(css.includes("--background: #f0f2f6"), "tema claro frio 26.1");
assert(!css.includes("#ebe6df"), "sem marfim #ebe6df");
assert(!css.includes("#fffcf8"), "sem superfície lavada #fffcf8");
const sig = readFileSync(join(root, "lib/design-system/signature.ts"), "utf8");
assert(sig.includes("gfSurface"), "gfSurface export");
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
