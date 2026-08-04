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

console.log("\nPhase 31.6 — operations offline\n");

const snap = readFileSync(join(root, "apps/mobile/src/operacao/offline-snapshot.ts"), "utf8");
check("cache key ops-summary", /@gof\/cache\/ops-summary\//.test(snap));
check("saveOpsSnapshot", /saveOpsSnapshot/.test(snap));
check("loadOpsSnapshot", /loadOpsSnapshot/.test(snap));

const home = readFileSync(join(root, "apps/mobile/app/(app)/operacao/index.tsx"), "utf8");
check("home usa snapshot", /loadOpsSnapshot|offlineSnap/.test(home));
check("somente leitura offline", /somente leitura|Offline|desatualiz/.test(home));
check("refresh só online", /online \?/.test(home));

const ordens = readFileSync(join(root, "apps/mobile/app/(app)/operacao/ordens.tsx"), "utf8");
check("ordens bloqueia offline", /Offline|exige conexão/.test(ordens));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
