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

console.log("\nPhase 31.7 — alert center\n");

const compose = readFileSync(join(root, "lib/mobile/intelligence-compose.ts"), "utf8");
const route = join(root, "app/api/mobile/v1/tenants/[tenantId]/inteligencia/alertas/route.ts");
const sections = readFileSync(join(root, "apps/mobile/src/inteligencia/sections.tsx"), "utf8");

check("rota alertas existe", existsSync(route));
check("composeAlertCenter presente", /composeAlertCenter/.test(compose));
check("buckets operacional/financeiro/crm/estoque/agenda/automacoes/sistema",
  /operacional:/.test(compose) &&
    /financeiro:/.test(compose) &&
    /crm:/.test(compose) &&
    /estoque:/.test(compose) &&
    /agenda:/.test(compose) &&
    /automacoes:/.test(compose) &&
    /sistema:/.test(compose));
check("reusa composeCrmAlerts", /composeCrmAlerts/.test(compose));
check("reusa composeStockAlerts", /composeStockAlerts/.test(compose));
check("reusa composeOpsNotifications", /composeOpsNotifications/.test(compose));
check("reusa composeFinanceSummary alerts", /composeFinanceSummary/.test(compose));
check("UI AlertCenterSection", /AlertCenterSection/.test(sections));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
