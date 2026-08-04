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

console.log("\nPhase 31.7 — goals mobile\n");

const compose = readFileSync(join(root, "lib/mobile/intelligence-compose.ts"), "utf8");
const route = join(root, "app/api/mobile/v1/tenants/[tenantId]/inteligencia/metas/route.ts");
const sections = readFileSync(join(root, "apps/mobile/src/inteligencia/sections.tsx"), "utf8");

check("rota metas existe", existsSync(route));
check("metas day/week/month + tendência", /dayTrend/.test(compose) && /weekTrend/.test(compose) && /monthTrend/.test(compose));
check("reusa metas do dashboard compose", /dashboard\.metas/.test(compose));
check("UI IntelligenceMetasSection", /IntelligenceMetasSection/.test(sections));
check("sem alterar cálculo de meta", !/meta\s*\*\s*|meta\s*\+\s*\d/.test(compose));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
