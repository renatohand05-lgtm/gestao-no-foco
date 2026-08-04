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

console.log("\nPhase 31.8 — photo upload\n");
const compose = readFileSync(join(root, "lib/mobile/field-compose.ts"), "utf8");
const route = readFileSync(
  join(root, "app/api/mobile/v1/tenants/[tenantId]/operacao/work-orders/[id]/anexos/route.ts"),
  "utf8",
);
const pkg = readFileSync(join(root, "apps/mobile/package.json"), "utf8");
check("uploadFieldAnexo", /uploadFieldAnexo/.test(compose));
check("etapas existentes (entrada/execucao/conclusao)", /entrada|execucao|conclusao/.test(compose + route));
check("limite 5MB", /5 \* 1024 \* 1024|5MB/.test(route));
check("Bearer via authorizeOpsRoute", /authorizeOpsRoute/.test(route));
check("expo-image-picker no package", /expo-image-picker/.test(pkg));
check("rota anexos POST", /export async function POST/.test(route));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
