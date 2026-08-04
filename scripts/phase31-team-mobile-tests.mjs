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

console.log("\nPhase 31.6 — team mobile\n");

check("rota team", existsSync(join(root, "app/api/mobile/v1/tenants/[tenantId]/operacao/team/route.ts")));
check("tela equipe", existsSync(join(root, "apps/mobile/app/(app)/operacao/equipe.tsx")));

const compose = readFileSync(join(root, "lib/mobile/operations-compose.ts"), "utf8");
check("MecanicoService", /MecanicoService/.test(compose));
check("MecanicosDashboardService", /MecanicosDashboardService/.test(compose));
check("composeOpsTeam", /composeOpsTeam/.test(compose));
check("sem lib/equipe HR", !/from \"@\/lib\/equipe/.test(compose));

const api = readFileSync(join(root, "apps/mobile/src/api/mobile-api.ts"), "utf8");
check("fetchOpsTeam", /fetchOpsTeam/.test(api));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
