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

console.log("\nPhase 31.7 — intelligence API contracts\n");

const routes = [
  "inteligencia/route.ts",
  "inteligencia/operacional/route.ts",
  "inteligencia/alertas/route.ts",
  "inteligencia/decision/route.ts",
  "inteligencia/kpi-health/route.ts",
  "inteligencia/metas/route.ts",
  "inteligencia/brief/route.ts",
];

for (const rel of routes) {
  const path = join(root, "app/api/mobile/v1/tenants/[tenantId]", rel);
  check(`rota ${rel}`, existsSync(path));
  if (existsSync(path)) {
    const src = readFileSync(path, "utf8");
    check(`${rel} authorizeIntelligenceRoute`, /authorizeIntelligenceRoute/.test(src));
    check(`${rel} mobileJson`, /mobileJson/.test(src));
  }
}

const client = readFileSync(join(root, "apps/mobile/src/api/mobile-api.ts"), "utf8");
check("client fetchIntelligencePack", /fetchIntelligencePack/.test(client));
check("client path /inteligencia", /\/inteligencia/.test(client));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
