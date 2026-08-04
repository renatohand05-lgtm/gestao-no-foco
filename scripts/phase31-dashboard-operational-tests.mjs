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

console.log("\nPhase 31.7 — dashboard operacional\n");

const compose = readFileSync(join(root, "lib/mobile/intelligence-compose.ts"), "utf8");
const route = join(root, "app/api/mobile/v1/tenants/[tenantId]/inteligencia/operacional/route.ts");
const sections = readFileSync(join(root, "apps/mobile/src/inteligencia/sections.tsx"), "utf8");

check("rota operacional existe", existsSync(route));
check("composeOperationalExecutive presente", /composeOperationalExecutive/.test(compose));
check("usa CentroOperacoesService", /CentroOperacoesService/.test(compose));
check("usa OsDashboardService", /OsDashboardService/.test(compose));
check("usa MecanicosDashboardService", /MecanicosDashboardService/.test(compose));
check("usa AgendaEventService", /AgendaEventService/.test(compose));
check("campos produção/ordens/agenda/ticket", /producaoDia/.test(compose) && /ordensAbertas/.test(compose) && /agendaDia/.test(compose) && /ticketMedio/.test(compose));
check("UI OperationalSection", /OperationalSection/.test(sections));
check("sem novas fórmulas inventadas", !/eficiencia\s*=\s*\d+\s*\//.test(compose));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
