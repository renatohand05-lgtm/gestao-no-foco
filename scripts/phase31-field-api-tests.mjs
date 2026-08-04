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

console.log("\nPhase 31.8 — field API\n");
const routes = [
  "work-orders/[id]/route.ts",
  "work-orders/[id]/checklist/route.ts",
  "work-orders/[id]/checklist/[checklistId]/route.ts",
  "work-orders/[id]/anexos/route.ts",
  "work-orders/[id]/anexos/[anexoId]/route.ts",
  "work-orders/[id]/assinatura/route.ts",
];
for (const rel of routes) {
  const path = join(root, "app/api/mobile/v1/tenants/[tenantId]/operacao", rel);
  check(`rota ${rel}`, existsSync(path));
  if (existsSync(path)) {
    const src = readFileSync(path, "utf8");
    check(`${rel} auth`, /authorizeOpsRoute/.test(src));
  }
}
const client = readFileSync(join(root, "apps/mobile/src/api/mobile-api.ts"), "utf8");
check("client uploadOpsAnexo", /uploadOpsAnexo/.test(client));
check("client uploadOpsSignature", /uploadOpsSignature/.test(client));
check("client patchOpsChecklistItem", /patchOpsChecklistItem/.test(client));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
