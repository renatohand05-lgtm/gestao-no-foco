#!/usr/bin/env node
/** Sprint 26.1 — Product continuity landing → login → loader → dashboard */
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

console.log("\nProduct Continuity — Sprint 26.1\n");
const landing = readFileSync(join(root, "app/(marketing)/page.tsx"), "utf8");
assert(landing.includes('data-brand-continuity="landing"'), "landing continuity");
const login = readFileSync(join(root, "app/(auth)/login/page.tsx"), "utf8");
assert(login.includes('data-brand-continuity="login"'), "login continuity");
const loader = readFileSync(
  join(root, "components/brand/premium-global-loader.tsx"),
  "utf8",
);
assert(loader.includes('data-brand-continuity="loader"'), "loader continuity");
const dash = readFileSync(
  join(root, "components/dashboard/premium/premium-dashboard-view.tsx"),
  "utf8",
);
assert(dash.includes('data-brand-continuity="dashboard"'), "dashboard continuity");
const css = readFileSync(join(root, "app/globals.css"), "utf8");
assert(css.includes('[data-brand-continuity="landing"]'), "css continuity landing");
assert(css.includes("--continuity-gold"), "continuity gold token");
assert(css.includes("--continuity-navy"), "continuity navy token");
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
