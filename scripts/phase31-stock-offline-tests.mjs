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

console.log("\nPhase 31.5 — stock offline\n");

const snap = readFileSync(join(root, "apps/mobile/src/stock/offline-snapshot.ts"), "utf8");
check("cache key stock-summary", /@gof\/cache\/stock-summary\//.test(snap));
check("saveStockSnapshot", /saveStockSnapshot/.test(snap));
check("loadStockSnapshot", /loadStockSnapshot/.test(snap));

const home = readFileSync(join(root, "apps/mobile/app/(app)/estoque/index.tsx"), "utf8");
check("home usa snapshot", /loadStockSnapshot|offlineSnap/.test(home));
check("somente leitura offline banner", /somente leitura|Offline/.test(home));
check("refresh só online", /online \? \(/.test(home) || /online \?/.test(home));

const produtos = readFileSync(join(root, "apps/mobile/app/(app)/estoque/produtos.tsx"), "utf8");
check("produtos bloqueia offline", /Offline|exige conexão/.test(produtos));

const compras = readFileSync(join(root, "apps/mobile/app/(app)/estoque/compras.tsx"), "utf8");
check("compras bloqueia offline", /Offline|exige conexão/.test(compras));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
