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

console.log("\nPhase 31.6 — operations mobile\n");

const files = [
  "lib/mobile/operations-compose.ts",
  "lib/mobile/operations-route-auth.ts",
  "apps/mobile/src/operacao/sections.tsx",
  "apps/mobile/src/operacao/offline-snapshot.ts",
  "apps/mobile/app/(app)/operacao/index.tsx",
  "apps/mobile/app/(app)/operacao/_layout.tsx",
];
for (const f of files) check(`arquivo ${f}`, existsSync(join(root, f)));

const compose = readFileSync(join(root, "lib/mobile/operations-compose.ts"), "utf8");
check("reusa OrdemServicoService", /OrdemServicoService/.test(compose));
check("reusa OsDashboardService", /OsDashboardService/.test(compose));
check("reusa CentroOperacoesService", /CentroOperacoesService/.test(compose));
check("reusa AgendaEventService", /AgendaEventService/.test(compose));
check("reusa AlertasOperacionaisService", /AlertasOperacionaisService/.test(compose));
check("FORBIDDEN_OPS", /FORBIDDEN_OPS/.test(compose));
check("sem service_role no compose", !/SERVICE_ROLE|service_role/.test(compose));

const layout = readFileSync(join(root, "apps/mobile/app/(app)/_layout.tsx"), "utf8");
check("tab Operação registrada", /name=\"operacao\"/.test(layout));

const api = readFileSync(join(root, "apps/mobile/src/api/mobile-api.ts"), "utf8");
check("fetchOpsDashboard", /fetchOpsDashboard/.test(api));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
