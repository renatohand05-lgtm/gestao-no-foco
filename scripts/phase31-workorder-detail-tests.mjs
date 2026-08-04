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

console.log("\nPhase 31.8 — workorder detail\n");
const compose = readFileSync(join(root, "lib/mobile/operations-compose.ts"), "utf8");
const detail = readFileSync(
  join(root, "apps/mobile/app/(app)/operacao/ordens/[id]/index.tsx"),
  "utf8",
);
check("composeOpsWorkOrderDetail expandido", /checklistSummary/.test(compose) && /signatures/.test(compose));
check("cabeçalho cliente/veículo/placa/mecânico", /cliente:/.test(compose) && /placa:/.test(compose) && /mecanico:/.test(compose));
check("serviços/peças/timeline/observações", /services/.test(compose) && /parts/.test(compose) && /timeline/.test(compose));
check("UI WorkOrderHeader", /WorkOrderHeader/.test(detail));
check("UI fields + serviços + peças", /data\.fields/.test(detail) && /Serviços/.test(detail));
check("rota detail existe", existsSync(join(root, "app/api/mobile/v1/tenants/[tenantId]/operacao/work-orders/[id]/route.ts")));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
