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

console.log("\nPhase 31.4 — CRM RBAC\n");

const auth = readFileSync(join(root, "lib/mobile/crm-route-auth.ts"), "utf8");
check("authenticateMobileRequest", /authenticateMobileRequest/.test(auth));
check("getActiveMembership", /getActiveMembership/.test(auth));
check("resolveMobilePermissions", /resolveMobilePermissions/.test(auth));
check("FORBIDDEN mapping", /FORBIDDEN_CRM/.test(auth));

const compose = readFileSync(join(root, "lib/mobile/crm-compose.ts"), "utf8");
check("canViewCrm / hasCrmViewAccess", /hasCrmViewAccess|canViewCrm/.test(compose));
check("assertCrmView", /FORBIDDEN_CRM/.test(compose));
check("crm.visualizar gate", /crm\.visualizar|hasCrmViewAccess/.test(compose));

const sections = readFileSync(join(root, "apps/mobile/src/crm/sections.tsx"), "utf8");
check("CRM_VIEW_PERMS", /CRM_VIEW_PERMS/.test(sections));
check("clientes.visualizar no gate mobile", /clientes\.visualizar/.test(sections));

const perms = readFileSync(join(root, "lib/rbac/permissions.ts"), "utf8");
check("catalog crm.visualizar", /crm\.visualizar/.test(perms));
check("catalog crm.pipeline.visualizar", /crm\.pipeline\.visualizar/.test(perms));
check("catalog clientes.visualizar", /clientes\.visualizar/.test(perms));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
