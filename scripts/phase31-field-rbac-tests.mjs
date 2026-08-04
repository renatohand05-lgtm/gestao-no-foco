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

console.log("\nPhase 31.8 — field RBAC\n");
const field = readFileSync(join(root, "lib/mobile/field-compose.ts"), "utf8");
const auth = readFileSync(join(root, "lib/mobile/operations-route-auth.ts"), "utf8");
check("view exige os.visualizar", /os\.visualizar/.test(field));
check("edit exige os.editar", /os\.editar/.test(field));
check("FORBIDDEN_OPS_EDIT", /FORBIDDEN_OPS_EDIT/.test(field) && /FORBIDDEN_OPS_EDIT/.test(auth));
check("authorizeOpsRoute membership", /getActiveMembership/.test(auth));
check("Bearer authenticateMobileRequest", /authenticateMobileRequest/.test(auth));
check("sem novas permission keys inventadas", !/os\.foto|os\.assinatura|os\.checklist\.criar/.test(field));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
