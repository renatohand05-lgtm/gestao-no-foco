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

console.log("\nPhase 31.7 — notification / alert center surface\n");

const sections = readFileSync(join(root, "apps/mobile/src/inteligencia/sections.tsx"), "utf8");
const screen = readFileSync(join(root, "apps/mobile/app/(app)/inteligencia/index.tsx"), "utf8");
const route = join(root, "app/api/mobile/v1/tenants/[tenantId]/inteligencia/alertas/route.ts");

check("rota alertas", existsSync(route));
check("Central de Alertas na UI", /Central de Alertas/.test(sections));
check("grupos nomeados na UI", /Operacionais/.test(sections) && /Financeiros/.test(sections) && /Automações/.test(sections));
check("screen monta AlertCenterSection", /AlertCenterSection/.test(screen));
check("não muta offline", /readOnly|offline|snapshot/i.test(screen));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
