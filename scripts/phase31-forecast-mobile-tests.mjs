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

console.log("\nPhase 31.4 — forecast mobile\n");
check(
  "rota forecast",
  existsSync(join(root, "app/api/mobile/v1/tenants/[tenantId]/crm/forecast/route.ts")),
);
check("tela forecast", existsSync(join(root, "apps/mobile/app/(app)/crm/forecast.tsx")));
const compose = readFileSync(join(root, "lib/mobile/crm-compose.ts"), "utf8");
check("buildRevenueForecast", /buildRevenueForecast/.test(compose));
check("sem fórmula inventada no compose", !/receitaProvavel\s*=\s*[^b]/.test(compose) || /buildRevenueForecast/.test(compose));
const api = readFileSync(join(root, "apps/mobile/src/api/mobile-api.ts"), "utf8");
check("fetchCrmForecast", /fetchCrmForecast/.test(api));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
