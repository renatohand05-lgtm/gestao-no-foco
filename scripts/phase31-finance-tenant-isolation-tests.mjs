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

console.log("\nPhase 31.3 — finance tenant isolation\n");
const auth = readFileSync(join(root, "lib/mobile/finance-route-auth.ts"), "utf8");
const compose = readFileSync(join(root, "lib/mobile/finance-compose.ts"), "utf8");
const offline = readFileSync(
  join(root, "apps/mobile/src/finance/offline-snapshot.ts"),
  "utf8",
);
const keys = readFileSync(join(root, "apps/mobile/src/query/keys.ts"), "utf8");

check("membership por tenantId", /getActiveMembership[\s\S]*tenantId/.test(auth));
check("services com tenantId", /new ContaPagarService\(client, input\.tenantId\)/.test(compose));
check("snapshot keyed by tenant", /KEY_PREFIX \+ tenantId/.test(offline));
check("query keys incluem tenant", /tenantId/.test(keys));
check("não confia só no header do app", !/trust.*tenant.*header/i.test(auth));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
