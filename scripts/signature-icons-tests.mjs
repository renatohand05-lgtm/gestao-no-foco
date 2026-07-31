#!/usr/bin/env node
/** Sprint 26.2 — Signature icons */
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

console.log("\nSignature Icons — Sprint 26.2\n");
assert(existsSync(join(root, "components/gf/gf-icon.tsx")), "gf-icon");
const ic = readFileSync(join(root, "components/gf/gf-icon.tsx"), "utf8");
assert(ic.includes("data-gf-icon"), "marker");
for (const v of [
  "primary",
  "neutral",
  "success",
  "warning",
  "danger",
  "intelligence",
]) {
  assert(ic.includes(`"${v}"`) || ic.includes(`${v}:`), `variant ${v}`);
}
assert(ic.includes("strokeWidth"), "stroke padronizado");
const launcher = readFileSync(
  join(root, "components/dashboard/dashboard-quick-actions.tsx"),
  "utf8",
);
assert(launcher.includes("GFIcon"), "launcher usa GFIcon");
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
