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

console.log("\nPhase 31.6 — operations RBAC\n");

const auth = readFileSync(join(root, "lib/mobile/operations-route-auth.ts"), "utf8");
check("authenticateMobileRequest", /authenticateMobileRequest/.test(auth));
check("getActiveMembership", /getActiveMembership/.test(auth));
check("resolveMobilePermissions", /resolveMobilePermissions/.test(auth));
check("FORBIDDEN mapping", /FORBIDDEN_OPS/.test(auth));

const compose = readFileSync(join(root, "lib/mobile/operations-compose.ts"), "utf8");
check("canViewOps", /canViewOps/.test(compose));
check("os.visualizar", /os\.visualizar/.test(compose));
check("agenda.visualizar", /agenda\.visualizar/.test(compose));
check("mecanicos.visualizar", /mecanicos\.visualizar/.test(compose));
check("clientes.visualizar", /clientes\.visualizar/.test(compose));
check("centro_operacoes", /centro_operacoes/.test(compose));

const sections = readFileSync(join(root, "apps/mobile/src/operacao/sections.tsx"), "utf8");
check("OPS_VIEW_PERMS", /OPS_VIEW_PERMS/.test(sections));

const perms = readFileSync(join(root, "lib/rbac/permissions.ts"), "utf8");
check("catalog os.visualizar", /os\.visualizar/.test(perms));
check("catalog agenda.visualizar", /agenda\.visualizar/.test(perms));
check("sem operacao.* namespace inventado", !/"operacao\./.test(perms));
check("sem ordens.* namespace inventado", !/"ordens\./.test(perms));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
