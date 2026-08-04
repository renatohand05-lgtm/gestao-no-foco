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

console.log("\nPhase 31.5 — stock API\n");

const routes = [
  "dashboard",
  "produtos",
  "produtos/[id]",
  "categorias",
  "movimentacoes",
  "inventario",
  "compras",
  "compras/[id]",
  "fornecedores",
  "alertas",
  "reposicao",
];

for (const r of routes) {
  check(
    `route ${r}`,
    existsSync(
      join(root, `app/api/mobile/v1/tenants/[tenantId]/estoque/${r}/route.ts`),
    ),
  );
}

const dash = readFileSync(
  join(root, "app/api/mobile/v1/tenants/[tenantId]/estoque/dashboard/route.ts"),
  "utf8",
);
check("authorizeStockRoute", /authorizeStockRoute/.test(dash));
check("composeStockDashboard", /composeStockDashboard/.test(dash));
check("force-dynamic", /force-dynamic/.test(dash));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
