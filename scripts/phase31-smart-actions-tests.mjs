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

console.log("\nPhase 31.7 — smart actions\n");

const compose = readFileSync(join(root, "lib/mobile/intelligence-compose.ts"), "utf8");
const dash = readFileSync(join(root, "lib/mobile/dashboard-compose.ts"), "utf8");
const sections = readFileSync(join(root, "apps/mobile/src/inteligencia/sections.tsx"), "utf8");

const labels = [
  "Nova OS",
  "Novo Cliente",
  "Novo Veículo",
  "Financeiro",
  "CRM",
  "Agenda",
  "Estoque",
  "Analytics",
  "Equipe",
  "Automações",
  "Integrações",
];
for (const label of labels) {
  check(`ação ${label}`, compose.includes(`label: "${label}"`) || dash.includes(`label: "${label}"`));
}
check("somente navegação (href)", /href:/.test(compose) && /buildSmartQuickActions/.test(compose));
check("UI SmartActionsSection", /SmartActionsSection/.test(sections));
check("ações gated por permission", /permission:/.test(compose) && /enabled:/.test(compose));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
