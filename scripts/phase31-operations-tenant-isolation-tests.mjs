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

console.log("\nPhase 31.6 — operations tenant isolation\n");

const auth = readFileSync(join(root, "lib/mobile/operations-route-auth.ts"), "utf8");
check("membership por tenantId", /getActiveMembership\(/.test(auth));
check("tenant load by id", /\.from\(\"tenants\"\)/.test(auth));
check("403 sem membership", /não pertence|mobileForbidden/.test(auth));

const compose = readFileSync(join(root, "lib/mobile/operations-compose.ts"), "utf8");
check("services com tenantId", /new OrdemServicoService\(client, input\.tenantId\)/.test(compose));
check("queries eq tenant_id", /eq\(\"tenant_id\", input\.tenantId\)/.test(compose));
check("sem confiar só no client branch", !/branchId.*trust|TRUST_BRANCH/.test(compose));

const dash = readFileSync(
  join(root, "app/api/mobile/v1/tenants/[tenantId]/operacao/dashboard/route.ts"),
  "utf8",
);
check("rota usa authorizeOpsRoute", /authorizeOpsRoute\(request, tenantId\)/.test(dash));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
