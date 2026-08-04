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

console.log("\nPhase 31.5 — stock mobile\n");

const files = [
  "lib/mobile/stock-compose.ts",
  "lib/mobile/stock-route-auth.ts",
  "apps/mobile/src/stock/sections.tsx",
  "apps/mobile/src/stock/offline-snapshot.ts",
  "apps/mobile/app/(app)/estoque/index.tsx",
  "apps/mobile/app/(app)/estoque/_layout.tsx",
];
for (const f of files) {
  check(`arquivo ${f}`, existsSync(join(root, f)));
}

const compose = readFileSync(join(root, "lib/mobile/stock-compose.ts"), "utf8");
check("reusa EstoqueDashboardService", /EstoqueDashboardService/.test(compose));
check("reusa EstoqueService", /EstoqueService/.test(compose));
check("reusa ProdutoService", /ProdutoService/.test(compose));
check("reusa suggestReposicao", /suggestReposicao/.test(compose));
check("reusa listPurchaseOrders", /listPurchaseOrders/.test(compose));
check("FORBIDDEN_STOCK", /FORBIDDEN_STOCK/.test(compose));
check("sem service_role no compose", !/SERVICE_ROLE|service_role/.test(compose));

const layout = readFileSync(join(root, "apps/mobile/app/(app)/_layout.tsx"), "utf8");
check("tab Estoque registrada", /name=\"estoque\"/.test(layout));

const api = readFileSync(join(root, "apps/mobile/src/api/mobile-api.ts"), "utf8");
check("fetchStockDashboard", /fetchStockDashboard/.test(api));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
