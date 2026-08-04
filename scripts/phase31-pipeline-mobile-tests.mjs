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

console.log("\nPhase 31.4 — pipeline mobile\n");
const route = join(root, "app/api/mobile/v1/tenants/[tenantId]/crm/pipeline/route.ts");
const screen = join(root, "apps/mobile/app/(app)/crm/pipeline.tsx");
check("rota pipeline", existsSync(route));
check("tela pipeline", existsSync(screen));
if (existsSync(route)) {
  const src = readFileSync(route, "utf8");
  check("pipeline autentica", /authorizeCrmRoute/.test(src));
  check("pipeline composeCrmPipeline", /composeCrmPipeline/.test(src));
}
if (existsSync(screen)) {
  const src = readFileSync(screen, "utf8");
  check("pipeline staleTime 60s", /staleTime:\s*60_000/.test(src));
  check("pipeline offline gate", /Offline|exige conexão/.test(src));
  check("pipeline fetchCrmPipeline", /fetchCrmPipeline/.test(src));
}

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
