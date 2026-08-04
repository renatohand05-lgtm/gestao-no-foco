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

console.log("\nPhase 31.4 — CRM offline\n");

const snap = readFileSync(join(root, "apps/mobile/src/crm/offline-snapshot.ts"), "utf8");
check("cache key crm-summary", /@gof\/cache\/crm-summary\//.test(snap));
check("saveCrmSnapshot", /saveCrmSnapshot/.test(snap));
check("loadCrmSnapshot", /loadCrmSnapshot/.test(snap));

const home = readFileSync(join(root, "apps/mobile/app/(app)/crm/index.tsx"), "utf8");
check("home usa snapshot", /loadCrmSnapshot|offlineSnap/.test(home));
check("somente leitura offline banner", /somente leitura|Offline/.test(home));

const pipeline = readFileSync(join(root, "apps/mobile/app/(app)/crm/pipeline.tsx"), "utf8");
check("pipeline bloqueia offline", /Offline|exige conexão/.test(pipeline));

const clients = readFileSync(join(root, "apps/mobile/app/(app)/crm/clients.tsx"), "utf8");
check("clients bloqueia offline", /Offline|exige conexão/.test(clients));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
