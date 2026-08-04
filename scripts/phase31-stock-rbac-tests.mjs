#!/usr/bin/env node
import { readFileSync } from "node:fs";
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

console.log("\nPhase 31.5 — stock RBAC\n");

const auth = readFileSync(join(root, "lib/mobile/stock-route-auth.ts"), "utf8");
check("authenticateMobileRequest", /authenticateMobileRequest/.test(auth));
check("getActiveMembership", /getActiveMembership/.test(auth));
check("resolveMobilePermissions", /resolveMobilePermissions/.test(auth));
check("FORBIDDEN mapping", /FORBIDDEN_STOCK/.test(auth));

const compose = readFileSync(join(root, "lib/mobile/stock-compose.ts"), "utf8");
check("canViewStock", /canViewStock/.test(compose));
check("estoque.visualizar", /estoque\.visualizar/.test(compose));
check("produtos.visualizar", /produtos\.visualizar/.test(compose));
check("compras.visualizar", /compras\.visualizar/.test(compose));
check("fornecedores.visualizar", /fornecedores\.visualizar/.test(compose));
check("estoque.inventariar gate QA", /estoque\.inventariar/.test(compose));
check("estoque.movimentar gate QA", /estoque\.movimentar/.test(compose));
check("estoque.ver_custo", /estoque\.ver_custo/.test(compose));

const sections = readFileSync(join(root, "apps/mobile/src/stock/sections.tsx"), "utf8");
check("STOCK_VIEW_PERMS", /STOCK_VIEW_PERMS/.test(sections));

const perms = readFileSync(join(root, "lib/rbac/permissions.ts"), "utf8");
check("catalog estoque.visualizar", /estoque\.visualizar/.test(perms));
check("catalog compras.visualizar", /compras\.visualizar/.test(perms));
check("catalog fornecedores.visualizar", /fornecedores\.visualizar/.test(perms));
check("sem inventario.* namespace", !/"inventario\./.test(perms));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
