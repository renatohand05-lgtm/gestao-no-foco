#!/usr/bin/env node
/** Sprint 26.2 — Signature continuity */
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

console.log("\nSignature Continuity — Sprint 26.2\n");
const landing = readFileSync(join(root, "app/(marketing)/page.tsx"), "utf8");
assert(landing.includes('data-brand-continuity="landing"'), "landing");
const login = readFileSync(join(root, "app/(auth)/login/page.tsx"), "utf8");
assert(login.includes('data-brand-continuity="login"'), "login");
const loader = readFileSync(
  join(root, "components/brand/premium-global-loader.tsx"),
  "utf8",
);
assert(loader.includes('data-brand-continuity="loader"'), "loader");
const dash = readFileSync(
  join(root, "components/dashboard/premium/premium-dashboard-view.tsx"),
  "utf8",
);
assert(dash.includes('data-brand-continuity="dashboard"'), "dashboard");
assert(dash.includes('data-signature="26.2"'), "signature marker");
assert(dash.includes("GFExecutiveHeader"), "header autoral");
assert(
  dash.includes("data-gf-launcher") ||
    readFileSync(
      join(root, "components/dashboard/dashboard-quick-actions.tsx"),
      "utf8",
    ).includes("data-gf-launcher"),
  "launcher",
);
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
