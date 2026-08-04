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

console.log("\nPhase 31.4 — followup mobile\n");
check(
  "rota followups",
  existsSync(join(root, "app/api/mobile/v1/tenants/[tenantId]/crm/followups/route.ts")),
);
check("tela followups", existsSync(join(root, "apps/mobile/app/(app)/crm/followups.tsx")));
const compose = readFileSync(join(root, "lib/mobile/crm-compose.ts"), "utf8");
check("groupPremiumFollowUps", /groupPremiumFollowUps/.test(compose));
check("composeCrmFollowups", /composeCrmFollowups/.test(compose));
const screen = readFileSync(join(root, "apps/mobile/app/(app)/crm/followups.tsx"), "utf8");
check("buckets UI", /buckets/.test(screen));
check("mutações via web", /CRM Web|mutações/.test(screen));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
