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

console.log("\nPhase 31.7 — kpi health mobile\n");

const compose = readFileSync(join(root, "lib/mobile/intelligence-compose.ts"), "utf8");
const route = join(root, "app/api/mobile/v1/tenants/[tenantId]/inteligencia/kpi-health/route.ts");
const sections = readFileSync(join(root, "apps/mobile/src/inteligencia/sections.tsx"), "utf8");

check("rota kpi-health existe", existsSync(route));
check("mapeia kpiHealth do Decision Center", /kpiHealth/.test(compose) && /levelLabel/.test(compose));
check("labels Excelente/Bom/Atenção/Crítico", /Excelente/.test(compose) && /Bom/.test(compose) && /Atenção/.test(compose) && /Crítico/.test(compose));
check("UI KpiHealthSection", /KpiHealthSection/.test(sections));
check("níveis excelente|bom|atencao|critico", /excelente/.test(compose) && /atencao/.test(compose) && /critico/.test(compose));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
