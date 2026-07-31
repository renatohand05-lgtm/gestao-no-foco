#!/usr/bin/env node
/** Sprint 26.2 — Signature header */
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

console.log("\nSignature Header — Sprint 26.2\n");
assert(
  existsSync(join(root, "components/gf/gf-executive-header.tsx")),
  "gf-executive-header",
);
const h = readFileSync(
  join(root, "components/gf/gf-executive-header.tsx"),
  "utf8",
);
assert(h.includes("data-gf-executive-header"), "marker");
assert(h.includes("companyStatusLabel"), "company status");
assert(h.includes("Meta do dia"), "meta do dia");
assert(h.includes("Exportar") || h.includes("Foco"), "ações");
const view = readFileSync(
  join(root, "components/dashboard/premium/premium-dashboard-view.tsx"),
  "utf8",
);
assert(view.includes("GFExecutiveHeader"), "wired");
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
