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

console.log("\nPhase 31.3 — accounts receivable mobile\n");
const compose = readFileSync(join(root, "lib/mobile/finance-compose.ts"), "utf8");
const screen = join(root, "apps/mobile/app/(app)/financeiro/contas-receber.tsx");
check("composeAccountsReceivable", /composeAccountsReceivable/.test(compose));
check("tela contas-receber", existsSync(screen));
check(
  "API route",
  existsSync(
    join(
      root,
      "app/api/mobile/v1/tenants/[tenantId]/financeiro/accounts-receivable/route.ts",
    ),
  ),
);
const ui = readFileSync(screen, "utf8");
check("sem WhatsApp/e-mail real", !/whatsapp|sendEmail|mailto:/i.test(ui));
check("sem baixa automática", !/baixar|marcarRecebido\(/.test(ui));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
