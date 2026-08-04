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

console.log("\nPhase 31.3 — finance RBAC mobile\n");
const compose = readFileSync(join(root, "lib/mobile/finance-compose.ts"), "utf8");
const auth = readFileSync(join(root, "lib/mobile/finance-route-auth.ts"), "utf8");
const home = readFileSync(join(root, "apps/mobile/app/(app)/financeiro/index.tsx"), "utf8");
const sections = readFileSync(join(root, "apps/mobile/src/finance/sections.tsx"), "utf8");

check("canViewFinance", /canViewFinance/.test(compose));
check("FORBIDDEN_FINANCE", /FORBIDDEN_FINANCE/.test(compose));
check("route membership", /getActiveMembership/.test(auth));
check("route permissions", /resolveMobilePermissions/.test(auth));
check("home FINANCE_VIEW_PERMS", /FINANCE_VIEW_PERMS/.test(home));
check("perms canônicas", /financeiro\.visualizar/.test(sections));
check("sem permissão paralela inventada", !/financeiro\.mobile\./.test(compose + sections));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
