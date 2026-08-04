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

console.log("\nPhase 31.6 — workorders mobile\n");

check("rota work-orders", existsSync(join(root, "app/api/mobile/v1/tenants/[tenantId]/operacao/work-orders/route.ts")));
check("rota work-orders/:id", existsSync(join(root, "app/api/mobile/v1/tenants/[tenantId]/operacao/work-orders/[id]/route.ts")));
check("tela ordens", existsSync(join(root, "apps/mobile/app/(app)/operacao/ordens.tsx")));
check("tela ordens detail", existsSync(join(root, "apps/mobile/app/(app)/operacao/ordens/[id].tsx")));

const compose = readFileSync(join(root, "lib/mobile/operations-compose.ts"), "utf8");
check("composeOpsWorkOrders", /composeOpsWorkOrders/.test(compose));
check("composeOpsWorkOrderDetail", /composeOpsWorkOrderDetail/.test(compose));
check("InspecaoStorageService anexos", /InspecaoStorageService/.test(compose));
check("somente leitura detalhe", /webHref|Continuar|portal|ordens\//.test(compose));

const api = readFileSync(join(root, "apps/mobile/src/api/mobile-api.ts"), "utf8");
check("fetchOpsWorkOrders", /fetchOpsWorkOrders/.test(api));
check("fetchOpsWorkOrderDetail", /fetchOpsWorkOrderDetail/.test(api));

const detail = readFileSync(join(root, "apps/mobile/app/(app)/operacao/ordens/[id].tsx"), "utf8");
check("CTA portal na OS", /portal|webHref|Continuar/.test(detail));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
