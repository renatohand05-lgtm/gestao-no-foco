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

console.log("\nPhase 31.7 — offline snapshot\n");

const offline = join(root, "apps/mobile/src/inteligencia/offline-snapshot.ts");
const compose = readFileSync(join(root, "lib/mobile/intelligence-compose.ts"), "utf8");
const src = readFileSync(offline, "utf8");

check("offline-snapshot existe", existsSync(offline));
check("key @gof/cache/intelligence-pack", /@gof\/cache\/intelligence-pack\//.test(src));
check("save/load/clear", /saveIntelligenceSnapshot/.test(src) && /loadIntelligenceSnapshot/.test(src) && /clearIntelligenceSnapshot/.test(src));
check("module sync lê caches existentes", /dashboard-snapshot|finance-summary|crm-summary|stock-summary|ops-summary/.test(src));
check("sem tokens no snapshot", !/access_token|refresh_token|service_role/.test(src));
check("pack inclui moduleSync", /moduleSync/.test(compose));
check("somente leitura", /Snapshot RO|somente leitura|Sem tokens/i.test(src));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
