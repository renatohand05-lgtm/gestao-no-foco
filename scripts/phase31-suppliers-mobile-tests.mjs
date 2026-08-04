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

console.log("\nPhase 31.5 — suppliers mobile\n");

check("rota fornecedores", existsSync(join(root, "app/api/mobile/v1/tenants/[tenantId]/estoque/fornecedores/route.ts")));
check("tela fornecedores", existsSync(join(root, "apps/mobile/app/(app)/estoque/fornecedores.tsx")));

const compose = readFileSync(join(root, "lib/mobile/stock-compose.ts"), "utf8");
check("FornecedorService", /FornecedorService/.test(compose));
check("composeStockSuppliers", /composeStockSuppliers/.test(compose));

const api = readFileSync(join(root, "apps/mobile/src/api/mobile-api.ts"), "utf8");
check("fetchStockSuppliers", /fetchStockSuppliers/.test(api));

const tela = readFileSync(join(root, "apps/mobile/app/(app)/estoque/fornecedores.tsx"), "utf8");
check("offline gate fornecedores", /Offline|exige conexão/.test(tela));
check("busca fornecedores", /Buscar fornecedor|deferredQ|search/.test(tela));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
