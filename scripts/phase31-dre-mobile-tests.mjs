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

console.log("\nPhase 31.3 — DRE mobile\n");
const compose = readFileSync(join(root, "lib/mobile/finance-compose.ts"), "utf8");
const screen = join(root, "apps/mobile/app/(app)/financeiro/dre.tsx");
check("composeDreMobile", /composeDreMobile/.test(compose));
check("usa DreService", /DreService/.test(compose));
check("linhas resumidas", /receita_bruta|resultado_final|ebitda/.test(compose));
check("tela dre", existsSync(screen));
check(
  "API route",
  existsSync(join(root, "app/api/mobile/v1/tenants/[tenantId]/financeiro/dre/route.ts")),
);
check("não redefine fórmulas", !/resultado_final\s*=\s*receita/.test(compose));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
