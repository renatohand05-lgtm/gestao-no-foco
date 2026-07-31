#!/usr/bin/env node
/** Sprint 26.1 — Brand components (gf-*) */
import { existsSync, readFileSync } from "node:fs";
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

console.log("\nBrand Components — Sprint 26.1\n");
assert(existsSync(join(root, "components/ui/gf-surface.tsx")), "gf-surface.tsx");
const gf = readFileSync(join(root, "components/ui/gf-surface.tsx"), "utf8");
assert(gf.includes("data-gf-surface"), "data-gf-surface");
assert(gf.includes("gf-surface-authorial"), "authorial level");
const css = readFileSync(join(root, "app/globals.css"), "utf8");
assert(css.includes(".gf-surface"), "css gf-surface");
assert(css.includes(".gf-surface-raised"), "css raised");
assert(css.includes(".gf-kpi"), "css gf-kpi");
assert(css.includes(".gf-cta"), "css gf-cta");
const brief = readFileSync(
  join(root, "components/dashboard/premium/executive-brief.tsx"),
  "utf8",
);
assert(brief.includes("gf-surface"), "brief uses gf-surface");
assert(brief.includes("gf-cta"), "brief uses gf-cta");
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
