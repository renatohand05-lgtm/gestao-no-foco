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

console.log("\nPhase 31.9 — productivity mobile\n");
const files = [
  "apps/mobile/src/productivity/commands.ts",
  "apps/mobile/src/productivity/storage.ts",
  "apps/mobile/src/productivity/deep-links.ts",
  "apps/mobile/src/productivity/scanner.ts",
  "apps/mobile/app/(app)/busca.tsx",
  "apps/mobile/app/(app)/comandos.tsx",
  "apps/mobile/app/(app)/scanner.tsx",
  "lib/mobile/search-compose.ts",
  "app/api/mobile/v1/tenants/[tenantId]/search/route.ts",
];
for (const f of files) {
  check(f, existsSync(join(root, f)));
}
const home = readFileSync(join(root, "apps/mobile/app/(app)/index.tsx"), "utf8");
check("home tem ProductivityStrip", /ProductivityStrip/.test(home));
const layout = readFileSync(join(root, "apps/mobile/app/(app)/_layout.tsx"), "utf8");
check("rotas busca/comandos/scanner ocultas da tab", /name="busca"/.test(layout) && /href: null/.test(layout));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
