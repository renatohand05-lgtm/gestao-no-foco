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

console.log("\nPhase 31.5 — products mobile\n");

check("rota produtos", existsSync(join(root, "app/api/mobile/v1/tenants/[tenantId]/estoque/produtos/route.ts")));
check("rota produtos/:id", existsSync(join(root, "app/api/mobile/v1/tenants/[tenantId]/estoque/produtos/[id]/route.ts")));
check("tela produtos", existsSync(join(root, "apps/mobile/app/(app)/estoque/produtos.tsx")));
check("tela produto detail", existsSync(join(root, "apps/mobile/app/(app)/estoque/produto/[id].tsx")));

const api = readFileSync(join(root, "apps/mobile/src/api/mobile-api.ts"), "utf8");
check("fetchStockProducts", /fetchStockProducts/.test(api));
check("fetchStockProductDetail", /fetchStockProductDetail/.test(api));

const compose = readFileSync(join(root, "lib/mobile/stock-compose.ts"), "utf8");
check("composeStockProducts", /composeStockProducts/.test(compose));
check("composeStockProductDetail", /composeStockProductDetail/.test(compose));
check("ProdutoService", /ProdutoService/.test(compose));

const produtos = readFileSync(join(root, "apps/mobile/app/(app)/estoque/produtos.tsx"), "utf8");
check("infinite scroll produtos", /useInfiniteQuery|fetchNextPage/.test(produtos));
check("offline gate produtos", /Offline|exige conexão/.test(produtos));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
