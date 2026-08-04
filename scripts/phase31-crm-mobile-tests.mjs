#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
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

console.log("\nPhase 31.4 — CRM mobile\n");

const files = [
  "lib/mobile/crm-compose.ts",
  "lib/mobile/crm-route-auth.ts",
  "apps/mobile/src/crm/sections.tsx",
  "apps/mobile/src/crm/offline-snapshot.ts",
  "apps/mobile/app/(app)/crm/index.tsx",
  "apps/mobile/app/(app)/crm/_layout.tsx",
];
for (const f of files) {
  check(`arquivo ${f}`, existsSync(join(root, f)));
}

const compose = readFileSync(join(root, "lib/mobile/crm-compose.ts"), "utf8");
check("reusa buildRevenueForecast", /buildRevenueForecast/.test(compose));
check("reusa computeCommercialScore", /computeCommercialScore/.test(compose));
check("reusa CrmFunilService", /CrmFunilService/.test(compose));
check("FORBIDDEN_CRM", /FORBIDDEN_CRM/.test(compose));
check("sem service_role no compose", !/SERVICE_ROLE|service_role/.test(compose));

const layout = readFileSync(join(root, "apps/mobile/app/(app)/_layout.tsx"), "utf8");
check("tab CRM registrada", /name=\"crm\"/.test(layout));

const api = readFileSync(join(root, "apps/mobile/src/api/mobile-api.ts"), "utf8");
check("fetchCrmDashboard", /fetchCrmDashboard/.test(api));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
