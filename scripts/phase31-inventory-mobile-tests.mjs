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

console.log("\nPhase 31.5 — inventory mobile\n");

check("rota inventario", existsSync(join(root, "app/api/mobile/v1/tenants/[tenantId]/estoque/inventario/route.ts")));
check("rota movimentacoes", existsSync(join(root, "app/api/mobile/v1/tenants/[tenantId]/estoque/movimentacoes/route.ts")));
check("tela inventario", existsSync(join(root, "apps/mobile/app/(app)/estoque/inventario.tsx")));
check("tela movimentacoes", existsSync(join(root, "apps/mobile/app/(app)/estoque/movimentacoes.tsx")));

const compose = readFileSync(join(root, "lib/mobile/stock-compose.ts"), "utf8");
check("listInventoryCycles", /listInventoryCycles/.test(compose));
check("summarizeOpenInventoryDivergences", /summarizeOpenInventoryDivergences/.test(compose));
check("composeStockInventory", /composeStockInventory/.test(compose));
check("composeStockMovements", /composeStockMovements/.test(compose));

const api = readFileSync(join(root, "apps/mobile/src/api/mobile-api.ts"), "utf8");
check("fetchStockInventory", /fetchStockInventory/.test(api));
check("fetchStockMovements", /fetchStockMovements/.test(api));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
