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

console.log("\nPhase 31.8 — checklist mobile\n");
const compose = readFileSync(join(root, "lib/mobile/field-compose.ts"), "utf8");
check("listFieldChecklist", /listFieldChecklist/.test(compose));
check("updateFieldChecklistItem", /updateFieldChecklistItem/.test(compose));
check("updateChecklistItem service", /updateChecklistItem/.test(compose));
check("registradoEm/responsavel", /registradoEm/.test(compose) && /responsavelId/.test(compose));
check("rota GET checklist", existsSync(join(root, "app/api/mobile/v1/tenants/[tenantId]/operacao/work-orders/[id]/checklist/route.ts")));
check("rota PATCH checklist item", existsSync(join(root, "app/api/mobile/v1/tenants/[tenantId]/operacao/work-orders/[id]/checklist/[checklistId]/route.ts")));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
