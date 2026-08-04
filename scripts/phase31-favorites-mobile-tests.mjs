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

console.log("\nPhase 31.9 — favorites\n");
const storage = readFileSync(join(root, "apps/mobile/src/productivity/storage.ts"), "utf8");
check("scope user/tenant/branch", /userId.*tenantId.*branch/.test(storage) || /@gof\/prod\/favorites/.test(storage));
check("MAX_FAVORITES", /MAX_FAVORITES/.test(storage));
check("toggleFavorite", /toggleFavorite/.test(storage));
check("clearFavorites", /clearFavorites/.test(storage));
check("sem campos monetários", !/\b(saldo|cpf|senha|credit_card)\b/i.test(storage));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
