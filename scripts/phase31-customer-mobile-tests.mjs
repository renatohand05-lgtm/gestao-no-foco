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

console.log("\nPhase 31.6 — customer mobile\n");

check("rota customers", existsSync(join(root, "app/api/mobile/v1/tenants/[tenantId]/operacao/customers/route.ts")));
check("rota customers/:id", existsSync(join(root, "app/api/mobile/v1/tenants/[tenantId]/operacao/customers/[id]/route.ts")));
check("tela clientes", existsSync(join(root, "apps/mobile/app/(app)/operacao/clientes.tsx")));
check("tela cliente detail", existsSync(join(root, "apps/mobile/app/(app)/operacao/clientes/[id].tsx")));

const compose = readFileSync(join(root, "lib/mobile/operations-compose.ts"), "utf8");
check("ClienteService", /ClienteService/.test(compose));
check("composeOpsCustomers", /composeOpsCustomers/.test(compose));
check("composeOpsCustomerDetail", /composeOpsCustomerDetail/.test(compose));

const api = readFileSync(join(root, "apps/mobile/src/api/mobile-api.ts"), "utf8");
check("fetchOpsCustomers", /fetchOpsCustomers/.test(api));
check("fetchOpsCustomerDetail", /fetchOpsCustomerDetail/.test(api));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
