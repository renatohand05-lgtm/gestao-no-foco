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

console.log("\nPhase 31.6 — vehicle mobile\n");

check("rota vehicles", existsSync(join(root, "app/api/mobile/v1/tenants/[tenantId]/operacao/vehicles/route.ts")));
check("rota vehicles/:id", existsSync(join(root, "app/api/mobile/v1/tenants/[tenantId]/operacao/vehicles/[id]/route.ts")));
check("tela veiculos", existsSync(join(root, "apps/mobile/app/(app)/operacao/veiculos.tsx")));
check("tela veiculo detail", existsSync(join(root, "apps/mobile/app/(app)/operacao/veiculos/[id].tsx")));

const compose = readFileSync(join(root, "lib/mobile/operations-compose.ts"), "utf8");
check("VeiculoService", /VeiculoService/.test(compose));
check("histórico via list veiculo_id", /veiculo_id/.test(compose));
check("composeOpsVehicles", /composeOpsVehicles/.test(compose));
check("composeOpsVehicleDetail", /composeOpsVehicleDetail/.test(compose));

const api = readFileSync(join(root, "apps/mobile/src/api/mobile-api.ts"), "utf8");
check("fetchOpsVehicles", /fetchOpsVehicles/.test(api));
check("fetchOpsVehicleDetail", /fetchOpsVehicleDetail/.test(api));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
