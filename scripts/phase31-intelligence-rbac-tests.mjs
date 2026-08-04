#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0;
let fail = 0;
function check(name, cond) {
  if (cond) {
    pass += 1;
    console.log("  PASS", name);
  } else {
    fail += 1;
    console.log("  FAIL", name);
  }
}

console.log("\nPhase 31.7 — intelligence RBAC\n");

const compose = readFileSync(join(root, "lib/mobile/intelligence-compose.ts"), "utf8");
const auth = readFileSync(join(root, "lib/mobile/intelligence-route-auth.ts"), "utf8");
const screen = readFileSync(join(root, "apps/mobile/app/(app)/inteligencia/index.tsx"), "utf8");

check("compose exige hasExecutiveDashboardAccess", /hasExecutiveDashboardAccess/.test(compose));
check("FORBIDDEN_EXECUTIVE", /FORBIDDEN_EXECUTIVE/.test(compose));
check("route auth membership", /getActiveMembership/.test(auth));
check("route auth Bearer", /authenticateMobileRequest/.test(auth));
check("route auth permissions", /resolveMobilePermissions/.test(auth));
check("screen gate EXEC_PERMS", /EXEC_PERMS|dashboard\.executivo/.test(screen));
check("analytics gated por hasAnalyticsViewAccess", /hasAnalyticsViewAccess/.test(compose));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
