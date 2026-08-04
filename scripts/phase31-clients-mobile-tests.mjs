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

console.log("\nPhase 31.4 — clients mobile\n");
check(
  "rota clients",
  existsSync(join(root, "app/api/mobile/v1/tenants/[tenantId]/crm/clients/route.ts")),
);
check(
  "rota clients/:id",
  existsSync(join(root, "app/api/mobile/v1/tenants/[tenantId]/crm/clients/[id]/route.ts")),
);
check("tela clients", existsSync(join(root, "apps/mobile/app/(app)/crm/clients.tsx")));
check(
  "tela client detail",
  existsSync(join(root, "apps/mobile/app/(app)/crm/client/[id].tsx")),
);
const api = readFileSync(join(root, "apps/mobile/src/api/mobile-api.ts"), "utf8");
check("fetchCrmClients", /fetchCrmClients/.test(api));
check("fetchCrmClientDetail", /fetchCrmClientDetail/.test(api));
const compose = readFileSync(join(root, "lib/mobile/crm-compose.ts"), "utf8");
check("composeCrmClients", /composeCrmClients/.test(compose));
check("composeCrmClientDetail", /composeCrmClientDetail/.test(compose));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
