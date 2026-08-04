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

console.log("\nPhase 31.3 — finance summary\n");
const compose = readFileSync(join(root, "lib/mobile/finance-compose.ts"), "utf8");
check("composeFinanceSummary exportado", /export async function composeFinanceSummary/.test(compose));
check("campos null quando indisponível", /saldoAtual:[\s\S]*\?[\s\S]*: null/.test(compose));
check("unavailable array", /unavailable/.test(compose));
check("alerts canônicos", /buildFinanceAlerts|pagar-vencido|caixa-negativo/.test(compose));
check(
  "rota summary",
  existsSync(join(root, "app/api/mobile/v1/tenants/[tenantId]/financeiro/summary/route.ts")),
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
