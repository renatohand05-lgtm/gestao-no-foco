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

console.log("\nPhase 31.5 — purchases mobile\n");

check("rota compras", existsSync(join(root, "app/api/mobile/v1/tenants/[tenantId]/estoque/compras/route.ts")));
check("rota compras/:id", existsSync(join(root, "app/api/mobile/v1/tenants/[tenantId]/estoque/compras/[id]/route.ts")));
check("tela compras", existsSync(join(root, "apps/mobile/app/(app)/estoque/compras.tsx")));
check("tela compra detail", existsSync(join(root, "apps/mobile/app/(app)/estoque/compra/[id].tsx")));

const compose = readFileSync(join(root, "lib/mobile/stock-compose.ts"), "utf8");
check("listPurchaseOrders", /listPurchaseOrders/.test(compose));
check("composeStockPurchases", /composeStockPurchases/.test(compose));
check("composeStockPurchaseDetail", /composeStockPurchaseDetail/.test(compose));

const api = readFileSync(join(root, "apps/mobile/src/api/mobile-api.ts"), "utf8");
check("fetchStockPurchases", /fetchStockPurchases/.test(api));
check("fetchStockPurchaseDetail", /fetchStockPurchaseDetail/.test(api));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
