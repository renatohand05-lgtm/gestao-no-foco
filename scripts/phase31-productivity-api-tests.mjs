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

console.log("\nPhase 31.9 — productivity API\n");
const route = readFileSync(
  join(root, "app/api/mobile/v1/tenants/[tenantId]/search/route.ts"),
  "utf8",
);
const compose = readFileSync(join(root, "lib/mobile/search-compose.ts"), "utf8");

check("GET search", /export async function GET/.test(route));
check("valida min q", /MOBILE_SEARCH_MIN_Q/.test(route));
check("valida limit", /MOBILE_SEARCH_MAX_LIMIT/.test(route));
check("permissions resolve", /resolveMobilePermissions/.test(route));
check("DTO route/title", /route:/.test(compose) && /title:/.test(compose));
check("nextCursor", /nextCursor/.test(compose));
check("sem SERVICE_ROLE no client path", !/SERVICE_ROLE_KEY/.test(compose));
check("admin só se disponível", /isAdminClientAvailable/.test(compose));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
