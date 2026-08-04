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

console.log("\nPhase 31.9 — productivity tenant isolation\n");
const compose = readFileSync(join(root, "lib/mobile/search-compose.ts"), "utf8");
const route = readFileSync(
  join(root, "app/api/mobile/v1/tenants/[tenantId]/search/route.ts"),
  "utf8",
);
const storage = readFileSync(join(root, "apps/mobile/src/productivity/storage.ts"), "utf8");
const cache = readFileSync(join(root, "apps/mobile/src/productivity/search-cache.ts"), "utf8");

check("busca filtra tenant_id", /\.eq\("tenant_id", input\.tenantId\)/.test(compose));
check("membership obrigatória", /getActiveMembership/.test(route));
check("favoritos/recentes por tenant", /tenantId/.test(storage) && /@gof\/prod\//.test(storage));
check("cache busca por tenant", /@gof\/cache\/search-last/.test(cache));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
